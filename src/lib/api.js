import axios from 'axios'
import { taxOn } from './money'
import { localDay } from './dates'

const http = axios.create({ baseURL: '/api', withCredentials: true, headers: { Accept: 'application/json' } })
// A 401 means the session ended (expired or logged out elsewhere); the auth store sends the user to the login screen.
let unauthorized = () => {}
export const onUnauthorized = (fn) => { unauthorized = fn }
// Sensitive actions the user lacks permission for come back 403 { approval_required }. The handler (the
// approval dialog) asks a manager for their PIN and calls retry({ approver_id, pin }), which resends the
// request with approval headers; it resolves with that response, or null if the dialog was dismissed.
let askApproval = async () => null
export const onApprovalRequired = (fn) => { askApproval = fn }
http.interceptors.response.use(null, async (e) => {
  const { status, data } = e.response ?? {}
  if (status === 401) unauthorized()
  if ((status === 403 || status === 429) && data?.approval_required && !e.config._approval) {
    const retry = ({ approver_id, pin }) => http.request({
      ...e.config, _approval: true, headers: { ...e.config.headers, 'X-Approver-Id': approver_id, 'X-Approver-Pin': pin },
    })
    const res = await askApproval(data, retry)
    return res ?? Promise.reject(Object.assign(e, { cancelled: true }))
  }
  return Promise.reject(e)
})
// The server's message for a failed request; null when the user dismissed the approval dialog.
export const errorMessage = (e) => (e?.cancelled ? null : e?.response?.data?.message || e?.message || 'Something went wrong')
const get = (u, p) => http.get(u, { params: p }).then((r) => r.data)
// Local calendar day (YYYY-MM-DD) -> ISO instant at its start/end, so the server filters in the browser's time zone.
const dayStart = (d) => d && new Date(`${d}T00:00:00`).toISOString()
const dayEnd = (d) => d && new Date(`${d}T23:59:59.999`).toISOString()

const real = {
  me: () => get('/me').then((r) => r.user),
  // A stale CSRF cookie (419) is refreshed by any GET, so retry once after fetching /me.
  login: (p) => http.post('/login', p)
    .catch((e) => (e.response?.status === 419 ? get('/me').then(() => http.post('/login', p)) : Promise.reject(e)))
    .then((r) => r.data.user),
  logout: () => http.post('/logout'),
  menu: () => get('/menu'),
  createCategory: (p) => http.post('/menu/categories', p).then((r) => r.data),
  updateCategory: (id, p) => http.patch(`/menu/categories/${id}`, p).then((r) => r.data),
  deleteCategory: (id) => http.delete(`/menu/categories/${id}`),
  createItem: (p) => http.post('/menu/items', p).then((r) => r.data),
  updateItem: (id, p) => http.patch(`/menu/items/${id}`, p).then((r) => r.data),
  deleteItem: (id) => http.delete(`/menu/items/${id}`),
  tables: () => get('/tables'),
  orders: (status) => get('/orders', status ? { status, per_page: 1000 } : { open: 1 }).then((r) => r.data ?? r),
  history: ({ from, to } = {}) => get('/orders', { from: dayStart(from), to: dayEnd(to), per_page: 1000 }).then((r) => r.data ?? r),
  order: (id) => get(`/orders/${id}`),
  createOrder: (p) => http.post('/orders', p).then((r) => r.data), // p.hold parks it as a HELD cart
  heldOrders: () => get('/orders', { status: 'HELD', per_page: 1000 }).then((r) => r.data ?? r),
  saveDraft: (id, p) => http.put(`/orders/${id}/draft`, p).then((r) => r.data),
  discardHeld: (id) => http.delete(`/orders/${id}`),
  splitOrder: (id, items) => http.post(`/orders/${id}/split`, { items }).then((r) => r.data),
  mergeOrders: (id, ids) => http.post(`/orders/${id}/merge`, { order_ids: ids }).then((r) => r.data),
  // Floor actions (pay, split, merge, move, join, table status) return `undo`, a token to put things back.
  undo: (token) => http.post(`/undo/${token}`).then((r) => r.data),
  sendToKitchen: (id) => http.post(`/orders/${id}/send-to-kitchen`).then((r) => r.data),
  setStatus: (id, status) => http.patch(`/orders/${id}/status`, { status }).then((r) => r.data),
  setType: (id, type) => http.patch(`/orders/${id}`, { type }).then((r) => r.data),
  pay: (id, payments) => http.post(`/orders/${id}/payments`, { payments }).then((r) => r.data),
  setTableStatus: (id, status) => http.patch(`/tables/${id}/status`, { status }).then((r) => r.data),
  createTable: (p) => http.post('/tables', p).then((r) => r.data),
  updateTable: (id, p) => http.patch(`/tables/${id}`, p).then((r) => r.data),
  deleteTable: (id) => http.delete(`/tables/${id}`),
  transferTable: (id, toId) => http.post(`/tables/${id}/transfer`, { to_table_id: toId }).then((r) => r.data),
  mergeTables: (id, ids) => http.post(`/tables/${id}/merge`, { table_ids: ids }).then((r) => r.data),
  unmergeTable: (id) => http.post(`/tables/${id}/unmerge`).then((r) => r.data),
  zones: () => get('/zones'),
  createZone: (p) => http.post('/zones', p).then((r) => r.data),
  updateZone: (id, p) => http.patch(`/zones/${id}`, p).then((r) => r.data),
  deleteZone: (id) => http.delete(`/zones/${id}`),
  billTemplate: () => get('/settings/bill_template'),
  saveBillTemplate: (t) => http.put('/settings/bill_template', t).then((r) => r.data),
  team: () => get('/team'),
  createMember: (p) => http.post('/team', p).then((r) => r.data),
  updateMember: (id, p) => http.patch(`/team/${id}`, p).then((r) => r.data),
  saveRolePermissions: (id, permissions) => http.put(`/roles/${id}/permissions`, { permissions }).then((r) => r.data),
  approvers: (permission) => get('/approvers', { permission }),
  approvals: () => get('/approvals'),
}

