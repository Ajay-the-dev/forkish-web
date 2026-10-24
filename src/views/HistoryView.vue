<template>
  <div class="page history">
    <div class="history__filters">
      <div class="segmented history__presets" role="group" aria-label="Date range">
        <button v-for="p in presets" :key="p.key" class="segmented__btn" :class="{ 'is-active': preset === p.key }"
          @click="applyPreset(p.key)">{{ p.label }}</button>
      </div>
      <div class="history__range">
        <label class="date-field"><span>From</span>
          <input v-model="from" type="date" :max="to || undefined" @change="preset = 'custom'" /></label>
        <label class="date-field"><span>To</span>
          <input v-model="to" type="date" :min="from || undefined" @change="preset = 'custom'" /></label>
      </div>
      <label class="search">
        <AppIcon name="search" />
        <input v-model.trim="q" type="search" placeholder="Order no., item or table…" aria-label="Search orders" />
      </label>
      <select v-model="status" class="field history__status" aria-label="Status">
        <option value="">All statuses</option>
        <option value="COMPLETED">Completed</option>
        <option value="open">Open</option>
        <option value="CANCELLED">Cancelled</option>
        <option value="HELD">On hold</option>
        <option value="MERGED">Merged</option>
      </select>
    </div>

    <div class="stat-grid">
      <div v-for="s in stats" :key="s.label" class="stat-card" :class="`stat-card--${s.tone}`">
        <span class="stat-card__icon"><AppIcon :name="s.icon" /></span>
        <div>
          <span class="stat-card__label">{{ s.label }}</span>
          <strong class="stat-card__value">{{ s.value }}</strong>
        </div>
      </div>
    </div>

    <p v-if="error" class="alert-soft alert-soft--danger">{{ error }}</p>

    <section v-for="g in groups" :key="g.day" class="history-day">
      <header class="history-day__head">
        <h2 class="history-day__title">{{ dayLabel(g.day) }}</h2>
        <span class="history-day__meta">{{ g.orders.length }} {{ g.orders.length === 1 ? 'order' : 'orders' }} · {{ money(g.revenue) }}</span>
      </header>
      <ul class="history-list">
        <li v-for="o in g.orders" :key="o.id" class="history-row" :class="{ 'is-open': openId === o.id, 'is-cancelled': o.status === 'CANCELLED' }">
          <button class="history-row__summary" :aria-expanded="openId === o.id" @click="openId = openId === o.id ? null : o.id">
            <span class="history-row__time">{{ time(o.created_at) }}</span>
            <span class="history-row__main">
              <strong>{{ o.number }}</strong>
              <span class="history-row__where">{{ typeLabel(o.type) }}<template v-if="tableName(o)"> · {{ tableName(o) }}</template></span>
              <span class="history-row__items">{{ summary(o) }}</span>
            </span>
            <span class="history-row__badges">
              <span class="badge-soft" :class="`badge-soft--${o.status.toLowerCase()}`">{{ o.status }}</span>
              <span class="badge-soft" :class="`badge-soft--${o.payment_status}`">{{ o.payment_status }}</span>
            </span>
            <strong class="history-row__total nowrap">{{ money(o.total) }}</strong>
          </button>

          <div v-if="openId === o.id" class="history-row__detail">
            <div class="history-row__detail-badges">
              <span class="badge-soft" :class="`badge-soft--${o.status.toLowerCase()}`">{{ o.status }}</span>
              <span class="badge-soft" :class="`badge-soft--${o.payment_status}`">{{ o.payment_status }}</span>
            </div>
            <table class="history-items">
              <tbody>
                <tr v-for="(i, k) in o.items ?? []" :key="k">
                  <td class="history-items__qty">{{ i.quantity }}×</td>
                  <td>{{ i.name }}<em v-if="i.notes" class="history-items__note">{{ i.notes }}</em></td>
                  <td class="history-items__amt">{{ money(i.unit_price * i.quantity) }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="o.notes" class="history-row__notes"><AppIcon name="note" />{{ o.notes }}</p>
            <div class="history-row__foot">
              <span>{{ fullDate(o.created_at) }}</span>
              <button class="btn-soft" @click="reprint(o)"><AppIcon name="printer" />Reprint bill</button>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <div v-if="!loading && !groups.length" class="empty">
      <span class="empty__icon"><AppIcon name="calendar" /></span>
      <strong>No orders found</strong>
      <p>Try a different date range or search.</p>
    </div>

    <PrintBill v-if="bill" :order="bill" :table-name="tableName(bill)" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import PrintBill from '../components/PrintBill.vue'
import { api } from '../lib/api'
import { daysAgo, localDay, monthStart } from '../lib/dates'
import { money } from '../lib/money'
import { printBill } from '../lib/print'
import { usePosStore } from '../stores/pos'

const pos = usePosStore()
const orders = ref([]), loading = ref(false), error = ref('')
const from = ref(daysAgo(6)), to = ref(daysAgo(0)), preset = ref('week')
const q = ref(''), status = ref(''), openId = ref(null)

const presets = [
  { key: 'today', label: 'Today' }, { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'Last 7 days' }, { key: 'month', label: 'This month' }, { key: 'all', label: 'All' },
]
const applyPreset = (key) => {
  preset.value = key
  const r = { today: [daysAgo(0), daysAgo(0)], yesterday: [daysAgo(1), daysAgo(1)], week: [daysAgo(6), daysAgo(0)],
    month: [monthStart(), daysAgo(0)], all: ['', ''] }[key]
  ;[from.value, to.value] = r
}

const load = async () => {
  loading.value = true; error.value = ''
  try { orders.value = await api.history({ from: from.value || undefined, to: to.value || undefined }) }
  catch (e) { error.value = e.response?.data?.message || e.message; orders.value = [] }
  finally { loading.value = false }
}
onMounted(() => { if (!pos.tables.length) pos.load(); load() })
watch([from, to], load)

const OPEN = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED']
const tableName = (o) => (o.table_id ? pos.tables.find((t) => t.id === o.table_id)?.name ?? `Table ${o.table_id}` : '')
const summary = (o) => (o.items ?? []).map((i) => `${i.quantity}× ${i.name}`).join(', ')

// Search and status run on the loaded range; the date range itself is fetched from the API.
const filtered = computed(() => {
  const term = q.value.toLowerCase()
  return orders.value
    .filter((o) => !status.value || (status.value === 'open' ? OPEN.includes(o.status) : o.status === status.value))
    .filter((o) => !term || [o.number, tableName(o), ...(o.items ?? []).map((i) => i.name)].some((s) => s?.toLowerCase().includes(term)))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
})

// Sales only: held carts aren't placed yet, and merged bills live on in the order they joined.
const counts = (o) => !['CANCELLED', 'HELD', 'MERGED'].includes(o.status)
const groups = computed(() => {
  const by = {}
  for (const o of filtered.value) (by[localDay(o.created_at)] ??= []).push(o)
  return Object.entries(by).map(([day, list]) => ({
    day, orders: list, revenue: list.filter(counts).reduce((t, o) => t + (o.total ?? 0), 0),
  }))
})

const stats = computed(() => {
  const live = filtered.value.filter(counts)
  const revenue = live.reduce((t, o) => t + (o.total ?? 0), 0)
  return [
    { label: 'Orders', value: live.length, icon: 'receipt', tone: 'available' },
    { label: 'Revenue', value: money(revenue), icon: 'cash', tone: 'cleaning' },
    { label: 'Avg. order', value: money(live.length ? Math.round(revenue / live.length) : 0), icon: 'cart', tone: 'reserved' },
    { label: 'Cancelled', value: filtered.value.filter((o) => o.status === 'CANCELLED').length, icon: 'ban', tone: 'occupied' },
  ]
})

const bill = ref(null)
const reprint = async (o) => { bill.value = o; await printBill() }

const TYPES = { dine_in: 'Dine-in', takeaway: 'Takeaway', delivery: 'Delivery' }
const typeLabel = (t) => TYPES[t] ?? t
const locale = import.meta.env.VITE_LOCALE || undefined
const time = (d) => new Date(d).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
const fullDate = (d) => new Date(d).toLocaleString(locale, { dateStyle: 'full', timeStyle: 'short' })
const dayLabel = (day) => {
  if (day === daysAgo(0)) return 'Today'
  if (day === daysAgo(1)) return 'Yesterday'
  return new Date(`${day}T00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
</script>
