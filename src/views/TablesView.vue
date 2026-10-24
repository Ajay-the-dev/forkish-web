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
        <!-- Tiles with their own buttons (Mark clean, Reserve, ...) are a plain box so the buttons aren't nested in one. -->
        <component :is="tileActions(t) ? 'div' : 'button'" v-for="t in list" :key="t.id" class="table-tile"
          :class="[`table-tile--${t.status}`, { 'table-tile--pick': tileActions(t) && canPick(t) }]"
          :disabled="tileActions(t) ? null : !canPick(t)" :role="tileActions(t) && canPick(t) ? 'button' : null"
          :tabindex="tileActions(t) && canPick(t) ? 0 : null" :title="canPick(t) ? 'Start order' : null"
          @click="canPick(t) && pick(t)" @keydown.enter.self="tileActions(t) && canPick(t) && pick(t)">
          <span class="table-tile__name">{{ t.name }}</span>
          <span class="table-tile__visual"><AppIcon :name="icons[t.status] || 'users'" /></span>
          <span class="table-tile__status"><span class="status-dot"></span>{{ joinedTo(t, pos.tables) ? `with ${joinedTo(t, pos.tables).name}` : t.status.replace(/_/g, ' ') }}<template v-if="t.status === 'cleaning' && t.cleaning_since"> · {{ cleaningLeft(t) }}</template></span>
          <button v-if="tileActions(t) === 'cleaning'" class="btn-soft table-tile__action" @click="markClean(t)">
            <AppIcon name="check" />Mark clean
          </button>
          <button v-else-if="tileActions(t) === 'available'" class="btn-soft table-tile__action" :disabled="busy === t.id"
            @click.stop="reserve(t, 'reserved')"><AppIcon name="calendar" />Reserve</button>
          <button v-else-if="tileActions(t) === 'reserved'" class="btn-soft table-tile__action p-4" :disabled="busy === t.id"
            @click.stop="reserve(t, 'available')"><AppIcon name="x" />Cancel reservation</button>
        </component>
      </div>
    </section>

    <section class="zone">
      <header class="zone__head">
        <h2 class="zone__title">Now dining</h2>
        <span class="zone__count">{{ dining.length }} {{ dining.length === 1 ? 'table' : 'tables' }}</span>
        <button v-if="dining.length" class="btn-soft dining-toggle" @click="toggleAll">
          <AppIcon :name="allOpen ? 'list' : 'layout'" />{{ allOpen ? 'Compact list' : 'Full view' }}
        </button>
      </header>
      <div v-if="dining.length" class="dining-grid">
        <article v-for="d in dining" :key="d.table.id" class="dining-card"
          :class="{ 'dining-card--open': isOpen(d), 'dining-card--popped': popFor(d) }">
          <!-- Phones: one compact row per table; tap it (or "Full view") for the whole card. -->
          <button class="dining-row" :aria-expanded="isOpen(d)" @click="toggle(d)">
            <strong class="dining-row__name">{{ diningName(d) }}</strong>
            <span class="badge-soft" :class="`badge-soft--${d.payment}`">{{ paymentLabels[d.payment] }}</span>
            <span class="dining-row__total">{{ money(d.total) }}</span>
            <AppIcon class="dining-row__chevron" name="chevron-down" />
          </button>
          <div class="dining-card__body">
            <header class="dining-card__head">
              <div>
                <strong class="dining-card__table">{{ [d.table, ...d.joined].map((t) => t.name).join(' + ') }}</strong>
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
              <span class="dining-card__badges">
                <span class="badge-soft" :class="`badge-soft--${d.status.toLowerCase()}`">{{ d.status }}</span>
                <span class="badge-soft" :class="`badge-soft--${d.payment}`">{{ paymentLabels[d.payment] }}</span>
              </span>
              <strong>{{ money(d.total) }}</strong>
            </footer>
            <div v-if="d.due > 0 && auth.can('payments.create')" class="dining-card__pay">
              <span class="dining-card__due">Due <strong>{{ money(d.due) }}</strong></span>
              <button class="btn-soft" :disabled="paying === d.table.id" @click="settle(d, 'cash')"><AppIcon name="cash" />Cash</button>
              <button class="btn-soft" :disabled="paying === d.table.id" @click="settle(d, 'card')"><AppIcon name="card" />Card</button>
              <button class="btn-soft" :disabled="paying === d.table.id" @click="settle(d, 'upi')"><AppIcon name="upi" />UPI</button>
            </div>
            <!-- Tablet / desktop: just the amount and a Pay button; methods pop out beside the card. -->
            <div v-if="d.due > 0 && auth.can('payments.create')" class="dining-card__paybar">
              <span class="dining-card__due">Due <strong>{{ money(d.due) }}</strong></span>
              <button class="btn-cta dining-card__paybtn" :aria-expanded="popFor(d, 'pay')" @click.stop="openPop(d, 'pay', $event)">
                <AppIcon name="cash" />Pay
              </button>
              <div v-if="popFor(d, 'pay')" class="card-pop" :class="{ 'card-pop--left': pop.left }" role="dialog"
                :aria-label="`Pay ${diningName(d)}`" @click.stop>
                <span class="card-pop__title">Settle {{ money(d.due) }}</span>
                <button class="btn-soft" :disabled="paying === d.table.id" @click="settle(d, 'cash')"><AppIcon name="cash" />Cash</button>
                <button class="btn-soft" :disabled="paying === d.table.id" @click="settle(d, 'card')"><AppIcon name="card" />Card</button>
                <button class="btn-soft" :disabled="paying === d.table.id" @click="settle(d, 'upi')"><AppIcon name="upi" />UPI</button>
              </div>
            </div>
            <button v-if="auth.can('orders.create')" class="btn-soft dining-card__action" @click="orderMore(d.table)"><AppIcon name="plus" />Order more</button>
            <div class="dining-card__actions">
              <button class="btn-soft" :disabled="!d.orders.length" @click="printBill(d)"><AppIcon name="printer" />Print bill</button>
              <button v-if="auth.can('tables.update')" class="btn-soft" :disabled="d.due > 0" :title="d.due > 0 ? 'Settle the bill first' : null"
                @click="cleanTable(d)"><AppIcon name="sparkles" />Clean</button>
            </div>
            <!-- Less frequent table actions, tucked behind one button. -->
            <template v-if="d.orders.length || auth.can('tables.update')">
              <div class="dining-card__more">
                <button class="btn-soft dining-card__action" :aria-expanded="popFor(d, 'more')" @click.stop="openPop(d, 'more', $event)">
                  <AppIcon name="more" />Other options
                </button>
                <div v-if="popFor(d, 'more')" class="card-pop card-pop--more" :class="{ 'card-pop--left': pop.left }" role="menu"
                  :aria-label="`More for ${diningName(d)}`" @click.stop>
                  <button v-if="d.orders.length" class="btn-soft" role="menuitem" @click="closePop(); billsFor = d.table.id">
                    <AppIcon name="split" />{{ auth.can('orders.update') ? 'Split or merge bills' : 'Separate bills' }}<span class="chip-btn__count">{{ d.orders.length }}</span>
                  </button>
                  <template v-if="auth.can('tables.update')">
                    <button class="btn-soft" role="menuitem" @click="closePop(); move = { table: d.table, mode: 'transfer' }"><AppIcon name="move" />Change table</button>
                    <button class="btn-soft" role="menuitem" @click="closePop(); move = { table: d.table, mode: 'merge' }"><AppIcon name="merge" />Join tables</button>
                  </template>
                </div>
              </div>
            </template>
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
    <Transition name="fade">
      <OrderBillsDialog v-if="billsDining" :orders="billsDining.orders" :table-name="diningName(billsDining)"
        @close="billsFor = null" @changed="refresh" @print="(o) => printOne(o, billsDining)" />
    </Transition>
    <Transition name="fade">
      <TableMoveDialog v-if="move" :table="move.table" :tables="pos.tables" :mode="move.mode" @close="move = null" @done="moved" />
    </Transition>
    <UndoToast @undone="refresh" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import PrintBill from '../components/PrintBill.vue'
