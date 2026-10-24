<template>
  <div class="page floor">
    <div class="menu-admin__toolbar">
      <div v-if="zoneTabs.length" class="segmented floor__zones" role="tablist" aria-label="Zones">
        <button v-for="z in zoneTabs" :key="z.key" type="button" class="segmented__btn" role="tab" :aria-selected="zoneKey === z.key"
          :class="{ 'is-active': zoneKey === z.key }" @click="zoneKey = z.key; selectedId = null">
          {{ z.name }}<span class="floor__zone-count">{{ z.count }}</span>
        </button>
      </div>
      <ul class="floor__legend" aria-label="Tables in this zone by status">
        <li v-for="s in legend" :key="s.key" class="floor-status" :class="`floor-status--${s.key}`">{{ s.label }} <strong>{{ s.count }}</strong></li>
      </ul>
    </div>

    <p v-if="error" class="form-error" role="alert">{{ error }}</p>

    <div class="floor__layout">
      <div class="floor__stage">
        <div v-if="auth.can('tables.create')" class="floor__arrange">
          <button v-if="editing" class="btn-soft" @click="addTable"><AppIcon name="plus" />Add table</button>
          <button class="btn-soft" :class="{ 'btn-soft--brand': editing }" :aria-pressed="editing" @click="editing = !editing">
            <AppIcon :name="editing ? 'check' : 'move'" />{{ editing ? 'Done arranging' : 'Arrange tables' }}
          </button>
        </div>
        <span class="floor__lock" :class="{ 'is-editing': editing }">
          <template v-if="editing"><AppIcon name="move" />Drag tables into place. Each move saves when you let go.</template>
          <template v-else><AppIcon name="lock" />Layout locked</template>
        </span>
        <div class="floor__scroll">
          <div ref="canvas" class="floor__canvas" :class="editing ? 'is-editing' : 'is-locked'" @click.self="selectedId = null">
            <svg v-if="links.length" class="floor__links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line v-for="l in links" :key="l.key" :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2" vector-effect="non-scaling-stroke" />
            </svg>
            <button v-for="t in zoneTables" :key="t.id" type="button" class="floor-table"
              :class="[`floor-table--${t.status}`, `floor-table--${t.shape || 'square'}`, {
                'is-selected': selectedId === t.id, 'is-dragging': drag?.id === t.id, 'is-joined': t.merged_into_id }]"
              :style="{ left: `${at(t).x}%`, top: `${at(t).y}%` }"
              :aria-label="`${t.name}, ${t.capacity} seats, ${statusLabel(t.status)}`" :aria-pressed="selectedId === t.id"
              @pointerdown="editing && dragStart($event, t)" @click="selectedId = t.id">
              <span class="floor-table__name">{{ t.name }}</span>
              <span class="floor-table__meta">
                <template v-if="t.status === 'occupied' && !t.merged_into_id && t.occupied_at"><AppIcon name="clock" />{{ elapsed(t.occupied_at, now, true) }}</template>
                <template v-else-if="t.merged_into_id"><AppIcon name="merge" />{{ joinedTo(t, pos.tables)?.name }}</template>
                <template v-else><AppIcon name="users" />{{ t.capacity }}</template>
              </span>
            </button>
            <div v-if="loaded && !zoneTables.length" class="empty floor__empty">
              <span class="empty__icon"><AppIcon name="grid" /></span>
              <strong>{{ pos.tables.length ? 'No tables in this zone' : 'No tables yet' }}</strong>
              <p v-if="auth.can('tables.create')">Choose <em>Arrange tables</em>, then <em>Add table</em> to put one here.</p>
            </div>
          </div>
        </div>
      </div>

      <aside class="menu-admin__panel floor__panel" aria-live="polite">
        <template v-if="selected">
          <header class="menu-admin__panel-head">
            <div>
              <h2 class="menu-admin__panel-title">{{ selected.name }}</h2>
              <p class="menu-admin__panel-sub">{{ selected.zone || 'No zone' }} · {{ selected.capacity }} seats · {{ shapeLabel(selected.shape) }}</p>
            </div>
            <span class="floor-status" :class="`floor-status--${selected.status}`">{{ statusLabel(selected.status) }}</span>
          </header>

          <p v-if="head" class="floor__note"><AppIcon name="merge" />Joined to <strong>{{ head.name }}</strong>. Its orders are on {{ head.name }}'s bill.</p>
          <p v-else-if="joined.length" class="floor__note"><AppIcon name="merge" />Joined with {{ joined.map((t) => t.name).join(', ') }} · {{ seats }} seats</p>

          <dl v-if="visit" class="floor__facts">
            <div><dt>Seated</dt><dd>{{ elapsed(selected.occupied_at, now) }}</dd></div>
            <div><dt>Orders</dt><dd>{{ visit.orders.length }}</dd></div>
            <div><dt>Bill</dt><dd>{{ money(visit.total) }}</dd></div>
            <div><dt>Due</dt><dd :class="{ 'is-due': visit.due > 0 }">{{ money(visit.due) }}</dd></div>
          </dl>
          <p v-if="selected.status === 'cleaning' && selected.cleaning_since" class="floor__note"><AppIcon name="sparkles" />Frees itself {{ cleaningLeft(selected) }}</p>

          <div class="floor__actions">
            <template v-if="editing">
              <button v-if="auth.can('tables.create')" class="btn-soft" @click="form = { table: selected }"><AppIcon name="edit" />Edit details</button>
              <button v-if="auth.can('tables.create') && selected.pos_x != null" class="btn-soft" @click="place(selected, null)"><AppIcon name="refresh" />Reset position</button>
              <button v-if="auth.can('tables.cancel')" class="btn-soft btn-soft--danger" :disabled="busy" @click="remove(selected)"><AppIcon name="trash" />Delete table</button>
            </template>
            <template v-else-if="head">
              <button v-if="auth.can('tables.update')" class="btn-soft" :disabled="busy" @click="run(() => api.unmergeTable(selected.id))"><AppIcon name="split" />Split off</button>
              <button class="btn-soft" @click="selectedId = head.id"><AppIcon name="chevron-right" />Open {{ head.name }}</button>
            </template>
            <template v-else>
              <button v-if="['available', 'reserved'].includes(selected.status) && auth.can('orders.create')" class="btn-soft btn-soft--brand"
                @click="startOrder(selected)"><AppIcon name="receipt" />Start order</button>
              <button v-if="selected.status === 'occupied' && auth.can('orders.create')" class="btn-soft btn-soft--brand"
                @click="startOrder(selected, true)"><AppIcon name="plus" />Order more</button>
              <button v-if="selected.status === 'occupied' && auth.can('tables.update')" class="btn-soft" @click="move = { table: selected, mode: 'transfer' }">
                <AppIcon name="move" />Move party</button>
              <button v-if="['available', 'reserved', 'occupied'].includes(selected.status) && auth.can('tables.update')" class="btn-soft"
                @click="move = { table: selected, mode: 'merge' }"><AppIcon name="merge" />Join tables</button>
              <template v-if="auth.can('tables.update')">
                <button v-if="selected.status === 'available'" class="btn-soft" :disabled="busy" @click="setStatus(selected, 'reserved')"><AppIcon name="calendar" />Reserve</button>
                <button v-if="selected.status === 'reserved'" class="btn-soft" :disabled="busy" @click="setStatus(selected, 'available')"><AppIcon name="x" />Cancel reservation</button>
                <button v-if="selected.status === 'cleaning'" class="btn-soft" :disabled="busy" @click="setStatus(selected, 'available')"><AppIcon name="check" />Mark clean</button>
                <button v-if="selected.status === 'available'" class="btn-soft" :disabled="busy" @click="setStatus(selected, 'out_of_service')"><AppIcon name="ban" />Out of service</button>
                <button v-if="selected.status === 'out_of_service'" class="btn-soft" :disabled="busy" @click="setStatus(selected, 'available')"><AppIcon name="check" />Back in service</button>
              </template>
            </template>
          </div>
        </template>

        <template v-else>
          <header class="menu-admin__panel-head">
            <div>
              <h2 class="menu-admin__panel-title">{{ zoneName }}</h2>
              <p class="menu-admin__panel-sub">{{ zoneTables.length }} {{ zoneTables.length === 1 ? 'table' : 'tables' }} · {{ zoneSeats.free }} of {{ zoneSeats.total }} seats free</p>
            </div>
          </header>
          <p class="floor__hint">{{ editing ? 'Select a table to edit it, or drag it into place.' : 'Select a table to start an order, move the party or join tables.' }}</p>
        </template>
      </aside>
    </div>

    <Transition name="fade">
      <TableFormDialog v-if="form" :table="form.table" :zones="pos.zones" :zone-id="form.zoneId" @close="form = null" @saved="saved" />
    </Transition>
    <Transition name="fade">
      <TableMoveDialog v-if="move" :table="move.table" :tables="pos.tables" :mode="move.mode" @close="move = null" @done="moved" />
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import TableFormDialog from '../components/TableFormDialog.vue'
import TableMoveDialog from '../components/TableMoveDialog.vue'
import { api, CLEANING_MS, errorMessage } from '../lib/api'
import { money } from '../lib/money'
import { useNow } from '../lib/now'
import { elapsed, joinedTables, joinedTo, openVisit, planPosition, SHAPES, STATUSES, statusLabel } from '../lib/tables'
import { useAuthStore } from '../stores/auth'
import { usePosStore } from '../stores/pos'

