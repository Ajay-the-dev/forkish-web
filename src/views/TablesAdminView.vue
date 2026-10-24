<template>
  <div class="page menu-admin">
    <div class="menu-admin__toolbar">
      <label class="search menu-admin__search">
        <AppIcon name="search" />
        <input v-model.trim="q" type="search" placeholder="Search tables…" aria-label="Search tables" />
      </label>
      <select v-model="zone" class="field" aria-label="Zone">
        <option :value="null">All zones</option>
        <option v-for="z in pos.zones" :key="z.id" :value="z.id">{{ z.name }}</option>
        <option value="none">No zone</option>
      </select>
      <select v-model="status" class="field" aria-label="Status">
        <option :value="null">Any status</option>
        <option v-for="s in STATUSES" :key="s.key" :value="s.key">{{ s.label }}</option>
      </select>
      <button v-if="auth.can('tables.create')" class="btn-soft btn-soft--brand" @click="form = { table: null }"><AppIcon name="plus" />Add table</button>
    </div>

    <p v-if="error" class="form-error" role="alert">{{ error }}</p>

    <div v-if="shown.length" class="menu-admin__scroll">
      <table class="menu-admin__table">
        <thead>
          <tr>
            <th scope="col">Table</th>
            <th scope="col" class="menu-admin__col-wide">Zone</th>
            <th scope="col" class="num menu-admin__col-wide">Seats</th>
            <th scope="col" class="menu-admin__col-wide">Shape</th>
            <th scope="col">Status</th>
            <th scope="col"><span class="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in shown" :key="t.id" :class="{ 'is-off': t.status === 'out_of_service' }">
            <th scope="row">
              {{ t.name }}
              <small class="menu-admin__row-count">{{ t.zone || 'No zone' }} · {{ t.capacity }} {{ t.capacity === 1 ? 'seat' : 'seats' }} · {{ shapeLabel(t.shape) }}</small>
              <small v-if="joinedTo(t, pos.tables)" class="floor__joined"><AppIcon name="merge" />Joined to {{ joinedTo(t, pos.tables).name }}</small>
              <small v-else-if="joinedTables(t, pos.tables).length" class="floor__joined">
                <AppIcon name="merge" />With {{ joinedTables(t, pos.tables).map((x) => x.name).join(', ') }}
              </small>
            </th>
            <td class="menu-admin__col-wide">{{ t.zone || '—' }}</td>
            <td class="num menu-admin__col-wide">{{ t.capacity }}</td>
            <td class="menu-admin__col-wide">{{ shapeLabel(t.shape) }}</td>
            <td>
              <!-- Occupied comes from orders, so it can't be picked here; free a table from the floor plan or Tables page. -->
              <select v-if="auth.can('tables.update') && t.status !== 'occupied'" class="field floor__status-field" :class="`floor__status-field--${t.status}`"
                :value="t.status" :disabled="busy === t.id" :aria-label="`${t.name} status`" @change="setStatus(t, $event.target.value)">
                <option v-for="s in MANUAL_STATUSES" :key="s" :value="s">{{ statusLabel(s) }}</option>
              </select>
              <span v-else class="floor-status" :class="`floor-status--${t.status}`">{{ statusLabel(t.status) }}</span>
            </td>
            <td class="menu-admin__actions">
              <span class="menu-admin__col-wide">
                <RouterLink class="icon-btn" :to="{ name: 'floor-plan', query: t.zone_id ? { zone: t.zone_id } : {} }" :aria-label="`Show ${t.name} on the floor plan`"
                  title="Show on floor plan"><AppIcon name="map" /></RouterLink>
                <button v-if="auth.can('tables.create')" class="icon-btn" :aria-label="`Edit ${t.name}`" title="Edit" @click="form = { table: t }"><AppIcon name="edit" /></button>
                <button v-if="auth.can('tables.cancel')" class="icon-btn icon-btn--danger" :aria-label="`Delete ${t.name}`"
                  :title="t.status === 'occupied' ? 'Has guests' : 'Delete'" :disabled="busy === t.id || t.status === 'occupied'" @click="remove(t)">
                  <AppIcon name="trash" /></button>
              </span>
              <!-- Phones: floor plan, edit and delete tucked behind one button. -->
              <button type="button" class="icon-btn menu-admin__col-narrow" :aria-label="`Options for ${t.name}`" :aria-expanded="menuFor?.id === t.id"
                @click.stop="openMenu(t, $event)"><AppIcon name="more-vertical" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else-if="loaded" class="empty">
      <span class="empty__icon"><AppIcon name="table" /></span>
      <strong>{{ filtered ? 'No tables match' : 'No tables yet' }}</strong>
      <p>{{ filtered ? 'Try another search, zone or status.' : 'Add the tables in your restaurant so staff can seat guests.' }}</p>
    </div>

    <div v-if="menuFor" class="menu-admin__pop" role="menu" :aria-label="`Options for ${menuFor.name}`" :style="menuPos" @click.stop>
      <RouterLink class="btn-soft" role="menuitem" :to="{ name: 'floor-plan', query: menuFor.zone_id ? { zone: menuFor.zone_id } : {} }">
        <AppIcon name="map" />Show on floor plan</RouterLink>
      <button v-if="auth.can('tables.create')" type="button" class="btn-soft" role="menuitem" @click="form = { table: menuFor }; closeMenu()"><AppIcon name="edit" />Edit</button>
      <button v-if="auth.can('tables.cancel')" type="button" class="btn-soft menu-admin__pop-danger" role="menuitem"
        :disabled="busy === menuFor.id || menuFor.status === 'occupied'" @click="remove(menuFor); closeMenu()"><AppIcon name="trash" />Delete</button>
      <small v-if="auth.can('tables.cancel') && menuFor.status === 'occupied'" class="menu-admin__pop-note">Free the table to delete it.</small>
    </div>

    <Transition name="fade">
      <TableFormDialog v-if="form" :table="form.table" :zones="pos.zones" :zone-id="typeof zone === 'number' ? zone : null"
        @close="form = null" @saved="saved" />
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import TableFormDialog from '../components/TableFormDialog.vue'
import { api, errorMessage } from '../lib/api'
import { useRowMenu } from '../lib/rowMenu'
import { joinedTables, joinedTo, MANUAL_STATUSES, SHAPES, STATUSES, statusLabel } from '../lib/tables'
import { useAuthStore } from '../stores/auth'
import { usePosStore } from '../stores/pos'

