<template>
  <div class="page menu-admin">
    <div class="menu-admin__toolbar">
      <label class="search menu-admin__search">
        <AppIcon name="search" />
        <input v-model.trim="q" type="search" placeholder="Search items…" aria-label="Search items" />
      </label>
      <select v-model="cat" class="field" aria-label="Category">
        <option :value="null">All categories</option>
        <option v-for="c in pos.menu.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <div class="segmented menu-admin__layout" role="group" aria-label="Layout">
        <button v-for="v in views" :key="v.key" type="button" class="segmented__btn" :class="{ 'is-active': view === v.key }"
          :aria-pressed="view === v.key" :aria-label="v.label" :title="v.label" @click="view = v.key"><AppIcon :name="v.icon" /></button>
      </div>
      <button v-if="auth.can('menu.create')" class="btn-soft btn-soft--brand" :disabled="!pos.menu.categories.length"
        :title="pos.menu.categories.length ? null : 'Add a category first'" @click="edit(null)"><AppIcon name="plus" />Add item</button>
    </div>

    <p v-if="error" class="form-error" role="alert">{{ error }}</p>

    <div v-if="shown.length && view === 'list'" class="menu-admin__scroll">
      <table class="menu-admin__table">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col" class="menu-admin__col-wide">Category</th>
            <th scope="col" class="num menu-admin__col-wide">Price</th>
            <th scope="col" class="num menu-admin__col-wide">Prep</th>
            <th scope="col" class="menu-admin__col-wide">Station</th>
            <th scope="col">Available</th>
            <th scope="col"><span class="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in shown" :key="i.id" :class="{ 'is-off': !i.is_available }">
            <th scope="row">
              <span class="menu-admin__item">
                <img v-if="i.image" :src="i.image" alt="" class="menu-admin__thumb" loading="lazy">
                <span v-else class="menu-admin__thumb menu-admin__thumb--empty"><AppIcon name="utensils" /></span>
                <span>
                  {{ i.name }}
                  <small v-if="i.description" class="menu-admin__col-wide">{{ i.description }}</small>
                  <small class="menu-admin__row-count">{{ money(i.price) }}<template v-if="!cat"> · {{ categoryName(i.category_id) }}</template></small>
                </span>
              </span>
            </th>
            <td class="menu-admin__col-wide">{{ categoryName(i.category_id) }}</td>
            <td class="num menu-admin__col-wide">{{ money(i.price) }}</td>
            <td class="num menu-admin__col-wide">{{ i.prep_minutes ?? '—' }}<template v-if="i.prep_minutes != null">m</template></td>
            <td class="menu-admin__col-wide">{{ i.station || '—' }}</td>
            <td>
              <label class="switch">
                <input type="checkbox" :checked="i.is_available" :disabled="!auth.can('menu.update') || busy === i.id"
                  :aria-label="`${i.name} available`" @change="toggle(i)">
                <span class="switch__track" aria-hidden="true"></span>
              </label>
            </td>
            <td class="menu-admin__actions">
              <span class="menu-admin__col-wide">
                <button v-if="auth.can('menu.update')" class="icon-btn" :aria-label="`Edit ${i.name}`" title="Edit" @click="edit(i)"><AppIcon name="edit" /></button>
                <button v-if="auth.can('menu.cancel')" class="icon-btn icon-btn--danger" :aria-label="`Delete ${i.name}`" title="Delete"
                  :disabled="busy === i.id" @click="remove(i)"><AppIcon name="trash" /></button>
              </span>
              <!-- Phones: edit and delete tucked behind one button. -->
              <button v-if="auth.can('menu.update') || auth.can('menu.cancel')" type="button" class="icon-btn menu-admin__col-narrow"
                :aria-label="`Options for ${i.name}`" :aria-expanded="menuFor?.id === i.id" @click.stop="openMenu(i, $event)"><AppIcon name="more-vertical" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <ul v-else-if="shown.length" class="menu-admin__grid" :class="`menu-admin__grid--${view}`">
      <li v-for="i in shown" :key="i.id" class="menu-admin__tile" :class="{ 'is-off': !i.is_available }">
        <img v-if="i.image" :src="i.image" alt="" class="menu-admin__tile-img" loading="lazy">
        <span v-else class="menu-admin__tile-img menu-admin__tile-img--empty"><AppIcon name="utensils" /></span>
        <div class="menu-admin__tile-body">
          <div class="menu-admin__tile-head">
            <strong :title="i.name">{{ i.name }}</strong>
            <span class="menu-admin__tile-price">{{ money(i.price) }}</span>
          </div>
          <template v-if="view === 'large'">
            <p v-if="i.description" class="menu-admin__tile-desc">{{ i.description }}</p>
            <p class="menu-admin__tile-meta">
              {{ categoryName(i.category_id) }}
              <template v-if="i.prep_minutes != null"> · {{ i.prep_minutes }}m</template>
              <template v-if="i.station"> · {{ i.station }}</template>
            </p>
          </template>
          <div class="menu-admin__tile-foot">
            <label class="switch">
              <input type="checkbox" :checked="i.is_available" :disabled="!auth.can('menu.update') || busy === i.id"
                :aria-label="`${i.name} available`" @change="toggle(i)">
              <span class="switch__track" aria-hidden="true"></span>
            </label>
            <span class="menu-admin__actions">
              <span class="menu-admin__col-wide">
                <button v-if="auth.can('menu.update')" class="icon-btn" :aria-label="`Edit ${i.name}`" title="Edit" @click="edit(i)"><AppIcon name="edit" /></button>
                <button v-if="auth.can('menu.cancel')" class="icon-btn icon-btn--danger" :aria-label="`Delete ${i.name}`" title="Delete"
                  :disabled="busy === i.id" @click="remove(i)"><AppIcon name="trash" /></button>
              </span>
              <button v-if="auth.can('menu.update') || auth.can('menu.cancel')" type="button" class="icon-btn menu-admin__col-narrow"
                :aria-label="`Options for ${i.name}`" :aria-expanded="menuFor?.id === i.id" @click.stop="openMenu(i, $event)"><AppIcon name="more-vertical" /></button>
            </span>
          </div>
        </div>
      </li>
    </ul>
    <div v-else-if="loaded" class="empty">
      <span class="empty__icon"><AppIcon name="list" /></span>
      <strong>{{ q || cat ? 'No items match' : 'No menu items yet' }}</strong>
      <p>{{ q || cat ? 'Try another search or category.' : 'Add your first dish to see it on the register.' }}</p>
    </div>

    <div v-if="menuFor" class="menu-admin__pop" role="menu" :aria-label="`Options for ${menuFor.name}`" :style="menuPos" @click.stop>
      <button v-if="auth.can('menu.update')" type="button" class="btn-soft" role="menuitem" @click="edit(menuFor); closeMenu()"><AppIcon name="edit" />Edit</button>
      <button v-if="auth.can('menu.cancel')" type="button" class="btn-soft menu-admin__pop-danger" role="menuitem" :disabled="busy === menuFor.id"
        @click="remove(menuFor); closeMenu()"><AppIcon name="trash" />Delete</button>
    </div>

    <Transition name="fade">
      <div v-if="form" class="modal" @keydown.esc="form = null">
        <div class="modal__backdrop" @click="form = null" />
        <form class="modal__card modal__card--wide" role="dialog" aria-modal="true" aria-labelledby="item-title" novalidate @submit.prevent="save">
          <header class="modal__head">
            <div>
              <h2 id="item-title" class="modal__title">{{ form.id ? 'Edit item' : 'Add item' }}</h2>
              <p class="modal__subtitle">What staff see on the register and the kitchen sees on tickets.</p>
            </div>
            <button type="button" class="modal__close" aria-label="Close" @click="form = null"><AppIcon name="x" /></button>
          </header>
          <div class="modal__body">
            <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
            <div class="form-grid">
              <div>
                <label class="form-label" for="i-name">Name</label>
                <input id="i-name" v-model.trim="form.name" class="text-field" required maxlength="120" autocomplete="off">
              </div>
              <div>
                <label class="form-label" for="i-cat">Category</label>
                <select id="i-cat" v-model="form.category_id" class="field" required>
                  <option v-for="c in pos.menu.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div>
                <label class="form-label" for="i-price">Price</label>
                <input id="i-price" v-model.number="form.price" class="text-field" type="number" min="0" :step="priceStep" required>
              </div>
              <div>
                <label class="form-label" for="i-prep">Prep time <small>(minutes)</small></label>
                <input id="i-prep" v-model.number="form.prep_minutes" class="text-field" type="number" min="0" max="240" step="1">
              </div>
              <div>
                <label class="form-label" for="i-station">Station <small>(optional)</small></label>
                <input id="i-station" v-model.trim="form.station" class="text-field" list="i-stations" maxlength="40" placeholder="e.g. Grill">
                <datalist id="i-stations"><option v-for="s in stations" :key="s" :value="s" /></datalist>
              </div>
              <div>
                <label class="form-label" for="i-image">Image URL <small>(optional)</small></label>
                <input id="i-image" v-model.trim="form.image" class="text-field" type="url" maxlength="500" placeholder="https://…">
              </div>
            </div>
            <div class="menu-admin__field">
              <label class="form-label" for="i-desc">Description <small>(optional)</small></label>
              <textarea id="i-desc" v-model.trim="form.description" class="text-field" rows="2" maxlength="500"></textarea>
            </div>
            <label class="switch">
              <input v-model="form.is_available" type="checkbox">
              <span class="switch__track" aria-hidden="true"></span>
              {{ form.is_available ? 'Available on the register' : 'Sold out, hidden from orders' }}
            </label>
          </div>
          <footer class="modal__foot">
            <button type="button" class="btn-soft" @click="form = null">Cancel</button>
            <button type="submit" class="btn-cta modal__primary" :disabled="saving">
              {{ saving ? 'Saving…' : form.id ? 'Save changes' : 'Add item' }}
            </button>
          </footer>
        </form>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { api, errorMessage } from '../lib/api'