const auth = useAuthStore(), pos = usePosStore(), router = useRouter(), route = useRoute()
const now = useNow(15000)
const loaded = ref(false), error = ref(''), editing = ref(false)
const orders = ref([])

// Live view: refresh every few seconds, but never while a table is mid-drag or a dialog is open.
const refresh = async () => {
  if (drag.value || form.value || move.value) return
  try {
    const [o] = await Promise.all([api.orders(), pos.loadFloor()])
    orders.value = o; error.value = ''
  } catch (e) { error.value = errorMessage(e) ?? '' }
  loaded.value = true
}
let timer
onMounted(() => { refresh(); timer = setInterval(refresh, 8000) })
onUnmounted(() => clearInterval(timer))
const fail = (e) => { const msg = errorMessage(e); if (msg) error.value = msg }

// ---- Zones --------------------------------------------------------------------
const keyOf = (t) => t.zone_id ?? 'none'
const zoneTabs = computed(() => {
  const tabs = pos.zones.map((z) => ({ key: z.id, name: z.name, count: pos.tables.filter((t) => t.zone_id === z.id).length }))
  const loose = pos.tables.filter((t) => t.zone_id == null).length
  return loose ? [...tabs, { key: 'none', name: 'No zone', count: loose }] : tabs
})
// ?zone=<id> opens that zone (linked from the Zones page).
const zoneKey = ref(Number(route.query.zone) || null)
watch(zoneTabs, (tabs) => { if (tabs.length && !tabs.some((z) => z.key === zoneKey.value)) zoneKey.value = tabs[0].key }, { immediate: true })
const zoneName = computed(() => zoneTabs.value.find((z) => z.key === zoneKey.value)?.name ?? 'Floor plan')
const zoneTables = computed(() => pos.tables.filter((t) => keyOf(t) === zoneKey.value))
const zoneSeats = computed(() => ({
  total: zoneTables.value.reduce((n, t) => n + (t.capacity ?? 0), 0),
  free: zoneTables.value.filter((t) => t.status === 'available').reduce((n, t) => n + (t.capacity ?? 0), 0),
}))
const legend = computed(() => STATUSES.map((s) => ({ ...s, count: zoneTables.value.filter((t) => t.status === s.key).length }))
  .filter((s) => s.count || s.key === 'available'))

