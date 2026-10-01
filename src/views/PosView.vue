<template>
  <div class="pos">
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
      </div>

      <div v-if="!q" class="">
        <button v-for="c in pos.menu.categories" :key="c.id" class="chip-btn m-1" :class="{ 'is-active': cat === c.id }"
          @click="cat = c.id">
          {{ c.name }}<span class="chip-btn__count">{{ countIn(c.id) }}</span>
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

    <aside class="cart">
      <header class="cart__header">
        <div>
          <h2 class="cart__title">Current order</h2>
          <p class="cart__meta">
            {{ typeLabel }}<template v-if="table"> · {{ table.name }}</template> · {{ itemCount }} {{ itemCount === 1 ? 'item' : 'items' }}
          </p>
        </div>
        <button v-if="pos.cart.length" class="icon-btn icon-btn--danger" title="Clear order" aria-label="Clear order"
          @click="pos.cart = []">
          <AppIcon name="trash" />
        </button>
      </header>

      <div class="cart__lines">
        <div v-if="!pos.cart.length" class="empty">
          <span class="empty__icon"><AppIcon name="cart" /></span>
          <strong>No items yet</strong>
          <p>Tap a menu item to start an order.</p>
        </div>
        <TransitionGroup name="line" tag="ul" class="cart-lines">
          <li v-for="(l, i) in pos.cart" :key="l.menu_item_id" class="cart-line">
            <div>
              <span class="cart-line__name">{{ l.name }}</span>
              <span class="cart-line__unit">{{ money(l.price) }} each</span>
            </div>
            <div class="stepper">
              <button class="stepper__btn" aria-label="Decrease" @click="pos.change(i, -1)"><AppIcon name="minus" /></button>
              <span class="stepper__value">{{ l.quantity }}</span>
              <button class="stepper__btn" aria-label="Increase" @click="pos.change(i, 1)"><AppIcon name="plus" /></button>
            </div>
            <span class="cart-line__total">{{ money(l.price * l.quantity) }}</span>
          </li>
        </TransitionGroup>
      </div>

      <footer class="cart__footer">
        <label class="notes-field">
          <AppIcon name="note" />
          <textarea v-model="pos.notes" rows="1" placeholder="Order notes (allergies, timing…)"></textarea>
        </label>

        <dl class="totals">
          <div class="totals__row"><dt>Subtotal</dt><dd>{{ money(pos.subtotal) }}</dd></div>
          <div v-if="taxRate" class="totals__row"><dt>{{ taxLabel }} {{ taxRate }}%</dt><dd>{{ money(pos.tax) }}</dd></div>
          <div class="totals__row totals__row--grand"><dt>Total</dt><dd>{{ money(pos.total) }}</dd></div>
        </dl>

        <div v-if="pos.error" class="alert-soft alert-soft--danger">{{ pos.error }}</div>

        <button class="btn-cta" :disabled="!canSend" @click="pos.sendToKitchen()">
          <AppIcon name="send" />Send to kitchen
          <span class="btn-cta__amount">{{ money(pos.total) }}</span>
        </button>
        <p v-if="needsTable" class="cart__hint">Select a table to send this dine-in order.</p>

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
            <template v-if="pos.lastOrder.payment_status !== 'paid'">
              <button class="btn-soft" @click="pos.charge('cash')"><AppIcon name="cash" />Cash</button>
              <button class="btn-soft" @click="pos.charge('card')"><AppIcon name="card" />Card</button>
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
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import PrintBill from '../components/PrintBill.vue'
import { usePosStore } from '../stores/pos'
import { money, taxLabel, taxRate } from '../lib/money'
import { printBill as printWhenReady } from '../lib/print'

const pos = usePosStore()
const cat = ref(null)
const q = ref('')
const types = [{ v: 'dine_in', l: 'Dine-in' }, { v: 'takeaway', l: 'Takeaway' }, { v: 'delivery', l: 'Delivery' }]

let timer
onMounted(async () => {
  await pos.load(); cat.value ??= pos.menu.categories[0]?.id
  pos.refreshLastOrder(); timer = setInterval(() => pos.refreshLastOrder(), 5000)
})
onUnmounted(() => clearInterval(timer))
watch(() => pos.menu.categories, (c) => { cat.value ??= c[0]?.id })

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
const canSend = computed(() => pos.cart.length && (pos.type !== 'dine_in' || pos.tableId))
const lastTableName = computed(() => pos.tables.find((t) => t.id === pos.lastOrder?.table_id)?.name ?? '')
const printBill = async () => { await pos.refreshLastOrder(); await printWhenReady() }

// Thumbnail styling: 6 gradient tones (see $tones in _tokens.scss) and name initials.
const tone = (categoryId) => (Number(categoryId) % 6) + 1
// Missing photos fall back to the gradient + initials.
const brokenImg = reactive({})
const initials = (name) => name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
</script>