import TableMoveDialog from '../components/TableMoveDialog.vue'
import OrderBillsDialog from '../components/OrderBillsDialog.vue'
import UndoToast from '../components/UndoToast.vue'
import { remember } from '../lib/undo'
import { usePosStore } from '../stores/pos'
import { useAuthStore } from '../stores/auth'
import { api, CLEANING_MS } from '../lib/api'
import { money } from '../lib/money'
import { useNow } from '../lib/now'
import { printBill as printWhenReady } from '../lib/print'
import { balance, elapsed as elapsedSince, joinedTables, joinedTo, OFF_BILL } from '../lib/tables'

const pos = usePosStore(), router = useRouter()
const auth = useAuthStore()
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
const onDocEvent = (e) => { if (e.type === 'click' || e.key === 'Escape') closePop() }
onMounted(() => {
  pos.load(); refresh(); timer = setInterval(refresh, 5000)
  document.addEventListener('click', onDocEvent); document.addEventListener('keydown', onDocEvent)
})
onUnmounted(() => {
  clearInterval(timer)
  document.removeEventListener('click', onDocEvent); document.removeEventListener('keydown', onDocEvent)
})

// Occupied tables with the items from their open orders, same dish merged into one line.
// Tables joined onto another show up as part of that table's card.
const dining = computed(() => pos.tables.filter((t) => t.status === 'occupied' && !t.merged_into_id).map((table) => {
  // Only this party's orders: skip closed ones and anything from before the table was last freed.
  const open = orders.value.filter((o) => o.table_id === table.id && !OFF_BILL.includes(o.status)
    && (!table.occupied_at || !o.created_at || o.created_at >= table.occupied_at))
  const items = Object.values(open.flatMap((o) => o.items ?? []).reduce((m, i) => {
    const key = i.menu_item_id ?? i.name
    if (m[key]) m[key].quantity += i.quantity
    else m[key] = { key, menu_item_id: key, name: i.name, unit_price: i.unit_price, quantity: i.quantity }
    return m
  }, {}))
  const since = open.map((o) => o.created_at).filter(Boolean).sort()[0]
  return {
    table, joined: joinedTables(table, pos.tables), orders: open, items, since,
    status: open[0]?.status ?? 'NEW',
    total: open.reduce((t, o) => t + (o.total ?? 0), 0),
    due: open.reduce((t, o) => t + balance(o), 0),
  }
}).map((d) => ({ ...d, payment: paymentStatus(d) })))