import { money, priceStep, toMajor, toMinor } from '../lib/money'
import { useRowMenu } from '../lib/rowMenu'
import { useAuthStore } from '../stores/auth'
import { usePosStore } from '../stores/pos'

const auth = useAuthStore(), pos = usePosStore()
// ?category=<id> preselects the filter (linked from the categories page).
const q = ref(''), cat = ref(Number(useRoute().query.category) || null)
const loaded = ref(false), error = ref('')

// Layout choice (list / large grid / mini grid), remembered across reloads.
const views = [
  { key: 'list', label: 'List', icon: 'list' },
  { key: 'large', label: 'Large grid', icon: 'grid' },
  { key: 'mini', label: 'Mini grid', icon: 'grid-small' },
]
const VIEW_KEY = 'pos.menuItemsView'
const readView = () => { try { const v = localStorage.getItem(VIEW_KEY); return views.some((x) => x.key === v) ? v : 'list' } catch { return 'list' } }
const view = ref(readView())
watch(view, (v) => { try { localStorage.setItem(VIEW_KEY, v) } catch {} })

// The POS store holds the menu, so the register sees changes as soon as we reload it.
const reload = async () => {
  try { await pos.load(); error.value = '' } catch (e) { error.value = errorMessage(e) }
  loaded.value = true
}
onMounted(reload)

