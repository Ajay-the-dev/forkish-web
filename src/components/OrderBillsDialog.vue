<template>
  <div class="modal" @keydown.esc="splitting ? (splitting = null) : $emit('close')">
    <div class="modal__backdrop" @click="$emit('close')" />
    <div class="modal__card modal__card--wide" role="dialog" aria-modal="true" aria-labelledby="bills-title">
      <header class="modal__head">
        <div>
          <h2 id="bills-title" class="modal__title">{{ splitting ? `Split ${splitting.number}` : `Bills for ${tableName}` }}</h2>
          <p class="modal__subtitle">
            {{ splitting
              ? 'Choose what goes on the new bill. It stays on this table and keeps its place in the kitchen.'
              : 'Each bill prints and is paid on its own. Split one to pay separately, or tick two or more to merge them.' }}
          </p>
        </div>
        <button type="button" class="modal__close" aria-label="Close" @click="$emit('close')"><AppIcon name="x" /></button>
      </header>

      <div class="modal__body">
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>

        <!-- Split: pick quantities to move -->
        <template v-if="splitting">
          <ul class="bill-split">
            <li v-for="l in splitting.items" :key="l.id" class="bill-split__line">
              <div>
                <span class="bill-split__name">{{ l.name }}</span>
                <span class="bill-split__unit">{{ l.quantity }} on bill · {{ money(l.unit_price) }} each</span>
              </div>
              <div class="stepper" role="group" :aria-label="`Move ${l.name}`">
                <button type="button" class="stepper__btn" aria-label="Fewer" :disabled="!moving[l.id]" @click="step(l, -1)"><AppIcon name="minus" /></button>
                <span class="stepper__value">{{ moving[l.id] ?? 0 }}</span>
                <button type="button" class="stepper__btn" aria-label="More" :disabled="(moving[l.id] ?? 0) >= l.quantity" @click="step(l, 1)"><AppIcon name="plus" /></button>
              </div>
              <span class="bill-split__total">{{ money(l.unit_price * (moving[l.id] ?? 0)) }}</span>
            </li>
          </ul>
          <p class="bill-split__summary">
            New bill <strong>{{ money(newSubtotal) }}</strong>{{ plusTax }} · stays on {{ splitting.number }}: <strong>{{ money(splitting.subtotal - newSubtotal) }}</strong>{{ plusTax }}
          </p>
        </template>

        <!-- Every open bill on the table -->
        <template v-else>
          <article v-for="o in orders" :key="o.id" class="bill-card" :class="{ 'is-picked': picked.includes(o.id) }">
            <header class="bill-card__head">
              <label v-if="canMerge" class="bill-card__pick" :title="mergeable(o) ? 'Select to merge' : 'Send to the kitchen first'">
                <input v-model="picked" type="checkbox" class="form-check-input" :value="o.id" :disabled="!mergeable(o) || busy" />
                <strong>{{ o.number }}</strong>
              </label>
              <strong v-else>{{ o.number }}</strong>
              <span class="dining-card__badges">
                <span class="badge-soft" :class="`badge-soft--${o.status.toLowerCase()}`">{{ o.status }}</span>
                <span class="badge-soft" :class="`badge-soft--${o.payment_status}`">{{ o.payment_status }}</span>
              </span>
            </header>
            <ul class="dining-card__items">
              <li v-for="i in o.items" :key="i.id ?? i.menu_item_id">
                <span class="dining-card__qty">{{ i.quantity }}×</span>
                <span class="dining-card__name">{{ i.name }}</span>
                <span class="dining-card__price">{{ money(i.unit_price * i.quantity) }}</span>
              </li>
            </ul>
            <footer class="bill-card__foot">
              <span>Total <strong>{{ money(o.total) }}</strong><template v-if="balance(o) > 0 && balance(o) < o.total"> · due <strong>{{ money(balance(o)) }}</strong></template></span>
              <span class="bill-card__actions">
                <button v-if="auth.can('orders.update')" type="button" class="btn-soft" :disabled="busy || !splittable(o)"
                  :title="splitHint(o)" @click="startSplit(o)"><AppIcon name="split" />Split</button>
                <button type="button" class="btn-soft" :disabled="busy" @click="$emit('print', o)"><AppIcon name="printer" />Print</button>
              </span>
            </footer>
            <div v-if="balance(o) > 0 && auth.can('payments.create')" class="bill-card__pay">
              <button v-for="m in METHODS" :key="m" type="button" class="btn-soft" :disabled="busy" @click="pay(o, m)">
                <AppIcon :name="m" />{{ m === 'upi' ? 'UPI' : m[0].toUpperCase() + m.slice(1) }} {{ money(balance(o)) }}
              </button>
            </div>
          </article>
          <div v-if="!orders.length" class="empty">
            <span class="empty__icon"><AppIcon name="receipt" /></span>
            <strong>No open bills</strong>
            <p>Everything on this table is settled.</p>
          </div>
        </template>
      </div>

      <footer class="modal__foot">
        <template v-if="splitting">
          <button type="button" class="btn-soft" :disabled="busy" @click="splitting = null">Back</button>
          <button type="button" class="btn-cta modal__primary" :disabled="busy || !movingCount || movingCount >= lineCount(splitting)" @click="split">
            {{ busy ? 'Splitting…' : movingCount >= lineCount(splitting) ? 'Leave something on the bill' : `Move ${movingCount} to a new bill` }}
          </button>
        </template>
        <template v-else>
          <button type="button" class="btn-soft" @click="$emit('close')">Close</button>
          <button v-if="canMerge" type="button" class="btn-cta modal__primary" :disabled="busy || picked.length < 2" @click="merge">
            <AppIcon name="merge" />{{ busy ? 'Merging…' : picked.length < 2 ? 'Tick bills to merge' : `Merge ${picked.length} bills` }}
          </button>
        </template>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { api, errorMessage } from '../lib/api'
