<template>
  <Transition name="fade">
    <div v-if="visible" class="undo-toast" role="status" aria-live="polite">
      <AppIcon :name="undoable.error ? 'ban' : 'check'" class="undo-toast__icon" :class="{ 'is-error': undoable.error }" />
      <span class="undo-toast__text">{{ undoable.error || entry?.label }}</span>
      <button v-if="entry && !undoable.error" type="button" class="undo-toast__btn" :disabled="busy" title="Undo (Ctrl+Z)" @click="undo">
        {{ busy ? 'Undoing…' : 'Undo' }}
      </button>
      <button type="button" class="undo-toast__close" aria-label="Dismiss" @click="dismiss"><AppIcon name="x" /></button>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { latest, undoable, undoLatest } from '../lib/undo'

// Shows the newest undoable action for a while; Ctrl/Cmd+Z undoes it even after the toast hides.
const emit = defineEmits(['undone'])
const SHOW_MS = 20000
const busy = ref(false), hiddenId = ref(null), errorShown = ref(false)
const entry = computed(() => undoable.items.at(-1) ?? null)
const visible = computed(() => (entry.value && entry.value.id !== hiddenId.value) || (undoable.error && errorShown.value))

let timer
const arm = () => { clearTimeout(timer); timer = setTimeout(dismiss, SHOW_MS) }
const dismiss = () => { hiddenId.value = entry.value?.id ?? null; undoable.error = ''; errorShown.value = false }
watch(() => entry.value?.id, (id) => { if (id) { hiddenId.value = null; arm() } })
watch(() => undoable.error, (e) => { if (e) { errorShown.value = true; arm() } })

async function undo() {
  if (busy.value || !latest()) return
  busy.value = true
  try { await undoLatest() } finally { busy.value = false; emit('undone') } // refresh even after a partial undo
}

const onKey = (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return
  if (e.target.closest?.('input, textarea, select, [contenteditable]')) return // native text undo
  if (!latest()) return
  e.preventDefault(); undo()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => { window.removeEventListener('keydown', onKey); clearTimeout(timer) })
</script>
