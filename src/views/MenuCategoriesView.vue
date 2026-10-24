<template>
  <div ref="root" class="page menu-admin menu-admin--split menu-admin--resizable" :style="{ '--list-w': `${listW}px` }">
    <div class="menu-admin__main">
      <div class="menu-admin__toolbar">
        <label class="search menu-admin__search">
          <AppIcon name="search" />
          <input v-model.trim="q" type="search" placeholder="Search categories…" aria-label="Search categories" />
        </label>
        <button v-if="auth.can('menu.create')" class="btn-soft btn-soft--brand" @click="edit(null)"><AppIcon name="plus" />Add category</button>
      </div>

      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <p v-if="auth.can('menu.update') && shown.length > 1" class="menu-admin__hint">
        {{ q ? 'Clear the search to reorder.' : 'Drag rows to set the order of tabs on the register.' }}
      </p>

      <div v-if="shown.length" class="menu-admin__scroll">
        <table class="menu-admin__table">
          <thead>
            <tr>
              <th v-if="canReorder" scope="col"><span class="visually-hidden">Reorder</span></th>
              <th scope="col">Category</th>
              <th scope="col" class="menu-admin__col-wide">Items</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in shown" :key="c.id" :data-id="c.id" :class="{ 'is-dragging': dragId === c.id, 'is-selected': selected?.id === c.id }">
              <td v-if="canReorder" class="menu-admin__grip-cell">
                <button type="button" class="menu-admin__grip" :aria-label="`Move ${c.name} (use arrow keys)`" title="Drag to reorder"
                  :disabled="reordering" @pointerdown="dragStart($event, c)" @keydown.up.prevent="nudge(c, -1)" @keydown.down.prevent="nudge(c, 1)">
                  <AppIcon name="grip" />
                </button>
              </td>
              <th scope="row">
                {{ c.name }}
                <small class="menu-admin__row-count">{{ countIn(c.id) }} {{ countIn(c.id) === 1 ? 'item' : 'items' }}</small>
              </th>
              <td class="menu-admin__col-wide">
                <button type="button" class="menu-admin__view" :aria-pressed="selected?.id === c.id" :aria-label="`Show items in ${c.name}`"
                  @click="selectedId = c.id">
                  {{ countIn(c.id) }} {{ countIn(c.id) === 1 ? 'item' : 'items' }}<AppIcon name="chevron-right" />
                </button>
              </td>
              <td class="menu-admin__actions">
                <span class="menu-admin__col-wide">
                  <button v-if="auth.can('menu.update')" class="icon-btn" :aria-label="`Edit ${c.name}`" title="Edit" @click="edit(c)"><AppIcon name="edit" /></button>
                  <button v-if="auth.can('menu.cancel')" class="icon-btn icon-btn--danger" :aria-label="`Delete ${c.name}`"
                    :title="countIn(c.id) ? 'Move or remove its items first' : 'Delete'" :disabled="busy === c.id || countIn(c.id) > 0"
                    @click="remove(c)"><AppIcon name="trash" /></button>
                </span>
                <!-- Phones: items, edit and delete tucked behind one button. -->
                <button type="button" class="icon-btn menu-admin__col-narrow" :aria-label="`Options for ${c.name}`" :aria-expanded="menuFor?.id === c.id"
                  @click.stop="openMenu(c, $event)"><AppIcon name="more-vertical" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="loaded" class="empty">
        <span class="empty__icon"><AppIcon name="tag" /></span>
        <strong>{{ q ? `No categories match “${q}”` : 'No categories yet' }}</strong>
        <p v-if="!q">Add one to start building the menu.</p>
      </div>
    </div>

    <div v-if="menuFor" class="menu-admin__pop" role="menu" :aria-label="`Options for ${menuFor.name}`" :style="menuPos" @click.stop>
      <RouterLink class="btn-soft" role="menuitem" :to="{ name: 'menu-items', query: { category: menuFor.id } }">
        <AppIcon name="utensils" />Manage items<span class="chip-btn__count">{{ countIn(menuFor.id) }}</span>
      </RouterLink>
      <button v-if="auth.can('menu.update')" type="button" class="btn-soft" role="menuitem" @click="edit(menuFor); closeMenu()"><AppIcon name="edit" />Edit</button>
      <button v-if="auth.can('menu.cancel')" type="button" class="btn-soft menu-admin__pop-danger" role="menuitem"
        :disabled="busy === menuFor.id || countIn(menuFor.id) > 0" :title="countIn(menuFor.id) ? 'Move or remove its items first' : null"
        @click="remove(menuFor); closeMenu()"><AppIcon name="trash" />Delete</button>
      <small v-if="auth.can('menu.cancel') && countIn(menuFor.id)" class="menu-admin__pop-note">Move or remove its items to delete.</small>
    </div>

    <!-- Tablet / desktop: drag (or arrow keys) to share the width between the list and the preview. -->
    <div v-if="selected" class="menu-admin__divider menu-admin__col-wide" role="separator" aria-orientation="vertical" tabindex="0"
      aria-label="Resize category list" :aria-valuenow="listW" :aria-valuemin="minList" :aria-valuemax="maxList()"
      :class="{ 'is-resizing': resizing }" @pointerdown="resizeStart" @keydown.left.prevent="setListW(listW - 24)"
      @keydown.right.prevent="setListW(listW + 24)" @dblclick="setListW(defaultList)" title="Drag to resize · double-click to reset" />

    <aside v-if="selected" class="menu-admin__panel menu-admin__col-wide" aria-labelledby="cat-panel-title">
      <header class="menu-admin__panel-head">
        <div>
          <h2 id="cat-panel-title" class="menu-admin__panel-title">{{ selected.name }}</h2>
          <p class="menu-admin__panel-sub">
            {{ selectedItems.length }} {{ selectedItems.length === 1 ? 'item' : 'items' }}<template v-if="soldOut"> · {{ soldOut }} sold out</template>
          </p>
        </div>
        <RouterLink class="btn-soft" :to="{ name: 'menu-items', query: { category: selected.id } }">Manage items</RouterLink>
      </header>
      <ul v-if="selectedItems.length" class="menu-admin__preview">
        <li v-for="i in selectedItems" :key="i.id" class="menu-admin__card" :class="{ 'is-off': !i.is_available }">
          <img v-if="i.image" :src="i.image" alt="" class="menu-admin__card-img" loading="lazy">
          <span v-else class="menu-admin__card-img menu-admin__thumb--empty"><AppIcon name="utensils" /></span>
          <div class="menu-admin__card-body">
            <strong>{{ i.name }}</strong>
            <span>{{ money(i.price) }}<template v-if="!i.is_available"> · Sold out</template></span>
          </div>
        </li>
      </ul>
      <div v-else class="empty">
        <span class="empty__icon"><AppIcon name="utensils" /></span>
        <strong>No items in {{ selected.name }}</strong>
        <p>Add items from the Items page.</p>
      </div>
    </aside>

    <Transition name="fade">
      <div v-if="form" class="modal" @keydown.esc="form = null">
        <div class="modal__backdrop" @click="form = null" />
        <form class="modal__card" role="dialog" aria-modal="true" aria-labelledby="cat-title" novalidate @submit.prevent="save">
          <header class="modal__head">
            <div>
              <h2 id="cat-title" class="modal__title">{{ form.id ? 'Edit category' : 'Add category' }}</h2>
              <p class="modal__subtitle">Categories appear as tabs on the register. Drag rows in the list to reorder them.</p>
            </div>
            <button type="button" class="modal__close" aria-label="Close" @click="form = null"><AppIcon name="x" /></button>
          </header>
          <div class="modal__body">
            <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
            <label class="form-label" for="c-name">Name</label>
            <input id="c-name" v-model.trim="form.name" class="text-field" required maxlength="100" autocomplete="off">
          </div>
          <footer class="modal__foot">
            <button type="button" class="btn-soft" @click="form = null">Cancel</button>
            <button type="submit" class="btn-cta modal__primary" :disabled="saving">
              {{ saving ? 'Saving…' : form.id ? 'Save changes' : 'Add category' }}
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
import { money } from '../lib/money'
import { useResizeSplit } from '../lib/resizeSplit'
import { useRowMenu } from '../lib/rowMenu'
import { useAuthStore } from '../stores/auth'
import { usePosStore } from '../stores/pos'

