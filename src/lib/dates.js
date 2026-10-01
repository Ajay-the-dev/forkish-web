// Calendar-day helpers in the browser's time zone, as YYYY-MM-DD (what <input type="date"> uses).
const pad = (n) => String(n).padStart(2, '0')
export const localDay = (d) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}
export const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return localDay(d) }
export const monthStart = () => { const d = new Date(); d.setDate(1); return localDay(d) }
