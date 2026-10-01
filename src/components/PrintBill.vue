<template>
  <!-- Hidden on screen; _print.scss makes it the only thing on the page when printing.
       With `preview` it renders in place instead (used by the bill editor). -->
  <Teleport to="body" :disabled="preview">
    <article class="bill" :class="{ 'bill--preview': preview }" :style="vars" :aria-hidden="!preview">
      <header class="bill__head">
        <img v-if="t.logoUrl" :src="t.logoUrl" alt="" class="bill__logo" />
        <strong v-if="b.name" class="bill__brand">{{ b.name }}</strong>
        <span v-if="b.address" class="bill__multiline">{{ b.address }}</span>
        <span v-if="b.phone">Ph: {{ b.phone }}</span>
        <span v-if="b.email">{{ b.email }}</span>
        <span v-if="b.taxId">{{ b.taxIdLabel }}: {{ b.taxId }}</span>
        <span v-if="t.headerNote" class="bill__multiline">{{ t.headerNote }}</span>
      </header>

      <strong v-if="t.title" class="bill__title">{{ t.title }}</strong>

      <div v-if="meta.length" class="bill__meta">
        <span v-for="m in meta" :key="m">{{ m }}</span>
      </div>

      <table class="bill__lines">
        <thead><tr><th>{{ L.item }}</th><th>{{ L.qty }}</th><th>{{ L.amount }}</th></tr></thead>
        <tbody>
          <tr v-for="l in order.items" :key="l.id ?? l.menu_item_id">
            <td>
              {{ l.name }}
              <small v-if="s.unitPrice">{{ money(l.unit_price) }} each</small>
              <small v-if="s.itemNotes && l.notes">* {{ l.notes }}</small>
            </td>
            <td>{{ l.quantity }}</td>
            <td>{{ money(l.unit_price * l.quantity) }}</td>
          </tr>
        </tbody>
      </table>

      <dl class="bill__totals">
        <div v-if="s.itemCount"><dt>Items</dt><dd>{{ itemCount }}</dd></div>
        <div><dt>{{ L.subtotal }}</dt><dd>{{ money(subtotal) }}</dd></div>
        <div v-if="s.tax && taxRate"><dt>{{ taxLabel }} {{ taxRate }}%</dt><dd>{{ money(tax) }}</dd></div>
        <div class="bill__grand"><dt>{{ L.total }}</dt><dd>{{ money(total) }}</dd></div>
      </dl>

      <p v-if="s.orderNotes && order.notes" class="bill__notes">Note: {{ order.notes }}</p>
      <footer v-if="s.paymentStatus || t.footer" class="bill__foot">
        <strong v-if="s.paymentStatus">{{ order.payment_status === 'paid' ? L.paid : L.due }}</strong>
        <span v-if="t.footer" class="bill__multiline">{{ t.footer }}</span>
      </footer>
    </article>
  </Teleport>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { money, taxLabel, taxOn, taxRate } from '../lib/money'
import { FONTS, PAPERS } from '../lib/billTemplate'
import { useBillStore } from '../stores/bill'

const props = defineProps({
  order: { type: Object, required: true },
  tableName: { type: String, default: '' },
  template: { type: Object, default: null }, // editor passes its unsaved draft
  preview: { type: Boolean, default: false },
})

const store = useBillStore()
onMounted(() => store.load())

const t = computed(() => props.template ?? store.template)
const b = computed(() => t.value.business)
const s = computed(() => t.value.show)
const L = computed(() => t.value.labels)

const vars = computed(() => {
  const l = t.value.layout
  return {
    '--bill-width': PAPERS[l.paper] ?? PAPERS['80mm'],
    '--bill-font': FONTS[l.font] ?? FONTS.mono,
    '--bill-size': `${l.fontSize}px`,
    '--bill-align': l.align === 'left' ? 'flex-start' : 'center',
    '--bill-text': l.align,
    '--bill-rule': l.divider,
  }
})

// Orders from the API carry their own totals; the editor's sample order is worked out here.
const subtotal = computed(() => props.order.subtotal ?? props.order.items.reduce((n, l) => n + l.unit_price * l.quantity, 0))
const tax = computed(() => props.order.tax ?? taxOn(subtotal.value))
const total = computed(() => props.order.total ?? subtotal.value + tax.value)
const itemCount = computed(() => props.order.items.reduce((n, l) => n + l.quantity, 0))

const TYPES = { dine_in: 'Dine-in', takeaway: 'Takeaway', delivery: 'Delivery' }
const meta = computed(() => {
  const o = props.order, out = []
  if (s.value.orderNumber && o.number) out.push(o.number)
  if (s.value.dateTime) out.push(new Date(o.created_at ?? Date.now())
    .toLocaleString(import.meta.env.VITE_LOCALE || undefined, { dateStyle: 'medium', timeStyle: 'short' }))
  const where = [s.value.orderType && (TYPES[o.type] ?? o.type), s.value.table && props.tableName].filter(Boolean)
  if (where.length) out.push(where.join(' · '))
  return out
})
</script>
