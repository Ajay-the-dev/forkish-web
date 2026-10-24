<template>
  <div ref="root" class="page menu-admin menu-admin--split menu-admin--resizable" :style="{ '--list-w': `${listW}px` }">
    <div class="menu-admin__main">
      <div class="menu-admin__toolbar">
        <label class="search menu-admin__search">
          <AppIcon name="search" />
          <input v-model.trim="q" type="search" placeholder="Search zones…" aria-label="Search zones" />
        </label>
        <button v-if="auth.can('tables.create')" class="btn-soft btn-soft--brand" @click="edit(null)"><AppIcon name="plus" />Add zone</button>
      </div>

      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <p v-if="auth.can('tables.create') && shown.length > 1" class="menu-admin__hint">
        {{ q ? 'Clear the search to reorder.' : 'Drag rows to set the order of zones on the floor plan and Tables page.' }}
      </p>

      <div v-if="shown.length" class="menu-admin__scroll">
        <table class="menu-admin__table">
          <thead>
            <tr>
              <th v-if="canReorder" scope="col"><span class="visually-hidden">Reorder</span></th>
              <th scope="col">Zone</th>
              <th scope="col" class="menu-admin__col-wide">Tables</th>
              <th scope="col" class="num">Seats</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="z in shown" :key="z.id" :data-id="z.id" :class="{ 'is-dragging': dragId === z.id, 'is-selected': selected?.id === z.id }">
              <td v-if="canReorder" class="menu-admin__grip-cell">
                <button type="button" class="menu-admin__grip" :aria-label="`Move ${z.name} (use arrow keys)`" title="Drag to reorder"
                  :disabled="reordering" @pointerdown="dragStart($event, z)" @keydown.up.prevent="nudge(z, -1)" @keydown.down.prevent="nudge(z, 1)">
                  <AppIcon name="grip" />
                </button>
              </td>
              <th scope="row">
                {{ z.name }}
                <small class="menu-admin__row-count">{{ tablesIn(z.id).length }} {{ tablesIn(z.id).length === 1 ? 'table' : 'tables' }}</small>
              </th>
              <td class="menu-admin__col-wide">
                <button type="button" class="menu-admin__view" :aria-pressed="selected?.id === z.id" :aria-label="`Show tables in ${z.name}`"
                  @click="selectedId = z.id">
                  {{ tablesIn(z.id).length }} {{ tablesIn(z.id).length === 1 ? 'table' : 'tables' }}<AppIcon name="chevron-right" />
                </button>
              </td>
              <td class="num">{{ seatsIn(z.id) }}</td>
              <td class="menu-admin__actions">
                <button v-if="auth.can('tables.create')" class="icon-btn" :aria-label="`Edit ${z.name}`" title="Edit" @click="edit(z)"><AppIcon name="edit" /></button>
                <button v-if="auth.can('tables.cancel')" class="icon-btn icon-btn--danger" :aria-label="`Delete ${z.name}`"
                  :title="tablesIn(z.id).length ? 'Move or remove its tables first' : 'Delete'" :disabled="busy === z.id || tablesIn(z.id).length > 0"
                  @click="remove(z)"><AppIcon name="trash" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="loaded" class="empty">
        <span class="empty__icon"><AppIcon name="layers" /></span>
        <strong>{{ q ? `No zones match “${q}”` : 'No zones yet' }}</strong>
        <p v-if="!q">Add areas like Indoor, Terrace or Bar to group your tables.</p>
      </div>
    </div>

    <div v-if="selected" class="menu-admin__divider menu-admin__col-wide" role="separator" aria-orientation="vertical" tabindex="0"
      aria-label="Resize zone list" :aria-valuenow="listW" :aria-valuemin="minList" :aria-valuemax="maxList()"
      :class="{ 'is-resizing': resizing }" @pointerdown="resizeStart" @keydown.left.prevent="setListW(listW - 24)"
      @keydown.right.prevent="setListW(listW + 24)" @dblclick="setListW(defaultList)" title="Drag to resize · double-click to reset" />

    <aside v-if="selected" class="menu-admin__panel menu-admin__col-wide" aria-labelledby="zone-panel-title">
      <header class="menu-admin__panel-head">
        <div>
          <h2 id="zone-panel-title" class="menu-admin__panel-title">{{ selected.name }}</h2>
          <p class="menu-admin__panel-sub">
            {{ selectedTables.length }} {{ selectedTables.length === 1 ? 'table' : 'tables' }} · {{ seatsIn(selected.id) }} seats<template v-if="free"> · {{ free }} free now</template>
          </p>
        </div>
        <span class="floor__panel-links">
          <RouterLink class="btn-soft" :to="{ name: 'floor-plan', query: { zone: selected.id } }"><AppIcon name="map" />Floor plan</RouterLink>
          <RouterLink class="btn-soft" :to="{ name: 'floor-tables', query: { zone: selected.id } }">Manage tables</RouterLink>
        </span>
      </header>
      <ul v-if="selectedTables.length" class="floor-mini">
        <li v-for="t in selectedTables" :key="t.id" class="floor-mini__table" :class="`floor-mini__table--${t.status}`">
          <strong>{{ t.name }}</strong>
          <span>{{ t.capacity }} seats · {{ statusLabel(t.status) }}</span>
        </li>
      </ul>
      <div v-else class="empty">
        <span class="empty__icon"><AppIcon name="table" /></span>
        <strong>No tables in {{ selected.name }}</strong>
        <p>Add tables from the Tables page or the floor plan.</p>
      </div>
    </aside>

    <Transition name="fade">
      <div v-if="form" class="modal" @keydown.esc="form = null">
        <div class="modal__backdrop" @click="form = null" />
        <form class="modal__card" role="dialog" aria-modal="true" aria-labelledby="zone-title" novalidate @submit.prevent="save">
          <header class="modal__head">
            <div>
              <h2 id="zone-title" class="modal__title">{{ form.id ? 'Edit zone' : 'Add zone' }}</h2>
              <p class="modal__subtitle">Zones group tables on the floor plan. Drag rows in the list to reorder them.</p>
            </div>
            <button type="button" class="modal__close" aria-label="Close" @click="form = null"><AppIcon name="x" /></button>
          </header>
          <div class="modal__body">
            <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
            <label class="form-label" for="z-name">Name</label>
            <input id="z-name" v-model.trim="form.name" class="text-field" required maxlength="60" autocomplete="off" placeholder="e.g. Terrace">
          </div>
          <footer class="modal__foot">
            <button type="button" class="btn-soft" @click="form = null">Cancel</button>
            <button type="submit" class="btn-cta modal__primary" :disabled="saving">
              {{ saving ? 'Saving…' : form.id ? 'Save changes' : 'Add zone' }}
            </button>
          </footer>
        </form>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { api, errorMessage } from '../lib/api'