import { money, taxLabel, taxRate } from '../lib/money'
import { balance } from '../lib/tables'
import { useAuthStore } from '../stores/auth'
import { remember } from '../lib/undo'

// The open bills (orders) of one table: print or pay each, split one, or merge several.
const props = defineProps({
  orders: { type: Array, required: true },
  tableName: { type: String, required: true },
})
const emit = defineEmits(['close', 'changed', 'print'])
const auth = useAuthStore()
const METHODS = ['cash', 'card', 'upi']
const plusTax = taxRate ? ` + ${taxLabel}` : ''

// Bills the kitchen has (not unsent or held ones); same rule as OrderController::splittable.
const KITCHEN_OR_LATER = ['CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'OUT_FOR_DELIVERY']
const mergeable = (o) => KITCHEN_OR_LATER.includes(o.status)
const lineCount = (o) => o.items.reduce((n, i) => n + i.quantity, 0)
const splittable = (o) => mergeable(o) && !(o.paid > 0) && lineCount(o) > 1
const splitHint = (o) => (!mergeable(o) ? 'Send to the kitchen first' : o.paid > 0 ? 'Bills with payments can\'t be split'
  : lineCount(o) < 2 ? 'Only one item on this bill' : null)
const canMerge = computed(() => auth.can('orders.update') && props.orders.filter(mergeable).length > 1)

const busy = ref(false), error = ref('')
const run = async (fn) => {
  busy.value = true; error.value = ''
  try { await fn(); emit('changed') } catch (e) { const m = errorMessage(e); if (m) error.value = m } finally { busy.value = false }
}

// ---- Merge: the oldest ticked bill keeps its number; the others fold into it.
const picked = ref([])
watch(() => props.orders, (list) => { picked.value = picked.value.filter((id) => list.some((o) => o.id === id && mergeable(o))) })
const merge = () => run(async () => {
  const [head, ...rest] = props.orders.filter((o) => picked.value.includes(o.id))
    .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id - b.id)
  remember(`Merged ${rest.map((o) => o.number).join(', ')} into ${head.number}`, await api.mergeOrders(head.id, rest.map((o) => o.id)))
  picked.value = []
})

// ---- Split
const splitting = ref(null)
const moving = reactive({})
const startSplit = (o) => { for (const k in moving) delete moving[k]; error.value = ''; splitting.value = o }
const step = (l, d) => { moving[l.id] = Math.min(Math.max((moving[l.id] ?? 0) + d, 0), l.quantity) }
const movingCount = computed(() => Object.values(moving).reduce((n, q) => n + q, 0))
const newSubtotal = computed(() => (splitting.value?.items ?? []).reduce((t, l) => t + l.unit_price * (moving[l.id] ?? 0), 0))
const split = () => run(async () => {
  const items = Object.entries(moving).filter(([, q]) => q > 0).map(([id, quantity]) => ({ id: Number(id), quantity }))
  const r = await api.splitOrder(splitting.value.id, items)
  remember(`Split ${movingCount.value} ${movingCount.value === 1 ? 'item' : 'items'} off ${splitting.value.number} into ${r.new_order.number}`, r)
  splitting.value = null
})

const pay = (o, method) => run(async () => {
  const amount = balance(o)
  remember(`Paid ${money(amount)} by ${method === 'upi' ? 'UPI' : method} on ${o.number}`, await api.pay(o.id, [{ method, amount }]))
})
</script>
