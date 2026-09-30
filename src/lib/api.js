import axios from 'axios'
import { taxOn } from './money'

const http = axios.create({ baseURL: '/api', withCredentials: true })
const get = (u, p) => http.get(u, { params: p }).then((r) => r.data)

const real = {
  menu: () => get('/menu'),
  tables: () => get('/tables'),
  orders: (status) => get('/orders', { status }).then((r) => r.data ?? r),
  createOrder: (p) => http.post('/orders', p).then((r) => r.data),
  sendToKitchen: (id) => http.post(`/orders/${id}/send-to-kitchen`).then((r) => r.data),
  setStatus: (id, status) => http.patch(`/orders/${id}/status`, { status }).then((r) => r.data),
  pay: (id, payments) => http.post(`/orders/${id}/payments`, { payments }).then((r) => r.data),
}

// ---- in-memory mock mirroring the Laravel endpoints -------------------
const db = {
  categories: [{ id: 1, name: 'Burgers' }, { id: 2, name: 'Sides' }, { id: 3, name: 'Drinks' }],
  items: [
    [1, 1, 'Chicken Burger', 3500], [2, 1, 'Beef Burger', 4200], [3, 1, 'Veg Burger', 3000],
    [4, 2, 'Fries', 1200], [5, 2, 'Onion Rings', 1400],
    [6, 3, 'Cola', 800], [7, 3, 'Fresh Lemonade', 1500],
  ].map(([id, category_id, name, price]) => ({ id, category_id, name, price, is_available: true })),
  tables: [
    ['Indoor', 1], ['Indoor', 2], ['Indoor', 3], ['Outdoor', 4], ['Outdoor', 5],
  ].map(([zone, n]) => ({ id: n, name: `Table ${String(n).padStart(2, '0')}`, zone, status: 'available' })),
  orders: [],
  seq: 1,
}
const FLOW = { NEW: ['CONFIRMED'], CONFIRMED: ['PREPARING'], PREPARING: ['READY'], READY: ['SERVED'], SERVED: ['COMPLETED'] }
const find = (id) => db.orders.find((o) => o.id === id)

const mock = {
  menu: async () => ({ categories: db.categories, items: db.items }),
  tables: async () => db.tables.map((t) => ({ ...t })),
  orders: async (status) => db.orders.filter((o) => !status || o.status === status).map((o) => ({ ...o })),
  createOrder: async (p) => {
    const items = p.items.map((i) => {
      const m = db.items.find((x) => x.id === i.menu_item_id)
      return { ...i, name: m.name, unit_price: m.price }
    })
    const subtotal = items.reduce((t, i) => t + i.unit_price * i.quantity, 0)
    const tax = taxOn(subtotal)
    const o = {
      id: db.seq, number: `ORD-${1000 + db.seq++}`, type: p.type, table_id: p.table_id, notes: p.notes || null,
      status: 'NEW', payment_status: 'unpaid', items, subtotal, tax, total: subtotal + tax,
      created_at: new Date().toISOString(),
    }
    db.orders.unshift(o)
    const t = db.tables.find((x) => x.id === p.table_id)
    if (t) t.status = 'occupied'
    return { ...o }
  },
  sendToKitchen: async (id) => mock.setStatus(id, 'CONFIRMED'),
  setStatus: async (id, status) => {
    const o = find(id)
    if (!FLOW[o.status]?.includes(status)) throw new Error(`Cannot move ${o.status} to ${status}`)
    if (status === 'COMPLETED' && o.payment_status !== 'paid') throw new Error('Order is not fully paid')
    o.status = status
    if (status === 'COMPLETED') {
      const t = db.tables.find((x) => x.id === o.table_id)
      if (t) t.status = 'cleaning'
    }
    return { ...o }
  },
  pay: async (id, payments) => {
    const o = find(id)
    o.paid = (o.paid || 0) + payments.reduce((t, p) => t + p.amount, 0)
    o.payment_status = o.paid >= o.total ? 'paid' : 'partial'
    return { ...o }
  },
}

export const api = import.meta.env.VITE_MOCK === 'false' ? real : mock