import { useDragSort } from '../lib/dragSort'
import { useResizeSplit } from '../lib/resizeSplit'
import { statusLabel } from '../lib/tables'
import { useAuthStore } from '../stores/auth'
import { usePosStore } from '../stores/pos'

const auth = useAuthStore(), pos = usePosStore()
const q = ref('')
const loaded = ref(false), error = ref('')

const reload = async () => {
  try { await pos.loadFloor(); error.value = '' } catch (e) { error.value = errorMessage(e) ?? '' }
  loaded.value = true
}
onMounted(reload)
const fail = (e, target) => { const msg = errorMessage(e); if (msg) target.value = msg }

const sorted = computed(() => [...pos.zones].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id))
const shown = computed(() => {
  const s = q.value.toLowerCase()
  return s ? sorted.value.filter((z) => z.name.toLowerCase().includes(s)) : ordered.value
})
const tablesIn = (id) => pos.tables.filter((t) => t.zone_id === id)
const seatsIn = (id) => tablesIn(id).reduce((n, t) => n + (t.capacity ?? 0), 0)

// Right-hand preview of the chosen zone's tables; defaults to the first zone.
const selectedId = ref(null)
const selected = computed(() => sorted.value.find((z) => z.id === selectedId.value) ?? sorted.value[0] ?? null)
const selectedTables = computed(() => (selected.value ? tablesIn(selected.value.id) : []))
const free = computed(() => selectedTables.value.filter((t) => t.status === 'available').length)

// Width of the zone list beside the preview, remembered per browser.
const { root, listW, resizing, minList, defaultList, maxList, setListW, resizeStart } = useResizeSplit('forkish.zones.listWidth')

const form = ref(null), formError = ref(''), saving = ref(false)
const edit = (z) => {
  formError.value = ''
  form.value = z ? { id: z.id, name: z.name } : { id: null, name: '' }
}
async function save() {
  const f = form.value
  if (!f.name) { formError.value = 'Give the zone a name.'; return }
  saving.value = true; formError.value = ''
  try {
    const z = f.id ? await api.updateZone(f.id, { name: f.name }) : await api.createZone({ name: f.name })
    form.value = null
    await reload()
    selectedId.value = z.id
  } catch (e) { fail(e, formError) } finally { saving.value = false }
}

// Drag rows (or arrow keys on the grip) to set the order zones appear in everywhere.
const canReorder = computed(() => auth.can('tables.create') && !q.value && sorted.value.length > 1)
const { dragId, reordering, ordered, dragStart, nudge } = useDragSort(sorted, async (changed) => {
  try {
    await Promise.all(changed.map(([z, sort]) => api.updateZone(z.id, { sort })))
  } catch (e) { fail(e, error) } finally { await reload() }
})

const busy = ref(null)
async function remove(z) {
  if (!window.confirm(`Delete the “${z.name}” zone?`)) return
  busy.value = z.id
  try { await api.deleteZone(z.id); await reload() } catch (e) { fail(e, error) } finally { busy.value = null }
}
</script>
