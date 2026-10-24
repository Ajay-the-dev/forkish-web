<template>
  <div class="page">
    <!-- Mobile only: one column at a time, switched here. -->
    <div class="segmented kds-tabs" role="tablist" aria-label="Ticket status">
      <button v-for="c in cols" :key="c.status" class="segmented__btn kds-tabs__btn" role="tab"
        :class="[`kds-tabs__btn--${c.status.toLowerCase()}`, { 'is-active': tab === c.status }]"
        :aria-selected="tab === c.status" @click="tab = c.status">
        {{ c.label }}<span class="kds-tabs__count">{{ by(c.status).length }}</span>
      </button>
    </div>
    <div class="kds">
      <section v-for="c in cols" :key="c.status" class="kds-col"
        :class="[`kds-col--${c.status.toLowerCase()}`, { 'is-tab-active': tab === c.status }]">
        <header class="kds-col__head">
          <span class="kds-col__dot"></span>
          <h2 class="kds-col__title">{{ c.label }}</h2>
          <span class="kds-col__count">{{ by(c.status).length }}</span>
        </header>

        <TransitionGroup name="ticket" tag="div" class="kds-col__body">
          <article v-for="o in by(c.status)" :key="o.id" class="ticket"
            :class="{ 'is-warn': mins(o) >= 8 && mins(o) < 15, 'is-late': mins(o) >= 15 }">
            <header class="ticket__head">
              <strong class="ticket__no">{{ o.number }}</strong>
              <span v-if="o.created_at" class="ticket__timer"><AppIcon name="clock" />{{ elapsed(o) }}</span>
            </header>
            <div class="ticket__tags">
              <span class="tag">{{ o.type.replace('_', '-') }}</span>
              <span v-if="o.table_id" class="tag tag--brand">T{{ o.table_id }}</span>
            </div>
            <ul class="ticket__items">
              <li v-for="(i, k) in o.items" :key="k">
                <span class="ticket__qty">{{ i.quantity }}×</span>
                <span>{{ i.name }}<em v-if="i.notes" class="ticket__note">{{ i.notes }}</em></span>
              </li>
            </ul>
            <p v-if="o.notes" class="ticket__order-note"><AppIcon name="note" />{{ o.notes }}</p>
            <button v-if="canMove(c.next)" class="ticket__action" @click="advance(o, c.next)"><AppIcon :name="c.icon" />{{ c.action }}</button>
            <button v-if="c.status === 'CONFIRMED'" class="ticket__minor ticket__minor--danger" @click="cancel(o)"
              :title="(auth.can('orders.cancel') || auth.can('kitchen.cancel')) ? null : 'Needs manager approval'">
              <AppIcon :name="(auth.can('orders.cancel') || auth.can('kitchen.cancel')) ? 'ban' : 'shield'" />Cancel order
            </button>
            <button v-else-if="o.type === 'dine_in' && auth.can('orders.update')" class="ticket__minor" @click="toTakeaway(o)">
              <AppIcon name="cart" />Make takeaway
            </button>
          </article>
        </TransitionGroup>

        <div v-if="!by(c.status).length" class="kds-col__empty">
          <AppIcon :name="c.icon" />No tickets
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { api, errorMessage } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { useNow } from '../lib/now'

const orders = ref([])
const tab = ref('CONFIRMED') // active column on mobile
const cols = [
  { status: 'CONFIRMED', label: 'New', next: 'PREPARING', action: 'Start preparing', icon: 'flame' },
  { status: 'PREPARING', label: 'Preparing', next: 'READY', action: 'Mark ready', icon: 'bell' },
  { status: 'READY', label: 'Ready', next: 'SERVED', action: 'Mark served', icon: 'check' },
]
// Same rules as OrderController::STATUS_PERMISSIONS.
const auth = useAuthStore()
const MOVE = { PREPARING: ['kitchen.update'], READY: ['kitchen.update'], SERVED: ['kitchen.update', 'orders.update'] }
const canMove = (next) => (MOVE[next] ?? []).some((k) => auth.can(k))
const by = (s) => orders.value.filter((o) => o.status === s)
const refresh = async () => { orders.value = await api.orders() }
const advance = async (o, next) => {
  try { await api.setStatus(o.id, next) } catch (e) { const m = errorMessage(e); if (m) window.alert(m) }
  refresh()
}

// Only offered before cooking starts (New column).
const cancel = async (o) => {
  const paid = o.payment_status && o.payment_status !== 'unpaid'
  const msg = `Cancel ${o.number}?${paid ? '\n\nThis order has a payment recorded; refund it separately.' : ''}`
  if (!window.confirm(msg)) return
  try { await api.setStatus(o.id, 'CANCELLED') } catch (e) { const m = errorMessage(e); if (m) window.alert(m) }
  refresh()
}

// Customer wants it packed: the ticket shows "takeaway" so it goes out boxed. It stays on the table's bill.
const toTakeaway = async (o) => {
  if (!window.confirm(`Switch ${o.number} to takeaway?`)) return
  try { await api.setType(o.id, 'takeaway') } catch (e) { const m = errorMessage(e); if (m) window.alert(m) }
  refresh()
}

const now = useNow(15000)
const mins = (o) => (o.created_at ? Math.floor((now.value - Date.parse(o.created_at)) / 60000) : 0)
const elapsed = (o) => (mins(o) < 1 ? 'Just now' : `${mins(o)}m`)

let timer
onMounted(() => { refresh(); timer = setInterval(refresh, 3000) }) // swap for Reverb/Echo later
onUnmounted(() => clearInterval(timer))
</script>