const auth = useAuthStore(), pos = usePosStore()
// ?zone=<id> preselects the filter (linked from the Zones page).
const q = ref(''), zone = ref(Number(useRoute().query.zone) || null), status = ref(null)
const loaded = ref(false), error = ref('')

const reload = async () => {
  try { await pos.loadFloor(); error.value = '' } catch (e) { error.value = errorMessage(e) ?? '' }
  loaded.value = true
}
onMounted(reload)
const fail = (e) => { const msg = errorMessage(e); if (msg) error.value = msg }

const filtered = computed(() => !!(q.value || zone.value || status.value))
const shown = computed(() => {
  const s = q.value.toLowerCase()
  return pos.tables.filter((t) => (!zone.value || (zone.value === 'none' ? t.zone_id == null : t.zone_id === zone.value))
    && (!status.value || t.status === status.value) && (!s || t.name.toLowerCase().includes(s)))
})
const shapeLabel = (s) => SHAPES.find((x) => x.key === s)?.label ?? 'Square'

const { menuFor, menuPos, openMenu, closeMenu } = useRowMenu()

const form = ref(null)
const saved = async () => { form.value = null; await reload() }

const busy = ref(null)
async function setStatus(t, s) {
  busy.value = t.id
  try { await api.setTableStatus(t.id, s); await reload() } catch (e) { fail(e); await reload() } finally { busy.value = null }
}
async function remove(t) {
  if (!window.confirm(`Delete ${t.name}?`)) return
  busy.value = t.id
  try { await api.deleteTable(t.id); await reload() } catch (e) { fail(e) } finally { busy.value = null }
}
</script>