const shown = computed(() => {
  const s = q.value.toLowerCase()
  return pos.menu.items.filter((i) => (!cat.value || i.category_id === cat.value)
    && (!s || i.name.toLowerCase().includes(s) || i.description?.toLowerCase().includes(s)))
})
const categoryName = (id) => pos.menu.categories.find((c) => c.id === id)?.name ?? '—'
const stations = computed(() => [...new Set(pos.menu.items.map((i) => i.station).filter(Boolean))].sort())
const fail = (e, target) => { const msg = errorMessage(e); if (msg) target.value = msg }

const form = ref(null), formError = ref(''), saving = ref(false)
const edit = (i) => {
  formError.value = ''
  form.value = i
    ? { ...i, price: toMajor(i.price), description: i.description ?? '', image: i.image ?? '', station: i.station ?? '' }
    : { id: null, name: '', category_id: cat.value ?? pos.menu.categories[0]?.id, price: '', prep_minutes: 10,
        station: '', image: '', description: '', is_available: true }
}
async function save() {
  const f = form.value
  if (!f.name) { formError.value = 'Give the item a name.'; return }
  if (f.price === '' || !(f.price >= 0)) { formError.value = 'Enter a price.'; return }
  const payload = {
    name: f.name, category_id: f.category_id, price: toMinor(f.price), prep_minutes: f.prep_minutes === '' ? 0 : f.prep_minutes,
    station: f.station || null, image: f.image || null, description: f.description || null, is_available: f.is_available,
  }
  saving.value = true; formError.value = ''
  try {
    if (f.id) await api.updateItem(f.id, payload)
    else await api.createItem(payload)
    form.value = null
    await reload()
  } catch (e) { fail(e, formError) } finally { saving.value = false }
}

const { menuFor, menuPos, openMenu, closeMenu } = useRowMenu()

const busy = ref(null)
async function toggle(i) {
  busy.value = i.id
  try { await api.updateItem(i.id, { is_available: !i.is_available }); await reload() } catch (e) { fail(e, error) } finally { busy.value = null }
}
async function remove(i) {
  if (!window.confirm(`Delete “${i.name}” from the menu?`)) return
  busy.value = i.id
  try { await api.deleteItem(i.id); await reload() } catch (e) { fail(e, error) } finally { busy.value = null }
}
</script>