const db = {
  categories:  [
  { id: 1, name: 'Chinese Chicken Starters' },
  { id: 2, name: 'Chinese Veg Starters' },
  { id: 3, name: 'Mutton Items' },
  { id: 4, name: 'Beef Items' },
  { id: 5, name: 'Indian Special Gravy' },
  { id: 6, name: 'Tandoori Chicken' },
  { id: 7, name: 'Veg Tikka' },
  { id: 8, name: 'Grill & Alfham' },
  { id: 9, name: 'Roti & Naan' },
  { id: 10, name: 'Parotta & Tawa Items' },
  { id: 11, name: 'Dosa' },
  { id: 12, name: 'Chicken & Chinese Rice' },
  { id: 13, name: 'Veg Rice & Noodles' },
  { id: 14, name: 'Chinese Noodles' },
  { id: 15, name: 'Fresh Juices' },
  { id: 16, name: 'Mojito & Soda' },
  { id: 17, name: 'Shakes & Desserts' },
  { id: 18, name: 'Sandwich & Burger' },
  { id: 19, name: 'Tea & Hot Beverages' }
],
  items:  [
  [1, 1, "Chicken 65", 18000, "https://images.pexels.com/photos/106343/pexels-photo-106343.jpeg"],
  [2, 1, "Chicken Kondattam", 20000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [3, 1, "Chicken Crispy", 20000, "https://images.pexels.com/photos/1352270/pexels-photo-1352270.jpeg"],
  [4, 1, "Japanese Chicken", 22000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [5, 1, "Garlic Chicken - Dry", 20000, "https://images.pexels.com/photos/2673353/pexels-photo-2673353.jpeg"],
  [6, 1, "Garlic Chicken - Gravy", 21000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [7, 1, "Ginger Chicken - Dry", 20000, "https://images.pexels.com/photos/2673353/pexels-photo-2673353.jpeg"],
  [8, 1, "Ginger Chicken - Gravy", 21000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [9, 1, "Chicken Dynamite", 23000, "https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg"],
  [10, 1, "Chicken Schezwan", 21000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [11, 1, "Bullet Chicken", 22000, "https://images.pexels.com/photos/106343/pexels-photo-106343.jpeg"],
  [12, 1, "Lemon Chicken", 21000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [13, 2, "Paneer 65", 17000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [14, 2, "Paneer Kondattam", 18000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [15, 2, "Paneer Manchurian - Dry", 18000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [16, 2, "Paneer Manchurian - Gravy", 19000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [17, 2, "Paneer Crispy", 18000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [18, 2, "Paneer Schezwan", 19000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [19, 2, "Paneer Dynamite", 20000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [20, 2, "Mushroom 65", 15000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [21, 2, "Mushroom Kondattam", 16000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [22, 2, "Mushroom Crispy", 16000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [23, 2, "Mushroom Schezwan", 17000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [24, 2, "Mushroom Manchurian - Dry", 16000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [25, 2, "Mushroom Manchurian - Gravy", 17000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [26, 3, "Mutton Chukka", 32000, "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg"],
  [27, 3, "Mutton Pepper Fry - Dry", 33000, "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg"],
  [28, 3, "Mutton Pepper - Gravy", 34000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [29, 3, "Mutton Crispy", 33000, "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg"],
  [30, 3, "Mutton Rogan Josh", 36000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [31, 3, "Mutton Kheema", 32000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [32, 4, "Beef Chilli Dry", 20000, "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg"],
  [33, 4, "Beef Chukka", 19000, "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg"],
  [34, 4, "Beef Pepper Fry", 20000, "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg"],
  [35, 4, "Beef Curry", 18000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [36, 4, "Beef Kondattam", 20000, "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg"],
  [37, 5, "Chicken Mughlai", 23000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [38, 5, "Chicken Punjabi", 23000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [39, 5, "Chicken Kolhapuri - Spicy", 24000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [40, 5, "Chicken Hyderabadi", 23000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [41, 5, "Chicken Tikka Masala", 25000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [42, 5, "Chicken Kheema", 24000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [43, 5, "Chicken Do Pyaza", 23000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [44, 5, "Chicken Reshmi Masala", 25000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [45, 5, "Chicken Angara", 24000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [46, 5, "Butter Chicken", 25000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [47, 6, "Chicken Tikka", 24000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [48, 6, "Chicken Malai Tikka", 26000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [49, 6, "Chicken Hariyali Tikka", 25000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [50, 6, "Chicken Reshmi Tikka", 26000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [51, 6, "Chicken Afghani Tikka", 27000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [52, 6, "Prawn Tikka", 35000, "https://images.pexels.com/photos/566345/pexels-photo-566345.jpeg"],
  [53, 6, "Chicken Seekh Kebab", 25000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [54, 6, "Chicken Tangdi Kebab", 26000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [55, 6, "Tandoori Chicken - Full", 48000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [56, 6, "Tandoori Chicken - Half", 26000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [57, 6, "Tandoori Chicken Malai - Full", 52000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [58, 6, "Tandoori Chicken Malai - Half", 28000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [59, 7, "Paneer Tikka", 22000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [60, 7, "Paneer Hariyali Tikka", 23000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [61, 7, "Paneer Malai Tikka", 24000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [62, 7, "Mushroom Tikka", 19000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [63, 7, "Mushroom Hariyali Tikka", 20000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [64, 7, "Mushroom Malai Tikka", 21000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [65, 8, "Grill Chicken - Full", 46000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [66, 8, "Grill Chicken - Half", 25000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [67, 8, "Pepper Grill - Full", 48000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [68, 8, "Pepper Grill - Half", 26000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [69, 8, "Honey Lemon Grill - Full", 50000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [70, 8, "Honey Lemon Grill - Half", 27000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [71, 8, "Chicken Alfham - Full", 46000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [72, 8, "Chicken Alfham - Half", 25000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [73, 8, "Pepper Alfham - Full", 48000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [74, 8, "Pepper Alfham - Half", 26000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [75, 8, "Honey Alfham - Full", 50000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [76, 8, "Honey Alfham - Half", 27000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [77, 8, "Peri Peri Alfham - Full", 50000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [78, 8, "Peri Peri Alfham - Half", 27000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [79, 8, "BBQ Alfham - Full", 50000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [80, 8, "BBQ Alfham - Half", 27000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [81, 9, "Plain Roti", 2000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [82, 9, "Butter Roti", 3000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [83, 9, "Plain Naan", 3500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [84, 9, "Butter Naan", 4500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [85, 9, "Garlic Naan", 5500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [86, 9, "Plain Kulcha", 4000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [87, 9, "Butter Kulcha", 5000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [88, 9, "Plain Rumali Roti", 3000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [89, 9, "Butter Rumali Roti", 4000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [90, 9, "Chicken Kheema Roti", 9000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [91, 10, "Normal Parotta", 1500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [92, 10, "Bun Parotta", 3000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [93, 10, "Nool Parotta", 2500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [94, 10, "Silvan Parotta", 3500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [95, 10, "Chicken Stuffed Parotta", 9000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [96, 10, "Chicken Kothu Parotta", 16000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [97, 10, "Egg Kothu Parotta", 12000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [98, 10, "Veg Kothu Parotta", 11000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [99, 10, "Yella Parotta", 4000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [100, 10, "Plain Chapati", 1500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [101, 10, "Butter Chapati", 2500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [102, 11, "Ghee Roast", 8000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [103, 11, "Plain Roast", 6000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [104, 11, "Onion Roast", 7000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [105, 11, "Podi Dosa", 7000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [106, 11, "Egg Dosa", 8000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [107, 11, "Kall Dosa", 3000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [108, 11, "Onion Uttapam", 9000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [109, 11, "Masala Dosa", 8000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [110, 12, "Chicken Rice", 17000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [111, 12, "Egg Rice", 14000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [112, 12, "Veg Rice", 13000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [113, 12, "Schezwan Chicken Rice", 19000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [114, 12, "Schezwan Veg Rice", 16000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [115, 12, "Singapore Chicken Rice", 20000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [116, 12, "Singapore Egg Rice", 17000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [117, 12, "Singapore Veg Rice", 16000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [118, 12, "Hong Kong Chicken Rice", 20000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [119, 12, "Hong Kong Egg Rice", 17000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [120, 12, "Hong Kong Veg Rice", 16000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [121, 12, "Garlic Chicken Rice", 19000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [122, 12, "Garlic Egg Rice", 16000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [123, 12, "Garlic Veg Rice", 15000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [124, 12, "Chicken Pulao", 20000, "https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg"],
  [125, 13, "Paneer Rice", 17000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [126, 13, "Paneer Noodles", 17000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [127, 13, "Paneer Schezwan Rice", 19000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [128, 13, "Paneer Schezwan Noodles", 19000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [129, 13, "Paneer Singapore Rice", 20000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [130, 13, "Paneer Singapore Noodles", 20000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [131, 13, "Paneer Hong Kong Rice", 20000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [132, 13, "Paneer Hong Kong Noodles", 20000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [133, 13, "Mushroom Rice", 15000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [134, 13, "Mushroom Noodles", 15000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [135, 13, "Mushroom Schezwan Rice", 17000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [136, 13, "Mushroom Schezwan Noodles", 17000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [137, 13, "Mushroom Singapore Rice", 18000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [138, 13, "Mushroom Singapore Noodles", 18000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [139, 13, "Mushroom Hong Kong Rice", 18000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [140, 13, "Mushroom Hong Kong Noodles", 18000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [141, 14, "Chicken Noodles", 17000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [142, 14, "Egg Noodles", 14000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [143, 14, "Veg Noodles", 13000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [144, 14, "Schezwan Chicken Noodles", 19000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [145, 14, "Schezwan Egg Noodles", 16000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [146, 14, "Schezwan Veg Noodles", 15000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [147, 14, "Singapore Chicken Noodles", 20000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [148, 14, "Singapore Egg Noodles", 17000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [149, 14, "Singapore Veg Noodles", 16000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [150, 14, "Garlic Chicken Noodles", 19000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [151, 14, "Garlic Egg Noodles", 16000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [152, 14, "Garlic Veg Noodles", 15000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [153, 14, "Hong Kong Chicken Noodles", 20000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [154, 14, "Hong Kong Veg Noodles", 16000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [155, 14, "American Chopsuey - Chicken", 22000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [156, 14, "American Chopsuey - Veg", 19000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [157, 15, "Pineapple Juice", 8000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [158, 15, "Orange Juice", 8000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [159, 15, "Apple Juice", 10000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [160, 15, "Mosambi Juice", 7000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [161, 15, "Papaya Juice", 7000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [162, 15, "Grapes Juice", 8000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [163, 15, "Pomegranate Juice", 11000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [164, 15, "Beetroot Juice", 7000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [165, 15, "Watermelon Juice", 6000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [166, 15, "Carrot Juice", 7000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [167, 15, "Mango Juice", 9000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [168, 15, "Lemon Juice", 3000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [169, 15, "Mint Lime Juice", 4000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [170, 16, "Strawberry Mojito", 12000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [171, 16, "Blueberry Mojito", 12000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [172, 16, "Blue Curacao Mojito", 11000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [173, 16, "Pineapple Mojito", 11000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [174, 16, "Watermelon Mojito", 11000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [175, 16, "Green Apple Mojito", 12000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [176, 16, "Blackberry Mojito", 12000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [177, 16, "Mint Lime Mojito", 9000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [178, 16, "Mint Lemon Soda", 4000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [179, 16, "Lemon Soda", 3000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [180, 16, "Kulki Soda", 4000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [181, 17, "Strawberry Shake", 11000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [182, 17, "Vanilla Shake", 10000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [183, 17, "Pista Shake", 12000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [184, 17, "Mango Shake", 12000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [185, 17, "Chocolate Shake", 12000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [186, 17, "Butterscotch Shake", 12000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [187, 17, "Sarjha Shake", 13000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [188, 17, "Oreo Shake", 13000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [189, 17, "Cold Boost", 11000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [190, 17, "Cold Coffee", 10000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [191, 17, "Rose Milk", 7000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [192, 17, "Black Currant Shake", 12000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [193, 17, "Royal Falooda", 15000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [194, 17, "SPL Falooda", 18000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [195, 17, "Fruit Salad", 10000, "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg"],
  [196, 18, "Chicken Sandwich", 11000, "https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg"],
  [197, 18, "Veg Sandwich", 8000, "https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg"],
  [198, 18, "Paneer Sandwich", 11000, "https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg"],
  [199, 18, "Mushroom Sandwich", 10000, "https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg"],
  [200, 18, "Chicken Burger", 13000, "https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg"],
  [201, 18, "Veg Burger", 10000, "https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg"],
  [202, 18, "Chicken Popcorn", 15000, "https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg"],
  [203, 18, "French Fries", 9000, "https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg"],
  [204, 18, "Fried Chicken", 18000, "https://images.pexels.com/photos/1352270/pexels-photo-1352270.jpeg"],
  [205, 19, "Normal Tea", 1500, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [206, 19, "Ginger Tea", 2000, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [207, 19, "Elaichi Tea", 2000, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [208, 19, "Coffee", 2000, "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg"],
  [209, 19, "Boost", 3000, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [210, 19, "Badam Milk", 4000, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [211, 19, "Horlicks", 3000, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [212, 19, "Sukku Milk", 2000, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [213, 19, "Parti Milk", 3000, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [214, 19, "Black Tea", 1200, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [215, 19, "Lemon Tea", 1500, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [216, 19, "Honey Tea", 2500, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [217, 19, "Green Tea", 2500, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [218, 19, "Black Coffee", 1500, "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg"]
].map(([id, category_id, name, price, image]) => ({ id, category_id, name, price, image: image || null, is_available: true })),
  zones: [{ id: 1, name: 'Indoor', sort: 1 }, { id: 2, name: 'Outdoor', sort: 2 }],
  tables: [[1, 1], [1, 2], [1, 3], [2, 4], [2, 5]].map(([zone_id, n]) => ({
    id: n, name: `Table ${String(n).padStart(2, '0')}`, zone_id, capacity: 4, shape: 'square', pos_x: null, pos_y: null,
    status: 'available', merged_into_id: null,
  })),
  orders: [],
  seq: 1,
}
// Demo history: two weeks of finished orders so the History page has something to show.
;(() => {
  let seed = 7
  const rnd = (n) => { seed = (seed * 9301 + 49297) % 233280; return Math.floor((seed / 233280) * n) }
  const past = []
  for (let day = 14; day >= 1; day--) {
    for (let k = 3 + rnd(4); k > 0; k--) {
      const at = new Date(); at.setDate(at.getDate() - day); at.setHours(11 + rnd(11), rnd(60), 0, 0)
      const items = Array.from({ length: 1 + rnd(4) }, () => {
        const m = db.items[rnd(db.items.length)]
        return { menu_item_id: m.id, name: m.name, unit_price: m.price, quantity: 1 + rnd(3), notes: '' }
      })
      const type = ['dine_in', 'dine_in', 'takeaway', 'delivery'][rnd(4)]
      const subtotal = items.reduce((t, i) => t + i.unit_price * i.quantity, 0), tax = taxOn(subtotal)
      const cancelled = rnd(12) === 0
      past.push({
        type, table_id: type === 'dine_in' ? 1 + rnd(db.tables.length) : null, notes: null, items, subtotal, tax,
        total: subtotal + tax, status: cancelled ? 'CANCELLED' : 'COMPLETED',
        payment_status: cancelled ? 'unpaid' : 'paid', paid: cancelled ? 0 : subtotal + tax, created_at: at.toISOString(),
      })
    }
  }
  past.sort((x, y) => x.created_at.localeCompare(y.created_at))
  for (const o of past) db.orders.unshift({ id: db.seq, number: `ORD-${1000 + db.seq++}`, ...o })
})()

const FLOW = { HELD: ['CONFIRMED'], NEW: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['PREPARING', 'CANCELLED'], PREPARING: ['READY'], READY: ['SERVED'], SERVED: ['COMPLETED'] }
const find = (id) => db.orders.find((o) => o.id === id)
export const CLEANING_MS = 5 * 60 * 1000
const BILL_KEY = 'pos.billTemplate'
// Same rules as backend/app/Support/Tables.php: a table that stops being occupied leaves its merge,
// and tables merged into it follow it.
const setTable = (t, status) => {
  if (status === 'occupied' && t.status !== 'occupied') t.occupied_at = new Date().toISOString()
  t.status = status
  t.cleaning_since = status === 'cleaning' ? new Date().toISOString() : null
  if (status === 'occupied') return
  t.occupied_at = null; t.merged_into_id = null
  for (const c of db.tables.filter((x) => x.merged_into_id === t.id)) setTable(c, status)
}
const OPEN = (o) => !['COMPLETED', 'CANCELLED', 'FAILED', 'MERGED'].includes(o.status)
// Same rules as split/merge in backend/app/Http/Controllers/Api/OrderController.php.
const RANK = { CONFIRMED: 1, PREPARING: 2, READY: 3, SERVED: 4, OUT_FOR_DELIVERY: 4 }
const orderFail = (msg) => { throw Object.assign(new Error(msg), { response: { status: 422, data: { message: msg } } }) }
const splittable = (o) => {
  if (!RANK[o.status]) orderFail(['NEW', 'HELD'].includes(o.status) ? `Send ${o.number} to the kitchen first.` : `${o.number} is ${o.status}.`)
  return o
}
const recalc = (o) => {
  o.subtotal = o.items.reduce((t, i) => t + i.unit_price * i.quantity, 0)
  o.tax = taxOn(o.subtotal); o.total = o.subtotal + o.tax
  o.paid = o.paid || 0
  o.payment_status = o.paid <= 0 ? 'unpaid' : o.paid >= o.total ? 'paid' : 'partial'
}
let lineSeq = 1
const cartLines = (items) => items.map((i) => {
  const m = db.items.find((x) => x.id === i.menu_item_id)
  return { ...i, id: lineSeq++, name: m.name, unit_price: m.price }
})
// Undo, same rules as backend/app/Support/Undo.php: snapshot what an action touches, and put it back
// only while those tables and orders are still exactly as the action left them.
const UNDO_MS = 10 * 60 * 1000
const undos = new Map()
let undoSeq = 1
const undoScope = (tables, orders) => {
  const t = new Set(tables)
  for (let n = -1; n !== t.size;) { n = t.size; db.tables.forEach((x) => x.merged_into_id && t.has(x.merged_into_id) && t.add(x.id)) }
  const o = new Set(db.orders.filter((x) => orders.includes(x.id) || (t.has(x.table_id) && OPEN(x))
    || orders.includes(x.split_from_id) || orders.includes(x.merged_into_id)).map((x) => x.id))
  return { tables: [...t], orders: [...o] }
}
const undoRows = ({ tables, orders }) => structuredClone({
  tables: db.tables.filter((x) => tables.includes(x.id)).sort((a, b) => a.id - b.id),
  orders: db.orders.filter((x) => orders.includes(x.id)).sort((a, b) => a.id - b.id),
})
const recorded = async (tables, orders, run) => {
  let scope = undoScope(tables, orders)
  const before = undoRows(scope)
  const result = await run()
  scope = undoScope(scope.tables, scope.orders)
  const token = `u${undoSeq++}`
  undos.set(token, { scope, before, after: JSON.stringify(undoRows(scope)), at: Date.now() })
  return { ...result, undo: token }
}
const held = (id) => {
  const o = find(id)
  if (o?.status !== 'HELD') orderFail(`${o?.number ?? 'Order'} isn't on hold.`)
  return o
}
const presentTable = (t) => ({ ...t, zone: db.zones.find((z) => z.id === t.zone_id)?.name ?? null })
const zoneRank = (t) => { const z = db.zones.find((x) => x.id === t.zone_id); return z ? [0, z.sort ?? 0, z.id] : [1, 0, 0] }
const tableFail = (msg) => { throw new Error(msg) }
const moveOrders = (from, to) => db.orders.filter((o) => o.table_id === from && OPEN(o)).forEach((o) => { o.table_id = to })

// Demo login mirrors the seeded admin in backend/database/seeders/RoleSeeder.php.
// Same catalog as backend/app/Support/Permissions.php, for demo mode.
const PERMISSIONS = [
  ['orders.view', 'View orders', 'Orders'],
  ['orders.create', 'Create orders', 'Orders'],
  ['orders.update', 'Change orders and mark them served', 'Orders'],
  ['orders.cancel', 'Cancel orders', 'Orders', true],
  ['payments.view', 'View payments', 'Payments'],
  ['payments.create', 'Take payments', 'Payments'],
  ['payments.update', 'Change payments', 'Payments'],
  ['payments.cancel', 'Void or refund payments', 'Payments', true],
  ['kitchen.view', 'Open the kitchen display', 'Kitchen'],
  ['kitchen.create', 'Send orders to the kitchen', 'Kitchen'],
  ['kitchen.update', 'Move tickets through the kitchen', 'Kitchen'],
  ['kitchen.cancel', 'Cancel tickets from the kitchen', 'Kitchen', true],
  ['tables.view', 'View tables', 'Tables'],
  ['tables.create', 'Add tables and zones and arrange the floor plan', 'Tables'],
  ['tables.update', 'Change table status, move and join tables', 'Tables'],
  ['tables.cancel', 'Remove tables and zones', 'Tables'],
  ['menu.view', 'View the menu', 'Menu'],
  ['menu.create', 'Add menu items and categories', 'Menu'],
  ['menu.update', 'Edit menu items and prices', 'Menu'],
  ['menu.cancel', 'Remove menu items and categories', 'Menu'],
  ['settings.view', 'Open the bill editor', 'Settings'],
  ['settings.create', 'Add settings', 'Settings'],
  ['settings.update', 'Edit the bill template', 'Settings', true],
  ['settings.cancel', 'Reset settings', 'Settings', true],
  ['reports.view', 'View reports and order history', 'Reports'],
  ['reports.create', 'Create and export reports', 'Reports'],
  ['reports.update', 'Edit reports', 'Reports'],
  ['reports.cancel', 'Delete reports', 'Reports'],
  ['team.view', 'View team members, roles and approvals', 'Team'],
  ['team.create', 'Add team members', 'Team'],
  ['team.update', 'Edit team members and role permissions', 'Team'],
  ['team.cancel', 'Deactivate team members', 'Team'],
  ['approvals.grant', 'Approve sensitive actions with a PIN', 'Approvals'],
].map(([key, label, group, approvable = false]) => ({ key, label, group, approvable }))
const ALL_KEYS = PERMISSIONS.map((p) => p.key)
const team = {
  roles: [
    { id: 1, name: 'admin', locked: true, permissions: ALL_KEYS },
    { id: 2, name: 'manager', locked: false, permissions: ALL_KEYS },
    { id: 3, name: 'cashier', locked: false, permissions: ['orders.view', 'orders.create', 'orders.update', 'orders.cancel', 'payments.view', 'payments.create', 'kitchen.create', 'tables.view', 'tables.update', 'menu.view'] },
    { id: 4, name: 'waiter', locked: false, permissions: ['orders.view', 'orders.create', 'orders.update', 'kitchen.create', 'tables.view', 'tables.update', 'menu.view'] },
    { id: 5, name: 'kitchen', locked: false, permissions: ['orders.view', 'kitchen.view', 'kitchen.update', 'tables.view', 'menu.view'] },
  ],
  members: [{ id: 1, name: 'Admin', email: 'admin@pos.local', role_id: 1, is_active: true, has_pin: true, grants: [], revokes: [] }],
  seq: 2,
}
const effective = (m) => {
  if (!m.is_active) return []
  const role = team.roles.find((r) => r.id === m.role_id)?.permissions ?? []
  return [...new Set([...role, ...m.grants])].filter((k) => !m.revokes.includes(k))
}
const presentMember = (m) => ({ ...m, role: team.roles.find((r) => r.id === m.role_id)?.name, permissions: effective(m) })
const MOCK_USER = { id: 1, name: 'Admin', email: 'admin@pos.local', role: 'admin', permissions: ALL_KEYS }
const AUTH_KEY = 'pos.mockUser'

const nextId = (list) => Math.max(0, ...list.map((x) => x.id)) + 1

const mock = {
  me: async () => {
    try { return sessionStorage.getItem(AUTH_KEY) ? { ...MOCK_USER } : null } catch { return null }
  },
  login: async ({ email, password }) => {
    if (email.trim().toLowerCase() !== MOCK_USER.email || password !== 'password') {
      throw Object.assign(new Error('These credentials do not match our records.'), { response: { status: 422 } })
    }
    try { sessionStorage.setItem(AUTH_KEY, JSON.stringify(MOCK_USER)) } catch {}
    return { ...MOCK_USER }
  },
  logout: async () => {
    try { sessionStorage.removeItem(AUTH_KEY) } catch {}
  },
  menu: async () => ({ categories: db.categories.map((c) => ({ ...c })), items: db.items.map((i) => ({ ...i })) }),
  createCategory: async (p) => {
    const c = { sort: Math.max(0, ...db.categories.map((x) => x.sort ?? 0)) + 1, ...p, id: nextId(db.categories) }
    db.categories.push(c)
    return { ...c }
  },
  updateCategory: async (id, p) => ({ ...Object.assign(db.categories.find((x) => x.id === id), p) }),
  deleteCategory: async (id) => {
    const n = db.items.filter((i) => i.category_id === id).length
    if (n) throw new Error(`This category still has ${n} item(s). Move or remove them first.`)
    db.categories = db.categories.filter((x) => x.id !== id)
  },
  createItem: async (p) => {
    const i = { description: null, image: null, prep_minutes: 10, station: null, is_available: true, ...p, id: nextId(db.items) }
    db.items.push(i)
    return { ...i }
  },
  updateItem: async (id, p) => ({ ...Object.assign(db.items.find((x) => x.id === id), p) }),
  deleteItem: async (id) => {
    if (db.orders.some((o) => o.items?.some((i) => i.menu_item_id === id))) {
      throw new Error("This item is on past orders, so it can't be deleted. Mark it unavailable instead.")
    }
    db.items = db.items.filter((x) => x.id !== id)
  },
  tables: async () => {
    // A table being cleaned frees itself once CLEANING_MS has passed.
    for (const t of db.tables) {
      if (t.status === 'cleaning' && Date.now() - Date.parse(t.cleaning_since) >= CLEANING_MS) setTable(t, 'available')
    }
    return [...db.tables].sort((a, b) => {
      const [x, y] = [zoneRank(a), zoneRank(b)]
      return x[0] - y[0] || x[1] - y[1] || x[2] - y[2] || a.id - b.id
    }).map(presentTable)
  },
  createTable: async (p) => {
    if (db.tables.some((x) => x.name === p.name)) tableFail('The name has already been taken.')
    const t = { zone_id: null, capacity: 2, shape: 'square', pos_x: null, pos_y: null, ...p,
      id: nextId(db.tables), status: 'available', merged_into_id: null, occupied_at: null, cleaning_since: null }
    db.tables.push(t)
    return presentTable(t)
  },
  updateTable: async (id, p) => {
    if (p.name && db.tables.some((x) => x.name === p.name && x.id !== id)) tableFail('The name has already been taken.')
    return presentTable(Object.assign(db.tables.find((x) => x.id === id), p))
  },
  deleteTable: async (id) => {
    const t = db.tables.find((x) => x.id === id)
    if (t.status === 'occupied') tableFail(`${t.name} has guests. Free it before removing it.`)
    if (db.orders.some((o) => o.table_id === id)) tableFail(`${t.name} is on past orders, so it can't be deleted. Mark it out of service instead.`)
    db.tables = db.tables.filter((x) => x.id !== id)
  },
  transferTable: async (id, toId) => {
    const from = db.tables.find((x) => x.id === id), to = db.tables.find((x) => x.id === toId)
    if (from.status !== 'occupied') tableFail(`${from.name} has no guests to move.`)
    if (from.merged_into_id) tableFail(`${from.name} is joined to another table. Move that table instead.`)
    if (to === from || !['available', 'reserved'].includes(to.status)) tableFail(`${to.name} isn't free.`)
    moveOrders(id, toId)
    Object.assign(to, { status: 'occupied', occupied_at: from.occupied_at ?? new Date().toISOString(), cleaning_since: null, merged_into_id: null })
    db.tables.filter((x) => x.merged_into_id === id).forEach((x) => { x.merged_into_id = toId })
    setTable(from, 'available')
    return presentTable(to)
  },
  mergeTables: async (id, ids) => {
    const head = db.tables.find((x) => x.id === id), others = ids.map((i) => db.tables.find((x) => x.id === i))
    const inUse = (t) => ['available', 'reserved', 'occupied'].includes(t.status)
    if (head.merged_into_id) tableFail(`${head.name} is joined to another table. Join onto that table instead.`)
    if (!inUse(head)) tableFail(`${head.name} isn't in use.`)
    for (const t of others) {
      if (t === head) tableFail(`Can't join ${t.name} to itself.`)
      if (t.merged_into_id) tableFail(`${t.name} is already joined to another table.`)
      if (!inUse(t)) tableFail(`${t.name} isn't in use.`)
    }
    if (head.status !== 'occupied') setTable(head, 'occupied')
    for (const t of others) {
      moveOrders(t.id, id)
      if (t.occupied_at && t.occupied_at < head.occupied_at) head.occupied_at = t.occupied_at // bill covers the earliest visit
      db.tables.filter((x) => x.merged_into_id === t.id).forEach((x) => { x.merged_into_id = id })
      Object.assign(t, { status: 'occupied', occupied_at: t.occupied_at ?? new Date().toISOString(), cleaning_since: null, merged_into_id: id })
    }
    return presentTable(head)
  },
  unmergeTable: async (id) => {
    const t = db.tables.find((x) => x.id === id)
    if (!t.merged_into_id) tableFail(`${t.name} isn't joined to another table.`)
    setTable(t, 'available')
    return presentTable(t)
  },
  zones: async () => [...db.zones].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id).map((z) => ({ ...z })),
  createZone: async (p) => {
    if (db.zones.some((z) => z.name === p.name)) tableFail('The name has already been taken.')
    const z = { sort: Math.max(0, ...db.zones.map((x) => x.sort ?? 0)) + 1, ...p, id: nextId(db.zones) }
    db.zones.push(z)
    return { ...z }
  },
  updateZone: async (id, p) => {
    if (p.name && db.zones.some((z) => z.name === p.name && z.id !== id)) tableFail('The name has already been taken.')
    return { ...Object.assign(db.zones.find((x) => x.id === id), p) }
  },
  deleteZone: async (id) => {
    const n = db.tables.filter((t) => t.zone_id === id).length
    if (n) tableFail(`This zone still has ${n} table(s). Move or remove them first.`)
    db.zones = db.zones.filter((x) => x.id !== id)
  },
  orders: async (status) => db.orders.filter((o) => !status || o.status === status).map((o) => ({ ...o })),
  order: async (id) => ({ ...find(id) }),
  history: async ({ from, to } = {}) => db.orders
    .filter((o) => (!from || localDay(o.created_at) >= from) && (!to || localDay(o.created_at) <= to))
    .map((o) => ({ ...o })),
  heldOrders: async () => db.orders.filter((o) => o.status === 'HELD').map((o) => ({ ...o })),
  createOrder: async ({ hold, ...p }) => {
    const o = {
      id: db.seq, number: `ORD-${1000 + db.seq++}`, type: p.type, table_id: p.type === 'dine_in' ? p.table_id : null,
      notes: p.notes || null, status: hold ? 'HELD' : 'NEW', items: cartLines(p.items), created_at: new Date().toISOString(),
    }
    recalc(o)
    db.orders.unshift(o)
    const t = !hold && db.tables.find((x) => x.id === o.table_id)
    if (t) {
      if (t.status !== 'occupied') t.occupied_at = o.created_at // start of this party's visit
      t.status = 'occupied'
    }
    return { ...o }
  },
  saveDraft: async (id, p) => {
    const o = held(id)
    Object.assign(o, { type: p.type, table_id: p.type === 'dine_in' ? p.table_id : null, notes: p.notes || null, items: cartLines(p.items) })
    recalc(o)
    return { ...o }
  },
  discardHeld: async (id) => {
    held(id)
    db.orders = db.orders.filter((o) => o.id !== id)
  },
  splitOrder: async (id, moves) => {
    const o = splittable(find(id))
    if (o.paid > 0) orderFail('This bill already has payments, so it can\'t be split.')
    let moving = 0
    for (const m of moves) {
      const l = o.items.find((i) => i.id === m.id) ?? orderFail('That item isn\'t on this order.')
      if (m.quantity > l.quantity) orderFail(`Only ${l.quantity} × ${l.name} on this order.`)
      moving += m.quantity
    }
    if (moving >= o.items.reduce((t, i) => t + i.quantity, 0)) orderFail('Leave at least one item on the original bill.')
    const n = { ...o, id: db.seq, number: `ORD-${1000 + db.seq++}`, notes: null, paid: 0, split_from_id: o.id, items: [] }
    for (const m of moves) {
      const l = o.items.find((i) => i.id === m.id)
      if (m.quantity === l.quantity) { o.items = o.items.filter((i) => i !== l); n.items.push(l) }
      else { l.quantity -= m.quantity; n.items.push({ ...l, id: lineSeq++, quantity: m.quantity }) }
    }
    recalc(o); recalc(n)
    db.orders.unshift(n)
    return { order: { ...o }, new_order: { ...n } }
  },
  mergeOrders: async (id, ids) => {
    const head = splittable(find(id))
    let status = head.status
    for (const i of ids) {
      if (i === id) orderFail(`Can't merge ${head.number} into itself.`)
      const o = splittable(find(i))
      if (o.table_id !== head.table_id || (!head.table_id && o.type !== head.type)) orderFail(`${o.number} isn't on the same table as ${head.number}.`)
      if (RANK[o.status] < RANK[status]) status = o.status
    }
    for (const o of ids.map(find)) {
      head.items.push(...o.items)
      head.paid = (head.paid || 0) + (o.paid || 0)
      Object.assign(o, { status: 'MERGED', merged_into_id: id, items: [], paid: 0 })
      recalc(o)
    }
    head.status = status
    recalc(head)
    return { ...head }
  },
  sendToKitchen: async (id) => mock.setStatus(id, 'CONFIRMED'),
  setStatus: async (id, status) => {
    const o = find(id)
    if (!FLOW[o.status]?.includes(status)) throw new Error(`Cannot move ${o.status} to ${status}`)
    if (status === 'COMPLETED' && o.payment_status !== 'paid') throw new Error('Order is not fully paid')
    if (o.status === 'HELD') {
      // A resumed cart is placed when it's sent, and only then seats the party.
      o.created_at = new Date().toISOString()
      const t = db.tables.find((x) => x.id === o.table_id)
      if (t && t.status !== 'occupied') { t.occupied_at = o.created_at; t.status = 'occupied' }
    }
    o.status = status
    if (status === 'COMPLETED') {
      const t = db.tables.find((x) => x.id === o.table_id)
      if (t) setTable(t, 'cleaning')
    }
    if (status === 'CANCELLED') {
      // Nothing was served, so a table left with no other open orders is simply free again.
      const t = db.tables.find((x) => x.id === o.table_id)
      const others = db.orders.some((x) => x !== o && x.table_id === o.table_id && !['COMPLETED', 'CANCELLED'].includes(x.status))
      if (t?.status === 'occupied' && !others) setTable(t, 'available')
    }
    return { ...o }
  },
  setType: async (id, type) => {
    const o = find(id)
    o.type = type
    return { ...o }
  },
  pay: async (id, payments) => {
    const o = find(id)
    if (o.status === 'HELD') orderFail('Send a held order before taking payment')
    if (o.status === 'MERGED') orderFail('Order was merged into another bill')
    o.paid = (o.paid || 0) + payments.reduce((t, p) => t + p.amount, 0)
    o.payment_status = o.paid >= o.total ? 'paid' : 'partial'
    return { ...o }
  },
  setTableStatus: async (id, status) => {
    const t = db.tables.find((x) => x.id === id)
    setTable(t, status)
    return presentTable(t)
  },
  // Kept in the browser so the layout survives reloads in demo mode.
  billTemplate: async () => {
    try { return JSON.parse(localStorage.getItem(BILL_KEY)) } catch { return null }
  },
  saveBillTemplate: async (t) => {
    try { localStorage.setItem(BILL_KEY, JSON.stringify(t)) } catch {}
    return t
  },
  team: async () => ({ members: team.members.map(presentMember), roles: team.roles.map((r) => ({ ...r })), permissions: PERMISSIONS }),
  createMember: async ({ password, pin, ...p }) => {
    if (team.members.some((m) => m.email === p.email)) throw new Error('The email has already been taken.')
    const m = { grants: [], revokes: [], is_active: true, ...p, id: team.seq++, has_pin: !!pin }
    team.members.push(m)
    return presentMember(m)
  },
  updateMember: async (id, { password, pin, ...p }) => {
    const m = team.members.find((x) => x.id === id)
    Object.assign(m, p)
    if (pin !== undefined) m.has_pin = pin !== null
    return presentMember(m)
  },
  saveRolePermissions: async (id, permissions) => {
    const r = team.roles.find((x) => x.id === id)
    r.permissions = [...permissions]
    return { ...r }
  },
  approvers: async () => [],
  approvals: async () => [],
  undo: async (token) => {
    const u = undos.get(token) ?? orderFail('Nothing to undo.')
    if (u.used) orderFail('That was already undone.')
    if (Date.now() - u.at > UNDO_MS) orderFail('Too late to undo: that was over 10 minutes ago.')
    const { tables, orders } = u.scope
    if (JSON.stringify(undoRows(undoScope(tables, orders))) !== u.after) {
      orderFail('Can\'t undo: these tables or bills changed since (kitchen, payments or another order). Fix it by hand instead.')
    }
    for (const t of u.before.tables) Object.assign(db.tables.find((x) => x.id === t.id), t)
    const keep = new Set(u.before.orders.map((o) => o.id))
    db.orders = db.orders.filter((o) => !orders.includes(o.id) || keep.has(o.id))
    for (const o of u.before.orders) {
      const i = db.orders.findIndex((x) => x.id === o.id)
      if (i >= 0) db.orders[i] = o
      else db.orders.unshift(o)
    }
    u.used = true
    return { undone: token }
  },
}
// Record the floor actions for undo.
const UNDOABLE = {
  pay: (id) => [[], [id]],
  splitOrder: (id) => [[], [id]],
  mergeOrders: (id, ids) => [[], [id, ...ids]],
  transferTable: (id, to) => [[id, to], []],
  mergeTables: (id, ids) => [[id, ...ids], []],
  setTableStatus: (id) => [[id], []],
}
for (const [name, scopeOf] of Object.entries(UNDOABLE)) {
  const run = mock[name]
  mock[name] = (...a) => recorded(...scopeOf(...a), () => run(...a))
}

export const api = import.meta.env.VITE_MOCK === 'false' ? real : mock
