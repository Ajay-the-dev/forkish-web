// Bill layout settings, edited in views/BillEditorView.vue and rendered by components/PrintBill.vue.
export const PAPERS = { '58mm': '48mm', '80mm': '72mm', A4: '180mm' } // paper -> printable width
export const FONTS = {
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
}

export const defaultTemplate = () => ({
  logoUrl: '',
  title: '',
  business: {
    name: import.meta.env.VITE_REST_NAME || 'My Restaurant',
    address: '',
    phone: '',
    email: '',
    taxIdLabel: 'GSTIN',
    taxId: '',
  },
  headerNote: '',
  show: {
    orderNumber: true, dateTime: true, orderType: true, table: true,
    unitPrice: true, itemNotes: true, itemCount: false, orderNotes: true, tax: true, paymentStatus: true,
  },
  labels: {
    item: 'Item', qty: 'Qty', amount: 'Amount',
    subtotal: 'Subtotal', total: 'Total', paid: 'PAID', due: 'Amount due',
  },
  footer: 'Thank you!',
  layout: { paper: '80mm', font: 'mono', fontSize: 12, align: 'center', divider: 'dashed' },
})

// Fill in anything missing from a saved template so older saves keep working after new options are added.
export const withDefaults = (saved) => {
  const d = defaultTemplate()
  if (!saved || typeof saved !== 'object') return d
  for (const k of Object.keys(d)) {
    if (saved[k] === undefined) continue
    d[k] = d[k] && typeof d[k] === 'object' ? { ...d[k], ...saved[k] } : saved[k]
  }
  return d
}

// Order shown in the editor's live preview.
export const sampleOrder = () => ({
  number: 'ORD-1024', type: 'dine_in', created_at: new Date().toISOString(),
  notes: 'Less spicy please', payment_status: 'unpaid',
  items: [
    { menu_item_id: 1, name: 'Chicken 65', unit_price: 18000, quantity: 2, notes: '' },
    { menu_item_id: 84, name: 'Butter Naan', unit_price: 4500, quantity: 4, notes: 'Extra butter' },
    { menu_item_id: 46, name: 'Butter Chicken', unit_price: 25000, quantity: 1, notes: '' },
    { menu_item_id: 169, name: 'Mint Lime Juice', unit_price: 4000, quantity: 2, notes: '' },
  ],
})
