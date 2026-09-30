<template>
  <!-- Hidden on screen; _print.scss makes it the only thing on the page when printing. -->
  <Teleport to="body">
    <article class="bill" aria-hidden="true">
      <header class="bill__head">
        <strong class="bill__brand">{{ restName.VITE_REST_NAME }}</strong>
        <span>{{ order.number }}</span>
        <span>{{ when }}</span>
        <span>{{ typeLabel }}<template v-if="tableName"> · {{ tableName }}</template></span>
      </header>

      <table class="bill__lines">
        <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
        <tbody>
          <tr v-for="l in order.items" :key="l.id ?? l.menu_item_id">
            <td>{{ l.name }}<small>{{ money(l.unit_price) }} each</small></td>
            <td>{{ l.quantity }}</td>
            <td>{{ money(l.unit_price * l.quantity) }}</td>
          </tr>
        </tbody>
      </table>

      <dl class="bill__totals">
        <div><dt>Subtotal</dt><dd>{{ money(order.subtotal) }}</dd></div>
        <div v-if="taxRate"><dt>{{ taxLabel }} {{ taxRate }}%</dt><dd>{{ money(order.tax) }}</dd></div>
        <div class="bill__grand"><dt>Total</dt><dd>{{ money(order.total) }}</dd></div>
      </dl>

      <p v-if="order.notes" class="bill__notes">Note: {{ order.notes }}</p>
      <footer class="bill__foot">
        <strong>{{ order.payment_status === 'paid' ? 'PAID' : 'Amount due' }}</strong>
        <span>Thank you!</span>
      </footer>
    </article>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { money, taxLabel, taxRate } from '../lib/money'

const restName = import.meta.env

const props = defineProps({
  order: { type: Object, required: true },
  tableName: { type: String, default: '' },
})

const TYPES = { dine_in: 'Dine-in', takeaway: 'Takeaway', delivery: 'Delivery' }
const typeLabel = computed(() => TYPES[props.order.type] ?? props.order.type)
const when = computed(() => new Date(props.order.created_at ?? Date.now())
  .toLocaleString(import.meta.env.VITE_LOCALE || undefined, { dateStyle: 'medium', timeStyle: 'short' }))
</script>
