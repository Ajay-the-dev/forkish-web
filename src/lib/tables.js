// Shared by the table management screens and the Tables page.

export const SHAPES = [
  { key: 'square', label: 'Square', hint: 'Couples and fours' },
  { key: 'round', label: 'Round', hint: 'Groups that chat' },
  { key: 'rect', label: 'Long', hint: 'Six or more, booths' },
]

export const STATUSES = [
  { key: 'available', label: 'Available', icon: 'check' },
  { key: 'occupied', label: 'Occupied', icon: 'users' },
  { key: 'reserved', label: 'Reserved', icon: 'calendar' },
  { key: 'cleaning', label: 'Cleaning', icon: 'sparkles' },
  { key: 'out_of_service', label: 'Out of service', icon: 'ban' },
]
export const statusLabel = (s) => STATUSES.find((x) => x.key === s)?.label ?? s

// Statuses staff may set by hand; occupied comes from orders, and leaving it goes through cleaning.
export const MANUAL_STATUSES = ['available', 'reserved', 'cleaning', 'out_of_service']

// A table merged into another for one party; its orders and bill live on the head table.
export const joinedTo = (t, tables) => (t.merged_into_id ? tables.find((x) => x.id === t.merged_into_id) : null)
export const joinedTables = (t, tables) => tables.filter((x) => x.merged_into_id === t.id)

// Where a table sits on its zone's floor plan, in % of the plan. Tables not placed yet are
// laid out in rows (a fixed slot each, so dragging one doesn't shuffle the rest) so a new
// zone looks sensible before anyone arranges it.
const COLS = 5
export function planPosition(t, zoneTables) {
  if (t.pos_x != null && t.pos_y != null) return { x: t.pos_x, y: t.pos_y }
  const i = zoneTables.indexOf(t)
  return { x: 12 + (i % COLS) * 19, y: 16 + Math.floor(i / COLS) * 26 }
}

// "12m" / "1h 5m" since an ISO timestamp, against a ticking `now` (ms). `short` fits a floor-plan tile.
export const elapsed = (since, now, short = false) => {
  const m = Math.floor((now - Date.parse(since)) / 60000)
  return m < 1 ? (short ? '<1m' : 'Just now') : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
}

// The current party's open orders on a table (skipping anything from before it was last freed), with bill totals.
// Orders that aren't on a table's live bill: finished, folded into another bill, or a cart parked on the POS.
export const OFF_BILL = ['COMPLETED', 'CANCELLED', 'FAILED', 'MERGED', 'HELD']
export const balance = (o) => (o.payment_status === 'paid' ? 0 : Math.max((o.total ?? 0) - (o.paid ?? 0), 0))
export function openVisit(table, orders) {
  const open = orders.filter((o) => o.table_id === table.id && !OFF_BILL.includes(o.status)
    && (!table.occupied_at || !o.created_at || o.created_at >= table.occupied_at))
  return {
    orders: open,
    total: open.reduce((t, o) => t + (o.total ?? 0), 0),
    due: open.reduce((t, o) => t + balance(o), 0),
  }
}