// ---- Placement ----------------------------------------------------------------
const at = (t) => (drag.value?.id === t.id ? drag.value : planPosition(t, zoneTables.value))
// Dashed lines from each joined table to the table it's joined to (same zone only).
const links = computed(() => zoneTables.value.filter((t) => t.merged_into_id).flatMap((t) => {
  const h = zoneTables.value.find((x) => x.id === t.merged_into_id)
  if (!h) return []
  const [a, b] = [at(t), at(h)]
  return [{ key: t.id, x1: a.x, y1: a.y, x2: b.x, y2: b.y }]
}))

const canvas = ref(null), drag = ref(null)
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
function dragStart(e, t) {
  if (e.button !== 0) return
  e.preventDefault()
  const rect = canvas.value.getBoundingClientRect()
  const start = at(t), sx = e.clientX, sy = e.clientY
  drag.value = { id: t.id, x: start.x, y: start.y, moved: false }
  const moveTo = (ev) => {
    const dx = ((ev.clientX - sx) / rect.width) * 100, dy = ((ev.clientY - sy) / rect.height) * 100
    drag.value = { id: t.id, x: clamp(start.x + dx, 4, 96), y: clamp(start.y + dy, 6, 94), moved: drag.value.moved || Math.hypot(dx, dy) > 0.5 }
  }
  const end = () => {
    window.removeEventListener('pointermove', moveTo)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    const d = drag.value
    drag.value = null
    if (d.moved) place(t, { x: Math.round(d.x), y: Math.round(d.y) })
  }
  window.addEventListener('pointermove', moveTo)
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)
}
// Save a position (null = back to the automatic layout), shown straight away.
async function place(t, p) {
  const before = { pos_x: t.pos_x, pos_y: t.pos_y }
  Object.assign(t, { pos_x: p?.x ?? null, pos_y: p?.y ?? null })
  try { await api.updateTable(t.id, { pos_x: t.pos_x, pos_y: t.pos_y }) } catch (e) { Object.assign(t, before); fail(e) }
}