// Whole-table payment state: nothing paid yet, some paid, or fully settled.
const paymentLabels = { unpaid: 'Unpaid', partial: 'Partially paid', paid: 'Paid' }
const paymentStatus = (d) => (d.orders.length && d.due <= 0 ? 'paid' : d.due < d.total ? 'partial' : 'unpaid')

const now = useNow(15000)
const markClean = async (t) => { remember(`${t.name} marked clean`, await api.setTableStatus(t.id, 'available')); refresh() }
const cleaningLeft = (t) => {
  const m = Math.ceil((Date.parse(t.cleaning_since) + CLEANING_MS - now.value) / 60000)
  return m > 0 ? `${m}m left` : 'almost done'
}
const elapsed = (at) => elapsedSince(at, now.value)
const move = ref(null) // { table, mode: 'transfer' | 'merge' }
const moved = (result) => {
  const { table, mode } = move.value
  remember(mode === 'merge' ? `Joined tables onto ${table.name}` : `Changed ${table.name} to ${result?.name ?? 'another table'}`, result)
  move.value = null; refresh()
}
const zones = computed(() => pos.tables.reduce((z, t) => ((z[t.zone || 'Other'] ??= []).push(t), z), {}))
const count = (status) => pos.tables.filter((t) => t.status === status).length
// Free tables start an order; a reserved one too, once the booked party arrives.
const canPick = (t) => !t.merged_into_id && (t.status === 'available' || (t.status === 'reserved' && auth.can('orders.create')))
// Which button a tile carries, if any (needs table permissions).
const tileActions = (t) => (auth.can('tables.update') && !t.merged_into_id && ['cleaning', 'available', 'reserved'].includes(t.status) ? t.status : null)
const busy = ref(null)
const reserve = async (t, status) => {
  busy.value = t.id
  try {
    remember(status === 'reserved' ? `${t.name} reserved` : `${t.name} reservation cancelled`, await api.setTableStatus(t.id, status))
  } finally { busy.value = null }
  refresh()
}
const pick = (t) => { pos.type = 'dine_in'; pos.tableId = t.id; router.push('/pos') }
const orderMore = (t) => { pos.clear(); pick(t) } // new order for the same table

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
  billTable.value = diningName(d)
  await printWhenReady()
}
// Phone layout: which dining cards are expanded from the compact list.
const opened = ref(new Set())
const isOpen = (d) => opened.value.has(d.table.id)
const toggle = (d) => {
  const s = new Set(opened.value)
  s.has(d.table.id) ? s.delete(d.table.id) : s.add(d.table.id)
  opened.value = s
}
const allOpen = computed(() => dining.value.length > 0 && dining.value.every(isOpen))
const toggleAll = () => { opened.value = allOpen.value ? new Set() : new Set(dining.value.map((d) => d.table.id)) }
const diningName = (d) => [d.table, ...d.joined].map((t) => t.name).join(' + ')

// Per-bill view (split / merge / pay separately). Follows the table's live orders as they refresh.
const billsFor = ref(null)
const billsDining = computed(() => dining.value.find((d) => d.table.id === billsFor.value) ?? null)
const printOne = async (o, d) => { bill.value = o; billTable.value = diningName(d); await printWhenReady() }

// Popovers on a dining card (Pay, Other options); one open at a time.
// Tablet / desktop: beside the card, flipped left when there's no room on the right. Phones: above the button.
const POP_WIDTH = 220
const pop = ref({ id: null, kind: null, left: false })
const popFor = (d, kind) => pop.value.id === d.table.id && (!kind || pop.value.kind === kind)
const closePop = () => { pop.value = { id: null, kind: null, left: false } }
const openPop = (d, kind, e) => {
  if (popFor(d, kind)) return closePop()
  const card = e.currentTarget.closest('.dining-card').getBoundingClientRect()
  pop.value = { id: d.table.id, kind, left: card.right + POP_WIDTH + 16 > window.innerWidth }
}

// Settle everything the table still owes in one go.
const METHOD_LABELS = { cash: 'cash', card: 'card', upi: 'UPI' }
const paying = ref(null)
const settle = async (d, method) => {
  paying.value = d.table.id
  const done = []
  try {
    for (const o of d.orders) if (balance(o) > 0) done.push(await api.pay(o.id, [{ method, amount: balance(o) }]))
  } finally {
    paying.value = null; closePop()
    remember(`Settled ${money(d.due)} by ${METHOD_LABELS[method]} · ${diningName(d)}`, done) // whatever went through, even if one failed
  }
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
  remember(`${diningName(d)} sent for cleaning`, await api.setTableStatus(d.table.id, 'cleaning'))
  refresh()
}
</script>