const auth = useAuthStore(), pos = usePosStore()
const q = ref('')
const loaded = ref(false), error = ref('')

// The POS store holds the menu, so the register sees changes as soon as we reload it.
const reload = async () => {
  try { await pos.load(); error.value = '' } catch (e) { error.value = errorMessage(e) }
  loaded.value = true
}
onMounted(reload)

const sorted = computed(() => [...pos.menu.categories].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id))
const shown = computed(() => {
  const s = q.value.toLowerCase()
  return s ? sorted.value.filter((c) => c.name.toLowerCase().includes(s)) : ordered.value
})
const countIn = (id) => pos.menu.items.filter((i) => i.category_id === id).length

// Right-hand preview of the chosen category's items; defaults to the first category.
const selectedId = ref(null)
const selected = computed(() => sorted.value.find((c) => c.id === selectedId.value) ?? sorted.value[0] ?? null)
const selectedItems = computed(() => selected.value ? pos.menu.items.filter((i) => i.category_id === selected.value.id) : [])
const soldOut = computed(() => selectedItems.value.filter((i) => !i.is_available).length)

const form = ref(null), formError = ref(''), saving = ref(false)
const edit = (c) => {
  formError.value = ''
  form.value = c ? { id: c.id, name: c.name } : { id: null, name: '' }
}
async function save() {
  const f = form.value
  if (!f.name) { formError.value = 'Give the category a name.'; return }
  const payload = { name: f.name }
  saving.value = true; formError.value = ''
  try {
    if (f.id) await api.updateCategory(f.id, payload)
    else await api.createCategory(payload)
    form.value = null
    await reload()
  } catch (e) {
    const msg = errorMessage(e)
    if (msg) formError.value = msg
  } finally { saving.value = false }
}

// Drag rows (or arrow keys on the grip) to set the order of tabs on the register.
const canReorder = computed(() => auth.can('menu.update') && !q.value && sorted.value.length > 1)
const { dragId, reordering, ordered, dragStart, nudge } = useDragSort(sorted, async (changed) => {
  try {
    await Promise.all(changed.map(([c, sort]) => api.updateCategory(c.id, { sort })))
  } catch (e) {
    const msg = errorMessage(e)
    if (msg) error.value = msg
  } finally { await reload() }
})

const { menuFor, menuPos, openMenu, closeMenu } = useRowMenu()

// Width of the list column beside the preview, remembered per browser.
const { root, listW, resizing, minList, defaultList, maxList, setListW, resizeStart } = useResizeSplit('forkish.categories.listWidth')

const busy = ref(null)
async function remove(c) {
  if (!window.confirm(`Delete the “${c.name}” category?`)) return
  busy.value = c.id
  try { await api.deleteCategory(c.id); await reload() } catch (e) {
    const msg = errorMessage(e)
    if (msg) error.value = msg
  } finally { busy.value = null }
}
</script>