// ---- Selected table -----------------------------------------------------------
const selectedId = ref(null)
const selected = computed(() => pos.tables.find((t) => t.id === selectedId.value) ?? null)
const head = computed(() => selected.value && joinedTo(selected.value, pos.tables))
const joined = computed(() => (selected.value ? joinedTables(selected.value, pos.tables) : []))
const seats = computed(() => [selected.value, ...joined.value].reduce((n, t) => n + (t?.capacity ?? 0), 0))
const visit = computed(() => (selected.value?.status === 'occupied' && !head.value ? openVisit(selected.value, orders.value) : null))
const shapeLabel = (s) => SHAPES.find((x) => x.key === s)?.label.toLowerCase() ?? 'square'
const cleaningLeft = (t) => {
  const m = Math.ceil((Date.parse(t.cleaning_since) + CLEANING_MS - now.value) / 60000)
  return m > 0 ? `in ${m}m` : 'any moment'
}

const busy = ref(false)
async function run(action) {
  busy.value = true; error.value = ''
  try { await action(); await refresh() } catch (e) { fail(e) } finally { busy.value = false }
}
const setStatus = (t, status) => run(() => api.setTableStatus(t.id, status))
async function remove(t) {
  if (!window.confirm(`Delete ${t.name}?`)) return
  await run(() => api.deleteTable(t.id))
}
const startOrder = (t, more = false) => {
  if (more) pos.clear() // a new order for the same table
  pos.type = 'dine_in'; pos.tableId = t.id
  router.push('/pos')
}

// ---- Dialogs ------------------------------------------------------------------
const form = ref(null), move = ref(null)
// New tables go in the current zone and join the automatic layout until someone drags them.
const addTable = () => { form.value = { table: null, zoneId: zoneKey.value === 'none' ? null : zoneKey.value } }
async function saved(t) {
  form.value = null
  await refresh()
  zoneKey.value = keyOf(t); selectedId.value = t.id
}
async function moved(t) {
  move.value = null
  await refresh()
  zoneKey.value = keyOf(t); selectedId.value = t.id
}
</script>
