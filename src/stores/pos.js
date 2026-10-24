import { defineStore } from 'pinia'
import { api, errorMessage } from '../lib/api'
import { taxOn } from '../lib/money'

export const usePosStore = defineStore('pos', {
  state: () => ({
    type: 'dine_in', tableId: null, cart: [], notes: '',
    // heldId: the held order now in the cart (resumed), saved over instead of creating a new one.
    heldId: null, held: [],
    menu: { categories: [], items: [] }, tables: [], zones: [], lastOrder: null, error: '',
  }),
  getters: {
    subtotal: (s) => s.cart.reduce((t, l) => t + l.price * l.quantity, 0), // minor currency units
    tax() { return taxOn(this.subtotal) },
    total() { return this.subtotal + this.tax },
    parked: (s) => s.held.filter((o) => o.id !== s.heldId), // held orders not in the cart right now
    resumed: (s) => s.held.find((o) => o.id === s.heldId) ?? null,
  },
  actions: {
    async load() {
      const [menu, tables] = await Promise.all([api.menu(), api.tables()])
      this.menu = menu; this.tables = tables
    },
    // Table management screens: zones plus tables, without reloading the menu.
    async loadFloor() {
      const [zones, tables] = await Promise.all([api.zones(), api.tables()])
      this.zones = zones; this.tables = tables
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
    clear() { this.cart = []; this.notes = ''; this.heldId = null },
    payload() {
      return {
        type: this.type, table_id: this.type === 'dine_in' ? this.tableId : null, notes: this.notes,
        items: this.cart.map(({ menu_item_id, quantity, notes }) => ({ menu_item_id, quantity, notes })),
      }
    },
    // Create the order, or save the resumed held one; hold=true keeps it parked.
    async save(hold) {
      if (this.heldId) return api.saveDraft(this.heldId, this.payload())
      return api.createOrder({ ...this.payload(), hold })
    },
    async sendToKitchen() {
      this.error = ''
      try {
        const order = await this.save(false)
        this.lastOrder = await api.sendToKitchen(order.id)
        this.clear()
        this.tables = await api.tables()
        if (order.status === 'HELD') this.loadHeld()
      } catch (e) { this.error = errorMessage(e) ?? '' }
    },
    // ---- Hold / resume: park the cart on the server so any register can pick it up later.
    async loadHeld() {
      try { this.held = (await api.heldOrders()).sort((a, b) => (a.updated_at ?? a.created_at ?? '').localeCompare(b.updated_at ?? b.created_at ?? '')) }
      catch { /* keep the list we have */ }
    },
    async hold() {
      this.error = ''
      try { await this.save(true); this.clear(); await this.loadHeld(); return true }
      catch (e) { this.error = errorMessage(e) ?? ''; return false }
    },
    // Put a held order back in the cart. Whatever is in the cart now is held first, so nothing is lost.
    async resume(order) {
      if (this.cart.length && !(await this.hold())) return
      this.type = order.type; this.tableId = order.table_id; this.notes = order.notes ?? ''; this.heldId = order.id
      this.cart = order.items.reduce((c, i) => {
        const line = c.find((l) => l.menu_item_id === i.menu_item_id)
        if (line) line.quantity += i.quantity
        else c.push({ menu_item_id: i.menu_item_id, name: i.name, price: i.unit_price, quantity: i.quantity, notes: i.notes ?? '' })
        return c
      }, [])
    },
    async discardHeld(order) {
      this.error = ''
      try {
        await api.discardHeld(order.id)
        if (this.heldId === order.id) this.clear()
        await this.loadHeld()
      } catch (e) { this.error = errorMessage(e) ?? '' }
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
