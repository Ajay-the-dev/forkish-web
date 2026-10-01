<template>
  <div class="page">
    <div class="stat-grid">
      <div v-for="s in stats" :key="s.status" class="stat-card" :class="`stat-card--${s.status}`">
        <span class="stat-card__icon"><AppIcon :name="s.icon" /></span>
        <div>
          <span class="stat-card__label">{{ s.label }}</span>
          <strong class="stat-card__value">{{ count(s.status) }}</strong>
        </div>
      </div>
    </div>

    <section v-for="(list, zone) in zones" :key="zone" class="zone">
      <header class="zone__head">
        <h2 class="zone__title">{{ zone }}</h2>
        <span class="zone__count">{{ list.filter((t) => t.status === 'available').length }} of {{ list.length }} free</span>
      </header>
      <div class="table-grid">
        <!-- Cleaning tiles are a plain box so they can hold their own "Mark clean" button. -->
        <component :is="t.status === 'cleaning' ? 'div' : 'button'" v-for="t in list" :key="t.id" class="table-tile"
          :class="`table-tile--${t.status}`" :disabled="t.status === 'cleaning' ? null : t.status !== 'available'"
          :title="t.status === 'available' ? 'Start order' : null" @click="t.status === 'available' && pick(t)">
          <span class="table-tile__name">{{ t.name }}</span>
          <span class="table-tile__visual"><AppIcon :name="icons[t.status] || 'users'" /></span>
          <span class="table-tile__status"><span class="status-dot"></span>{{ t.status.replace(/_/g, ' ') }}<template v-if="t.status === 'cleaning' && t.cleaning_since"> · {{ cleaningLeft(t) }}</template></span>
          <button v-if="t.status === 'cleaning'" class="btn-soft table-tile__action" @click="markClean(t)">
            <AppIcon name="check" />Mark clean
          </button>
        </component>
      </div>
    </section>

    <section class="zone">
      <header class="zone__head">
        <h2 class="zone__title">Now dining</h2>
        <span class="zone__count">{{ dining.length }} {{ dining.length === 1 ? 'table' : 'tables' }}</span>
      </header>
      <div v-if="dining.length" class="dining-grid">
        <article v-for="d in dining" :key="d.table.id" class="dining-card">
          <header class="dining-card__head">
            <div>
              <strong class="dining-card__table">{{ d.table.name }}</strong>
              <span class="dining-card__meta">{{ d.table.zone }} · {{ d.orders.map((o) => o.number).join(', ') }}</span>
            </div>
            <span v-if="d.since" class="dining-card__timer"><AppIcon name="clock" />{{ elapsed(d.since) }}</span>
          </header>
          <ul class="dining-card__items">
            <li v-for="i in d.items" :key="i.key">
              <span class="dining-card__qty">{{ i.quantity }}×</span>
              <span class="dining-card__name">{{ i.name }}</span>
              <span class="dining-card__price">{{ money(i.unit_price * i.quantity) }}</span>
            </li>
            <li v-if="!d.items.length" class="dining-card__none">No items yet</li>
          </ul>
          <footer class="dining-card__foot">
            <span class="badge-soft" :class="`badge-soft--${d.status.toLowerCase()}`">{{ d.status }}</span>
            <strong>{{ money(d.total) }}</strong>
          </footer>
          <button class="btn-soft dining-card__action" @click="orderMore(d.table)"><AppIcon name="plus" />Order more</button>
          <div v-if="d.due > 0" class="dining-card__pay">
            <span class="dining-card__due">Due <strong>{{ money(d.due) }}</strong></span>
            <button class="btn-soft" :disabled="paying === d.table.id" @click="settle(d, 'cash')"><AppIcon name="cash" />Cash</button>
            <button class="btn-soft" :disabled="paying === d.table.id" @click="settle(d, 'card')"><AppIcon name="card" />Card</button>
          </div>
          <div class="dining-card__actions">
            <button class="btn-soft" :disabled="!d.orders.length" @click="printBill(d)"><AppIcon name="printer" />Print bill</button>
            <button class="btn-soft" :disabled="d.due > 0" :title="d.due > 0 ? 'Settle the bill first' : null"
              @click="cleanTable(d)"><AppIcon name="sparkles" />Clean table</button>
          </div>
        </article>
      </div>
      <div v-else class="empty">
        <span class="empty__icon"><AppIcon name="users" /></span>
        <strong>No tables occupied</strong>
        <p>Dine-in orders will show up here.</p>
      </div>
    </section>

    <PrintBill v-if="bill" :order="bill" :table-name="billTable" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import PrintBill from '../components/PrintBill.vue'
import { usePosStore } from '../stores/pos'
import { api, CLEANING_MS } from '../lib/api'
import { money } from '../lib/money'
import { useNow } from '../lib/now'
import { printBill as printWhenReady } from '../lib/print'

