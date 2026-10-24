<template>
  <div class="modal" @keydown.esc="$emit('close')">
    <div class="modal__backdrop" @click="$emit('close')" />
    <form class="modal__card" role="dialog" aria-modal="true" aria-labelledby="table-form-title" novalidate @submit.prevent="save">
      <header class="modal__head">
        <div>
          <h2 id="table-form-title" class="modal__title">{{ form.id ? `Edit ${table.name}` : 'Add table' }}</h2>
          <p class="modal__subtitle">Staff pick tables by this name on the register and the floor plan.</p>
        </div>
        <button type="button" class="modal__close" aria-label="Close" @click="$emit('close')"><AppIcon name="x" /></button>
      </header>
      <div class="modal__body">
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <div class="form-grid">
          <div>
            <label class="form-label" for="t-name">Name</label>
            <input id="t-name" v-model.trim="form.name" class="text-field" required maxlength="40" autocomplete="off" placeholder="e.g. Table 12">
          </div>
          <div>
            <label class="form-label" for="t-zone">Zone</label>
            <select id="t-zone" v-model="form.zone_id" class="field">
              <option :value="null">No zone</option>
              <option v-for="z in zones" :key="z.id" :value="z.id">{{ z.name }}</option>
            </select>
          </div>
          <div>
            <label class="form-label" for="t-seats">Seats</label>
            <input id="t-seats" v-model.number="form.capacity" class="text-field" type="number" min="1" max="50" step="1" required>
          </div>
        </div>
        <fieldset class="floor-shapes">
          <legend class="form-label">Shape</legend>
          <div class="floor-shapes__grid">
            <label v-for="s in SHAPES" :key="s.key" class="floor-shapes__option" :class="{ 'is-active': form.shape === s.key }">
              <input v-model="form.shape" type="radio" name="t-shape" :value="s.key" class="visually-hidden">
              <!-- Top-down view: the table plus its chairs. -->
              <svg class="floor-shapes__preview" viewBox="0 0 64 44" aria-hidden="true">
                <rect v-for="(c, i) in CHAIRS[s.key]" :key="i" class="floor-shapes__chair" :x="c[0]" :y="c[1]" :width="c[2]" :height="c[3]" rx="1.5" />
                <circle v-if="s.key === 'round'" class="floor-shapes__top" cx="32" cy="22" r="12" />
                <rect v-else-if="s.key === 'rect'" class="floor-shapes__top" x="12" y="13" width="40" height="18" rx="3" />
                <rect v-else class="floor-shapes__top" x="21" y="11" width="22" height="22" rx="3" />
              </svg>
              <span class="floor-shapes__label">{{ s.label }}</span>
              <span class="floor-shapes__hint">{{ s.hint }}</span>
              <AppIcon v-if="form.shape === s.key" name="check" class="floor-shapes__check" />
            </label>
          </div>
        </fieldset>
      </div>
      <footer class="modal__foot">
        <button type="button" class="btn-soft" @click="$emit('close')">Cancel</button>
        <button type="submit" class="btn-cta modal__primary" :disabled="saving">
          {{ saving ? 'Saving…' : form.id ? 'Save changes' : 'Add table' }}
        </button>
      </footer>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import { api, errorMessage } from '../lib/api'
import { SHAPES } from '../lib/tables'

// Chair rects [x, y, w, h] around each table preview.
const CHAIRS = {
  square: [[27, 4, 10, 4], [27, 36, 10, 4], [14, 17, 4, 10], [46, 17, 4, 10]],
  round: [[27, 4, 10, 4], [27, 36, 10, 4], [14, 17, 4, 10], [46, 17, 4, 10]],
  rect: [[17, 6, 10, 4], [37, 6, 10, 4], [17, 34, 10, 4], [37, 34, 10, 4], [5, 17, 4, 10], [55, 17, 4, 10]],
}

// table: the table to edit, or null to add one in `zoneId`.
const props = defineProps({
  table: { type: Object, default: null },
  zones: { type: Array, required: true },
  zoneId: { type: Number, default: null },
})
const emit = defineEmits(['close', 'saved'])

const t = props.table
const form = reactive(t
  ? { id: t.id, name: t.name, zone_id: t.zone_id, capacity: t.capacity, shape: t.shape || 'square' }
  : { id: null, name: '', zone_id: props.zoneId ?? props.zones[0]?.id ?? null, capacity: 4, shape: 'square' })
const error = ref(''), saving = ref(false)

async function save() {
  if (!form.name) { error.value = 'Give the table a name.'; return }
  if (!(form.capacity >= 1)) { error.value = 'Enter how many people it seats.'; return }
  const payload = { name: form.name, zone_id: form.zone_id, capacity: form.capacity, shape: form.shape }
  saving.value = true; error.value = ''
  try {
    const saved = form.id ? await api.updateTable(form.id, payload) : await api.createTable(payload)
    emit('saved', saved)
  } catch (e) {
    const msg = errorMessage(e)
    if (msg) error.value = msg
  } finally { saving.value = false }
}
</script>
