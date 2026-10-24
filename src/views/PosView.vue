<template>
  <div class="pos" :class="{ 'is-cart-open': cartOpen }">
    <section class="pos__menu">
      <div class="pos__toolbar">
        <div class="segmented" role="group" aria-label="Order type">
          <button v-for="t in types" :key="t.v" class="segmented__btn" :class="{ 'is-active': pos.type === t.v }"
            @click="pos.type = t.v">{{ t.l }}</button>
        </div>
        <select v-if="pos.type === 'dine_in'" v-model="pos.tableId" class="field" aria-label="Table">
          <option :value="null" disabled>Select table</option>
          <option v-for="t in freeTables" :key="t.id" :value="t.id">{{ t.name }} ({{ t.zone }})</option>
        </select>
        <label class="search">
          <AppIcon name="search" />
          <input v-model.trim="q" type="search" placeholder="Search menu…" aria-label="Search menu" />
        </label>
        <button class="btn-soft" :disabled="reloading" title="Reload categories and items" @click="reload">
          <AppIcon name="refresh" />{{ reloading ? 'Refreshing…' : 'Refresh' }}
        </button>
      </div>

      <div v-if="!q" class="pos__cats">
        <button v-for="c in pos.menu.categories" :key="c.id" class="chip-btn" :class="{ 'is-active': cat === c.id }"
          :title="c.name" @click="cat = c.id">
          <span class="chip-btn__name">{{ c.name }}</span><span class="chip-btn__count">{{ countIn(c.id) }}</span>
        </button>
      </div>
      <p v-else class="pos__hint"><strong>{{ items.length }}</strong> results for “{{ q }}”</p>

      <div class="menu-grid">
        <button v-for="i in items" :key="i.id" class="menu-card"
          :class="[`tone-${tone(i.category_id)}`, { 'is-in-cart': qty[i.id] }]"
          :disabled="!i.is_available" @click="pos.add(i)">
          <span v-if="qty[i.id]" :key="qty[i.id]" class="menu-card__qty">{{ qty[i.id] }}</span>
          <span v-if="!i.is_available" class="menu-card__soldout">Sold out</span>
          <span class="menu-card__thumb">
            {{ initials(i.name) }}
            <img v-if="i.image && !brokenImg[i.id]" :src="i.image" :alt="i.name" loading="lazy"
              @error="brokenImg[i.id] = true" />
          </span>
          <span class="menu-card__name">{{ i.name }}</span>
          <span class="menu-card__footer">
            <span class="menu-card__price">{{ money(i.price) }}</span>
            <span class="menu-card__add"><AppIcon name="plus" /></span>
          </span>
        </button>
      </div>
      <div v-if="!items.length" class="empty">
        <span class="empty__icon"><AppIcon name="search" /></span>
        <strong>Nothing here</strong>
        <p>Try another category or search term.</p>
      </div>
    </section>

    <!-- Phones/tablets: order summary + send, pinned above the tab bar. Tap the summary for the full cart. -->
    <div class="order-bar">
      <button class="order-bar__summary" :aria-expanded="cartOpen" aria-controls="pos-cart" @click="cartOpen = true">
        <span class="order-bar__count">{{ itemCount }}</span>
        <span class="order-bar__text">
          <strong>{{ itemCount ? money(pos.total) : 'No items' }}</strong>
          <small>{{ pos.parked.length ? `View order · ${pos.parked.length} held` : 'View order' }}</small>
        </span>
        <AppIcon name="chevron-down" class="order-bar__chevron" />
      </button>
      <button class="order-bar__send" :disabled="!canSend || busy" @click="send">
        <AppIcon name="send" />{{ needsTable ? 'Pick a table' : 'Send to kitchen' }}
      </button>
    </div>
    <div v-if="cartOpen" class="cart-backdrop" @click="cartOpen = false"></div>

    <aside id="pos-cart" class="cart" :style="cartWidth ? { '--cart-w': `${cartWidth}px` } : null">
      <div class="cart__resizer" role="separator" aria-orientation="vertical" aria-label="Resize order panel" tabindex="0"
        title="Drag to resize · double-click to reset" @pointerdown="startResize" @dblclick="setCartWidth(null)"
        @keydown.left.prevent="nudgeCart(16)" @keydown.right.prevent="nudgeCart(-16)"></div>
      <header class="cart__header">
        <button class="icon-btn cart__close" aria-label="Close order" title="Close" @click="cartOpen = false">
          <AppIcon name="chevron-down" />
        </button>
        <div>
          <h2 class="cart__title">{{ showHeld ? 'Held orders' : 'Current order' }}</h2>
          <p class="cart__meta">
            <template v-if="showHeld">Parked carts, oldest first. Resume one to finish and send it.</template>
            <template v-else>
              <span v-if="pos.heldId" class="cart__resumed"><AppIcon name="pause" />{{ pos.resumed?.number ?? 'Held order' }}</span>
              {{ typeLabel }}<template v-if="table"> · {{ table.name }}</template> · {{ itemCount }} {{ itemCount === 1 ? 'item' : 'items' }}
            </template>
          </p>
        </div>
        <button v-if="auth.can('orders.create') && (pos.parked.length || showHeld)" class="btn-soft cart__held-toggle"
          :class="{ 'is-active': showHeld }" :aria-pressed="showHeld" @click="showHeld = !showHeld">
          <AppIcon :name="showHeld ? 'cart' : 'pause'" />{{ showHeld ? 'Back to order' : 'Held' }}
          <span v-if="!showHeld" class="chip-btn__count">{{ pos.parked.length }}</span>
        </button>
        <button v-if="!showHeld && (pos.cart.length || pos.heldId)" class="icon-btn icon-btn--danger"
          :title="pos.heldId ? 'Close (the held order stays on hold)' : 'Clear order'" :aria-label="pos.heldId ? 'Close held order' : 'Clear order'"
          @click="pos.clear(); pos.loadHeld()">
          <AppIcon :name="pos.heldId ? 'x' : 'trash'" />
        </button>
      </header>

      <div v-if="showHeld" class="cart__lines">
        <div v-if="!pos.parked.length" class="empty">
          <span class="empty__icon"><AppIcon name="pause" /></span>
          <strong>Nothing on hold</strong>
          <p>Use Hold to park a cart and serve the next guest.</p>
        </div>
        <ul class="held-list">
          <li v-for="o in pos.parked" :key="o.id" class="held-order">
            <div class="held-order__main">
              <span class="held-order__head">
                <strong>{{ o.number }}</strong>
                <span class="held-order__age"><AppIcon name="clock" />{{ elapsed(o.updated_at ?? o.created_at, now) }}</span>
              </span>
              <span class="held-order__meta">{{ heldLabel(o) }} · {{ money(o.total) }}</span>
              <span class="held-order__items">{{ o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ') }}</span>
              <span v-if="o.notes" class="held-order__notes"><AppIcon name="note" />{{ o.notes }}</span>
            </div>
            <div class="held-order__actions">
              <button class="btn-soft" :disabled="busy" @click="resume(o)"><AppIcon name="play" />Resume</button>
              <button class="icon-btn icon-btn--danger" :disabled="busy" :title="`Discard ${o.number}`" :aria-label="`Discard ${o.number}`"
                @click="discard(o)"><AppIcon name="trash" /></button>
            </div>
          </li>
        </ul>
        <div v-if="pos.error" class="alert-soft alert-soft--danger">{{ pos.error }}</div>
      </div>

      <div v-else class="cart__lines">
        <div v-if="!pos.cart.length" class="empty">
          <span class="empty__icon"><AppIcon name="cart" /></span>
          <strong>No items yet</strong>
          <p>Tap a menu item to start an order.</p>
        </div>
        <TransitionGroup name="line" tag="ul" class="cart-lines">
          <li v-for="(l, i) in pos.cart" :key="l.menu_item_id" class="cart-line">
            <div class="cart-line__info">
              <span class="cart-line__name">{{ l.name }}</span>
              <span class="cart-line__unit">{{ money(l.price) }} × {{ l.quantity }}</span>
            </div>
            <span class="cart-line__total">{{ money(l.price * l.quantity) }}</span>
            <div class="cart-line__controls">
              <button class="cart-line__note-btn" :class="{ 'is-active': l.notes || noteOpen[l.menu_item_id] }"
                :aria-expanded="!!noteOpen[l.menu_item_id]" @click="toggleNote(l)">
                <AppIcon name="note" />{{ l.notes ? 'Edit note' : 'Note' }}
              </button>
              <div class="stepper">
                <button class="stepper__btn" aria-label="Decrease" @click="pos.change(i, -1)"><AppIcon name="minus" /></button>
                <span class="stepper__value">{{ l.quantity }}</span>
                <button class="stepper__btn" aria-label="Increase" @click="pos.change(i, 1)"><AppIcon name="plus" /></button>
              </div>
            </div>
            <input v-if="noteOpen[l.menu_item_id]" v-model="l.notes" v-focus class="cart-line__note" type="text" maxlength="255"
              :aria-label="`Note for ${l.name}`" placeholder="e.g. no onion, extra spicy" @keydown.enter="noteOpen[l.menu_item_id] = false" />
            <p v-else-if="l.notes" class="cart-line__note-text">{{ l.notes }}</p>
          </li>
        </TransitionGroup>
      </div>

      <footer v-show="!showHeld" class="cart__footer">
        <label v-if="orderNoteOpen || pos.notes" class="notes-field">
          <AppIcon name="note" />
          <textarea ref="orderNoteEl" v-model="pos.notes" rows="1" placeholder="Order notes (allergies, timing…)"></textarea>
        </label>
        <button v-else class="cart__add-note" @click="openOrderNote"><AppIcon name="plus" />Add order note</button>

        <dl class="totals">
          <div class="totals__row"><dt>Subtotal</dt><dd>{{ money(pos.subtotal) }}</dd></div>
          <div v-if="taxRate" class="totals__row"><dt>{{ taxLabel }} {{ taxRate }}%</dt><dd>{{ money(pos.tax) }}</dd></div>
          <div class="totals__row totals__row--grand"><dt>Total</dt><dd>{{ money(pos.total) }}</dd></div>
        </dl>

        <div v-if="pos.error" class="alert-soft alert-soft--danger">{{ pos.error }}</div>

        <div class="cart__send">
          <button v-if="auth.can('orders.create')" class="btn-soft cart__hold" :disabled="!pos.cart.length || busy"
            title="Park this order and start another" @click="hold">
            <AppIcon name="pause" />Hold
          </button>
          <button class="btn-cta" :disabled="!canSend || busy" @click="send">
            <AppIcon name="send" /><span class="cart__send-label">Send<span class="cart__send-more"> to kitchen</span></span>
            <span class="btn-cta__amount">{{ money(pos.total) }}</span>
          </button>
        </div>
        <p v-if="!auth.can('orders.create') || !auth.can('kitchen.create')" class="cart__hint">Your account can't send orders to the kitchen.</p>
        <p v-else-if="needsTable" class="cart__hint">Select a table to send this dine-in order.</p>

        <div v-if="pos.lastOrder" :key="pos.lastOrder.id" class="receipt">
          <div class="receipt__head">
            <div>
              <span class="receipt__label">Last order</span>
              <span class="receipt__number">{{ pos.lastOrder.number }}</span>
            </div>
            <span class="badge-soft" :class="`badge-soft--${pos.lastOrder.status.toLowerCase()}`">{{ pos.lastOrder.status }}</span>
          </div>
          <div class="receipt__row">
            <strong>{{ money(pos.lastOrder.total) }}</strong>
            <span class="badge-soft" :class="`badge-soft--${pos.lastOrder.payment_status}`">{{ pos.lastOrder.payment_status }}</span>
          </div>
          <div class="receipt__actions">
            <template v-if="pos.lastOrder.payment_status !== 'paid' && auth.can('payments.create')">
              <button class="btn-soft" @click="pos.charge('cash')"><AppIcon name="cash" />Cash</button>
              <button class="btn-soft" @click="pos.charge('card')"><AppIcon name="card" />Card</button>
              <button class="btn-soft" @click="pos.charge('upi')"><AppIcon name="upi" />UPI</button>
            </template>
            <button class="btn-soft receipt__print" @click="printBill"><AppIcon name="printer" />Print bill</button>
          </div>
          <PrintBill :order="pos.lastOrder" :table-name="lastTableName" />
        </div>
      </footer>
    </aside>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import PrintBill from '../components/PrintBill.vue'
import { usePosStore } from '../stores/pos'
import { useAuthStore } from '../stores/auth'
import { money, taxLabel, taxRate } from '../lib/money'
import { printBill as printWhenReady } from '../lib/print'
import { useNow } from '../lib/now'
import { elapsed } from '../lib/tables'

const pos = usePosStore()
const auth = useAuthStore()
const cat = ref(null)
const q = ref('')
const types = [{ v: 'dine_in', l: 'Dine-in' }, { v: 'takeaway', l: 'Takeaway' }, { v: 'delivery', l: 'Delivery' }]

let timer
onMounted(async () => {
  if(pos.menu.categories.length === 0 || pos.menu.items.length === 0)
  {
    await pos.load(); 
  }
  cat.value ??= pos.menu.categories[0]?.id
  pos.refreshLastOrder(); pos.loadHeld()
  timer = setInterval(() => { pos.refreshLastOrder(); pos.loadHeld() }, 5000)
})
onUnmounted(() => clearInterval(timer))
watch(() => pos.menu.categories, (c) => { cat.value ??= c[0]?.id })

// Pull the latest categories and items (e.g. after a menu edit elsewhere).
const reloading = ref(false)
const reload = async () => {
  reloading.value = true
  try { await pos.load() } finally { reloading.value = false }
  if (!pos.menu.categories.some((c) => c.id === cat.value)) cat.value = pos.menu.categories[0]?.id ?? null
}

const items = computed(() => {
  const term = q.value.toLowerCase()
  return term
    ? pos.menu.items.filter((i) => i.name.toLowerCase().includes(term))
    : pos.menu.items.filter((i) => i.category_id === cat.value)
})
const countIn = (id) => pos.menu.items.filter((i) => i.category_id === id).length
const qty = computed(() => Object.fromEntries(pos.cart.map((l) => [l.menu_item_id, l.quantity])))
const itemCount = computed(() => pos.cart.reduce((n, l) => n + l.quantity, 0))
// Keep the chosen table listed even when occupied, so "Order more" from the floor plan works.
const freeTables = computed(() => pos.tables.filter((t) => t.status === 'available' || t.id === pos.tableId))
const table = computed(() => pos.type === 'dine_in' && pos.tables.find((t) => t.id === pos.tableId))
const typeLabel = computed(() => types.find((t) => t.v === pos.type)?.l)
const needsTable = computed(() => pos.cart.length && pos.type === 'dine_in' && !pos.tableId)
const canSend = computed(() => auth.can('orders.create') && auth.can('kitchen.create') && pos.cart.length && (pos.type !== 'dine_in' || pos.tableId))
const lastTableName = computed(() => pos.tables.find((t) => t.id === pos.lastOrder?.table_id)?.name ?? '')
const printBill = async () => { await pos.refreshLastOrder(); await printWhenReady() }

// ---- Notes: hidden behind a button until needed. Lines are keyed by menu item, like the cart itself.
const noteOpen = reactive({}), orderNoteOpen = ref(false), orderNoteEl = ref(null)
const openOrderNote = async () => { orderNoteOpen.value = true; await nextTick(); orderNoteEl.value?.focus() }
const toggleNote = (l) => { noteOpen[l.menu_item_id] = !noteOpen[l.menu_item_id] }
const vFocus = { mounted: (el) => el.focus() }
watch(() => pos.cart.length, (n) => { if (!n) { orderNoteOpen.value = false; for (const k in noteOpen) delete noteOpen[k] } })

// Mobile cart sheet (below lg); on wider screens the cart is always beside the menu.
const cartOpen = ref(false)

// ---- Resizable cart (lg+): drag its left edge; the width is remembered on this device.
const CART_W_KEY = 'pos.cartWidth', CART_MIN = 300, MENU_MIN = 360
const readCartWidth = () => { try { return Number(localStorage.getItem(CART_W_KEY)) || null } catch { return null } }
const cartWidth = ref(readCartWidth())
const setCartWidth = (w) => {
  cartWidth.value = w
  try { w ? localStorage.setItem(CART_W_KEY, String(w)) : localStorage.removeItem(CART_W_KEY) } catch {}
}
const clampCart = (w, aside) => Math.round(Math.min(Math.max(w, CART_MIN), aside.parentElement.clientWidth - MENU_MIN))
const startResize = (e) => {
  const handle = e.currentTarget, aside = handle.parentElement
  const right = aside.getBoundingClientRect().right
  handle.setPointerCapture(e.pointerId)
  document.body.classList.add('is-resizing')
  const move = (ev) => { cartWidth.value = clampCart(right - ev.clientX, aside) }
  const stop = () => {
    handle.removeEventListener('pointermove', move)
    document.body.classList.remove('is-resizing')
    if (cartWidth.value) setCartWidth(cartWidth.value)
  }
  handle.addEventListener('pointermove', move)
  handle.addEventListener('pointerup', stop, { once: true })
  handle.addEventListener('pointercancel', stop, { once: true })
}
const nudgeCart = (d) => {
  const aside = document.getElementById('pos-cart')
  setCartWidth(clampCart((cartWidth.value ?? aside.offsetWidth) + d, aside))
}

// ---- Hold / resume
const showHeld = ref(false), busy = ref(false)
const now = useNow(30000)
const run = async (fn) => { busy.value = true; try { await fn() } finally { busy.value = false } }
const hold = () => run(async () => { if (await pos.hold()) cartOpen.value = false })
const send = () => run(() => pos.sendToKitchen())
const resume = (o) => run(async () => { await pos.resume(o); if (pos.heldId === o.id) showHeld.value = false })
const discard = (o) => {
  if (window.confirm(`Discard held order ${o.number}? Its items will be lost.`)) run(() => pos.discardHeld(o))
}
const heldLabel = (o) => {
  const t = o.table_id && pos.tables.find((x) => x.id === o.table_id)
  return [types.find((x) => x.v === o.type)?.l, t?.name].filter(Boolean).join(' · ')
}
watch(() => pos.parked.length, (n) => { if (!n && showHeld.value && !busy.value) showHeld.value = false })

// Thumbnail styling: 6 gradient tones (see $tones in _tokens.scss) and name initials.
const tone = (categoryId) => (Number(categoryId) % 6) + 1
// Missing photos fall back to the gradient + initials.
const brokenImg = reactive({})
const initials = (name) => name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
</script>
