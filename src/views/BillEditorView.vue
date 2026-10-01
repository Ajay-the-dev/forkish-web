<template>
  <div class="page bill-editor">
    <form class="bill-editor__form" @submit.prevent="save">
      <section class="editor-card">
        <h2 class="editor-card__title">Business details</h2>
        <label class="editor-field"><span>Restaurant name</span>
          <input v-model="draft.business.name" class="text-input" /></label>
        <label class="editor-field"><span>Address</span>
          <textarea v-model="draft.business.address" class="text-input" rows="2" placeholder="Street, city, PIN"></textarea></label>
        <div class="editor-row">
          <label class="editor-field"><span>Phone</span>
            <input v-model="draft.business.phone" class="text-input" type="tel" /></label>
          <label class="editor-field"><span>Email</span>
            <input v-model="draft.business.email" class="text-input" type="email" /></label>
        </div>
        <div class="editor-row editor-row--narrow-first">
          <label class="editor-field"><span>Tax ID label</span>
            <input v-model="draft.business.taxIdLabel" class="text-input" placeholder="GSTIN" /></label>
          <label class="editor-field"><span>Tax ID</span>
            <input v-model="draft.business.taxId" class="text-input" /></label>
        </div>
        <label class="editor-field"><span>Logo image URL</span>
          <input v-model.trim="draft.logoUrl" class="text-input" type="url" placeholder="https://…" /></label>
      </section>

      <section class="editor-card">
        <h2 class="editor-card__title">Header &amp; footer</h2>
        <label class="editor-field"><span>Bill title</span>
          <input v-model="draft.title" class="text-input" placeholder="e.g. TAX INVOICE (leave blank to hide)" /></label>
        <label class="editor-field"><span>Text under the header</span>
          <textarea v-model="draft.headerNote" class="text-input" rows="2" placeholder="e.g. Open 11am – 11pm"></textarea></label>
        <label class="editor-field"><span>Footer text</span>
          <textarea v-model="draft.footer" class="text-input" rows="2"></textarea></label>
      </section>

      <section class="editor-card">
        <h2 class="editor-card__title">Show on the bill</h2>
        <div class="toggle-grid">
          <label v-for="f in fields" :key="f.key" class="toggle">
            <input v-model="draft.show[f.key]" type="checkbox" /><span>{{ f.label }}</span>
          </label>
        </div>
      </section>

      <section class="editor-card">
        <h2 class="editor-card__title">Labels</h2>
        <div class="editor-row editor-row--3">
          <label v-for="l in labels" :key="l.key" class="editor-field"><span>{{ l.label }}</span>
            <input v-model="draft.labels[l.key]" class="text-input" /></label>
        </div>
      </section>

      <section class="editor-card">
        <h2 class="editor-card__title">Layout</h2>
        <div class="editor-field"><span>Paper</span>
          <div class="segmented">
            <button v-for="p in Object.keys(PAPERS)" :key="p" type="button" class="segmented__btn"
              :class="{ 'is-active': draft.layout.paper === p }" @click="draft.layout.paper = p">{{ p }}</button>
          </div>
        </div>
        <div class="editor-field"><span>Font</span>
          <div class="segmented">
            <button v-for="f in fonts" :key="f.v" type="button" class="segmented__btn"
              :class="{ 'is-active': draft.layout.font === f.v }" @click="draft.layout.font = f.v">{{ f.l }}</button>
          </div>
        </div>
        <div class="editor-field"><span>Text size · {{ draft.layout.fontSize }}px</span>
          <input v-model.number="draft.layout.fontSize" type="range" min="9" max="18" class="range-input" />
        </div>
        <div class="editor-row">
          <div class="editor-field"><span>Header alignment</span>
            <div class="segmented">
              <button v-for="a in ['center', 'left']" :key="a" type="button" class="segmented__btn"
                :class="{ 'is-active': draft.layout.align === a }" @click="draft.layout.align = a">{{ a }}</button>
            </div>
          </div>
          <div class="editor-field"><span>Divider lines</span>
            <div class="segmented">
              <button v-for="d in ['dashed', 'solid', 'none']" :key="d" type="button" class="segmented__btn"
                :class="{ 'is-active': draft.layout.divider === d }" @click="draft.layout.divider = d">{{ d }}</button>
            </div>
          </div>
        </div>
      </section>

      <div class="bill-editor__bar">
        <button type="button" class="btn-soft" @click="resetDefaults">Reset to default</button>
        <button type="button" class="btn-soft" :disabled="!dirty" @click="discard">Discard changes</button>
        <button type="submit" class="btn-cta bill-editor__save" :disabled="!dirty || saving">
          <AppIcon name="check" />{{ saving ? 'Saving…' : dirty ? 'Save template' : 'Saved' }}
        </button>
      </div>
    </form>

    <aside class="bill-editor__preview">
      <header class="bill-editor__preview-head">
        <h2 class="editor-card__title">Live preview</h2>
        <button type="button" class="btn-soft" @click="testPrint"><AppIcon name="printer" />Test print</button>
      </header>
      <div class="paper">
        <PrintBill :order="sample" table-name="Table 03" :template="draft" preview />
      </div>
    </aside>

    <PrintBill v-if="printing" :order="sample" table-name="Table 03" :template="draft" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import PrintBill from '../components/PrintBill.vue'
import { PAPERS, defaultTemplate, sampleOrder, withDefaults } from '../lib/billTemplate'
import { useBillStore } from '../stores/bill'
import { printBill as printWhenReady } from '../lib/print'

const store = useBillStore()
const clone = (o) => JSON.parse(JSON.stringify(o))
const draft = ref(clone(store.template))
const sample = sampleOrder()

onMounted(async () => { await store.load(); draft.value = clone(store.template) })
watch(() => store.template, (t) => { if (!dirty.value) draft.value = clone(t) })

const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(store.template))
const saving = ref(false)
const save = async () => {
  saving.value = true
  try { await store.save(draft.value); draft.value = clone(store.template) } finally { saving.value = false }
}
const discard = () => { draft.value = clone(store.template) }
const resetDefaults = () => {
  if (window.confirm('Reset every bill setting to the default? You can still discard before saving.')) {
    draft.value = withDefaults(defaultTemplate())
  }
}

const printing = ref(false)
const testPrint = async () => { printing.value = true; await printWhenReady(); printing.value = false }

onBeforeRouteLeave(() => !dirty.value || window.confirm('You have unsaved bill changes. Leave without saving?'))

const fields = [
  { key: 'orderNumber', label: 'Order number' }, { key: 'dateTime', label: 'Date & time' },
  { key: 'orderType', label: 'Order type' }, { key: 'table', label: 'Table name' },
  { key: 'unitPrice', label: 'Price per item' }, { key: 'itemNotes', label: 'Item notes' },
  { key: 'itemCount', label: 'Item count' }, { key: 'orderNotes', label: 'Order notes' },
  { key: 'tax', label: 'Tax line' }, { key: 'paymentStatus', label: 'Paid / due status' },
]
const labels = [
  { key: 'item', label: 'Item column' }, { key: 'qty', label: 'Qty column' }, { key: 'amount', label: 'Amount column' },
  { key: 'subtotal', label: 'Subtotal' }, { key: 'total', label: 'Total' },
  { key: 'paid', label: 'Paid' }, { key: 'due', label: 'Unpaid' },
]
const fonts = [{ v: 'mono', l: 'Mono' }, { v: 'sans', l: 'Sans' }, { v: 'serif', l: 'Serif' }]
</script>