const pos = usePosStore(), router = useRouter()
const icons = { available: 'check', occupied: 'users', reserved: 'calendar', cleaning: 'sparkles', out_of_service: 'ban' }
const stats = [
  { status: 'available', label: 'Available', icon: 'check' },
  { status: 'occupied', label: 'Occupied', icon: 'users' },
  { status: 'reserved', label: 'Reserved', icon: 'calendar' },
  { status: 'cleaning', label: 'Cleaning', icon: 'sparkles' },
]

const orders = ref([])
const refresh = async () => {
  const [o, t] = await Promise.all([api.orders(), api.tables()])
  orders.value = o; pos.tables = t
}
let timer
onMounted(() => { pos.load(); refresh(); timer = setInterval(refresh, 5000) })
onUnmounted(() => clearInterval(timer))

// Occupied tables with the items from their open orders, same dish merged into one line.
const dining = computed(() => pos.tables.filter((t) => t.status === 'occupied').map((table) => {
  // Only this party's orders: skip closed ones and anything from before the table was last freed.
  const open = orders.value.filter((o) => o.table_id === table.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
    && (!table.occupied_at || !o.created_at || o.created_at >= table.occupied_at))
  const items = Object.values(open.flatMap((o) => o.items ?? []).reduce((m, i) => {
    const key = i.menu_item_id ?? i.name
    if (m[key]) m[key].quantity += i.quantity
    else m[key] = { key, menu_item_id: key, name: i.name, unit_price: i.unit_price, quantity: i.quantity }
    return m
  }, {}))
  const since = open.map((o) => o.created_at).filter(Boolean).sort()[0]
  return {
    table, orders: open, items, since,
    status: open[0]?.status ?? 'NEW',
    total: open.reduce((t, o) => t + (o.total ?? 0), 0),
    due: open.reduce((t, o) => t + balance(o), 0),
  }
}))

const now = useNow(15000)
const markClean = async (t) => { await api.setTableStatus(t.id, 'available'); refresh() }
const cleaningLeft = (t) => {
  const m = Math.ceil((Date.parse(t.cleaning_since) + CLEANING_MS - now.value) / 60000)
  return m > 0 ? `${m}m left` : 'almost done'
}
const elapsed = (since) => {
  const m = Math.floor((now.value - Date.parse(since)) / 60000)
  return m < 1 ? 'Just now' : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
}
const zones = computed(() => pos.tables.reduce((z, t) => ((z[t.zone || 'Other'] ??= []).push(t), z), {}))
const count = (status) => pos.tables.filter((t) => t.status === status).length
const pick = (t) => { pos.type = 'dine_in'; pos.tableId = t.id; router.push('/pos') }
const orderMore = (t) => { pos.cart = []; pick(t) } // new order for the same table

// One bill for everything the table ordered.
const bill = ref(null), billTable = ref('')
const printBill = async (d) => {
  const sum = (k) => d.orders.reduce((t, o) => t + (o[k] ?? 0), 0)
  bill.value = {
    number: d.orders.map((o) => o.number).join(', '), type: 'dine_in', created_at: d.since, items: d.items,
    subtotal: sum('subtotal'), tax: sum('tax'), total: sum('total'),
    notes: d.orders.map((o) => o.notes).filter(Boolean).join(' · ') || null,
    payment_status: d.orders.every((o) => o.payment_status === 'paid') ? 'paid' : 'unpaid',
  }
  billTable.value = d.table.name
  await printWhenReady()
}

// Settle everything the table still owes in one go.
const balance = (o) => (o.payment_status === 'paid' ? 0 : Math.max((o.total ?? 0) - (o.paid ?? 0), 0))
const paying = ref(null)
const settle = async (d, method) => {
  paying.value = d.table.id
  try {
    for (const o of d.orders) if (balance(o) > 0) await api.pay(o.id, [{ method, amount: balance(o) }])
  } finally { paying.value = null }
  refresh()
}

// Party has left: send the table to cleaning (it frees itself after CLEANING_MS). Only reachable once paid; warn if the kitchen isn't done.
const IN_KITCHEN = ['NEW', 'CONFIRMED', 'PREPARING', 'READY']
const cleanTable = async (d) => {
  const cooking = d.orders.filter((o) => IN_KITCHEN.includes(o.status))
  const msg = cooking.length
    ? `${d.table.name} still has ${cooking.length} order(s) in the kitchen: ${cooking.map((o) => `${o.number} (${o.status})`).join(', ')}.\n\nSend the table for cleaning anyway?`
    : `Send ${d.table.name} for cleaning?`
  if (!window.confirm(msg)) return
  await api.setTableStatus(d.table.id, 'cleaning')
  refresh()
}
</script>
