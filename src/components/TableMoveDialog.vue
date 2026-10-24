<template>
  <div class="modal" @keydown.esc="$emit('close')">
    <div class="modal__backdrop" @click="$emit('close')" />
    <form class="modal__card" role="dialog" aria-modal="true" aria-labelledby="move-title" novalidate @submit.prevent="save">
      <header class="modal__head">
        <div>
          <h2 id="move-title" class="modal__title">{{ merge ? `Join tables to ${table.name}` : `Change table for ${table.name}` }}</h2>
          <p class="modal__subtitle">
            {{ merge
              ? 'Pick the tables this party is spreading onto. Their orders move here and become one bill.'
              : 'Pick a free table. The party\'s orders, bill and timer go with them, and this table is freed.' }}
          </p>
        </div>
        <button type="button" class="modal__close" aria-label="Close" @click="$emit('close')"><AppIcon name="x" /></button>
      </header>
      <div class="modal__body">
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <template v-if="groups.length">
          <section v-for="g in groups" :key="g.zone" class="floor-pick">
            <h3 class="floor-pick__zone">{{ g.zone }}</h3>
            <div class="floor-pick__list" :role="merge ? 'group' : 'radiogroup'" :aria-label="g.zone">
              <button v-for="t in g.tables" :key="t.id" type="button" class="floor-pick__table" :class="`floor-pick__table--${t.status}`"
                :role="merge ? 'checkbox' : 'radio'" :aria-checked="picked.includes(t.id)" @click="toggle(t)">
                <strong>{{ t.name }}</strong>
                <span>{{ t.capacity }} seats · {{ t.status === 'occupied' ? 'has guests' : statusLabel(t.status) }}</span>
                <AppIcon v-if="picked.includes(t.id)" name="check" class="floor-pick__check" />
              </button>
            </div>
          </section>
          <p v-if="merge && pickedBusy.length" class="floor-pick__note">
            <AppIcon name="note" />{{ pickedBusy.map((t) => t.name).join(', ') }} already {{ pickedBusy.length === 1 ? 'has' : 'have' }} guests: their bills will be combined with {{ table.name }}'s.
          </p>
        </template>
        <div v-else class="empty">
          <span class="empty__icon"><AppIcon name="grid" /></span>
          <strong>No {{ merge ? 'tables to join' : 'free tables' }}</strong>
          <p>{{ merge ? 'Every other table is already joined, being cleaned or out of service.' : 'Free up a table first, or join this party onto one instead.' }}</p>
        </div>
      </div>
      <footer class="modal__foot">
        <button type="button" class="btn-soft" @click="$emit('close')">Cancel</button>
        <button type="submit" class="btn-cta modal__primary" :disabled="saving || !picked.length">
          {{ saving ? 'Saving…' : merge ? (picked.length > 1 ? `Join ${picked.length} tables` : 'Join table') : 'Change table' }}
        </button>
      </footer>
    </form>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import { api, errorMessage } from '../lib/api'
import { statusLabel } from '../lib/tables'

// mode 'transfer' moves the party to one free table; 'merge' joins other tables onto this one.
const props = defineProps({
  table: { type: Object, required: true },
  tables: { type: Array, required: true },
  mode: { type: String, default: 'transfer' },
})
const emit = defineEmits(['close', 'done'])
const merge = computed(() => props.mode === 'merge')

const candidates = computed(() => props.tables.filter((t) => t.id !== props.table.id && !t.merged_into_id && (merge.value
  ? ['available', 'reserved', 'occupied'].includes(t.status)
  : ['available', 'reserved'].includes(t.status))))
const groups = computed(() => Object.entries(candidates.value.reduce((z, t) => ((z[t.zone || 'No zone'] ??= []).push(t), z), {}))
  .map(([zone, tables]) => ({ zone, tables })))

const picked = ref([])
const pickedBusy = computed(() => props.tables.filter((t) => picked.value.includes(t.id) && t.status === 'occupied'))
const toggle = (t) => {
  if (!merge.value) { picked.value = [t.id]; return }
  picked.value = picked.value.includes(t.id) ? picked.value.filter((id) => id !== t.id) : [...picked.value, t.id]
}

const error = ref(''), saving = ref(false)
async function save() {
  if (!picked.value.length) return
  saving.value = true; error.value = ''
  try {
    const result = merge.value
      ? await api.mergeTables(props.table.id, picked.value)
      : await api.transferTable(props.table.id, picked.value[0])
    emit('done', result)
  } catch (e) {
    const msg = errorMessage(e)
    if (msg) error.value = msg
  } finally { saving.value = false }
}
</script>
