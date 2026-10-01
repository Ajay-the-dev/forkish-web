import { defineStore } from 'pinia'
import { api } from '../lib/api'
import { taxOn } from '../lib/money'

export const usePosStore = defineStore('pos', {
  state: () => ({
    type: 'dine_in', tableId: null, cart: [], notes: '',
    menu: { categories: [], items: [] }, tables: [], lastOrder: null, error: '',
  }),
  getters: {
    subtotal: (s) => s.cart.reduce((t, l) => t + l.price * l.quantity, 0), // minor currency units
    tax() { return taxOn(this.subtotal) },
    total() { return this.subtotal + this.tax },
  },
  actions: {
    async load() {
      const [menu, tables] = await Promise.all([api.menu(), api.tables()])
      this.menu = menu; this.tables = tables
    },
    add(item) {
      const line = this.cart.find((l) => l.menu_item_id === item.id)
      if (line) line.quantity++
      else this.cart.push({ menu_item_id: item.id, name: item.name, price: item.price, quantity: 1, notes: '' })
    },
    change(i, d) {
      this.cart[i].quantity += d
      if (this.cart[i].quantity < 1) this.cart.splice(i, 1)
    },
    async sendToKitchen() {
      this.error = ''
      try {
        const order = await api.createOrder({
          type: this.type, table_id: this.type === 'dine_in' ? this.tableId : null, notes: this.notes,
          items: this.cart.map(({ menu_item_id, quantity, notes }) => ({ menu_item_id, quantity, notes })),
        })
        this.lastOrder = await api.sendToKitchen(order.id)
        this.cart = []; this.notes = ''
        this.tables = await api.tables()
      } catch (e) { this.error = e.response?.data?.message || e.message }
    },
    // lastOrder is a copy; re-read it so payments/status changes made elsewhere (Tables, Kitchen) show here.
    async refreshLastOrder() {
      if (!this.lastOrder) return
      try { this.lastOrder = await api.order(this.lastOrder.id) } catch { /* keep the copy we have */ }
    },
    async charge(method) {
      const o = this.lastOrder
      const due = Math.max(o.total - (o.paid ?? 0), 0)
      this.lastOrder = due > 0 ? await api.pay(o.id, [{ method, amount: due }]) : await api.order(o.id)
    },
  },
})
