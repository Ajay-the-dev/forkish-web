import { computed, ref } from 'vue'

// Reordering for lists kept in a `sort` field (categories, zones). Pointer-driven so it works with
// touch as well as a mouse; rows (`tr[data-id]`) are reshuffled live while dragging and saved as
// sort = 1..n on release. `persist` gets the changed [row, sort] pairs after they're applied locally.
export function useDragSort(sorted, persist) {
  const dragId = ref(null), dragOrder = ref(null), reordering = ref(false)

  // `sorted` while idle, the live drag order while dragging.
  const ordered = computed(() => {
    if (!dragOrder.value) return sorted.value
    const byId = new Map(sorted.value.map((x) => [x.id, x]))
    return dragOrder.value.map((id) => byId.get(id)).filter(Boolean)
  })

  function dragStart(e, row) {
    if (e.button !== 0 || reordering.value) return
    e.preventDefault()
    dragId.value = row.id
    dragOrder.value = sorted.value.map((x) => x.id)
    const move = (ev) => {
      const tr = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('tr[data-id]')
      const overId = tr && Number(tr.dataset.id)
      if (!overId || overId === dragId.value) return
      const ids = dragOrder.value.filter((id) => id !== dragId.value)
      const at = ids.indexOf(overId) + (dragOrder.value.indexOf(overId) > dragOrder.value.indexOf(dragId.value) ? 1 : 0)
      ids.splice(at, 0, dragId.value)
      dragOrder.value = ids
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      const ids = dragOrder.value
      dragId.value = null
      commit(ids)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  // Keyboard: arrow keys on the grip move a row one place.
  function nudge(row, by) {
    const ids = sorted.value.map((x) => x.id)
    const from = ids.indexOf(row.id), to = from + by
    if (to < 0 || to >= ids.length || reordering.value) return
    ids.splice(to, 0, ids.splice(from, 1)[0])
    commit(ids)
  }

  async function commit(ids) {
    const byId = new Map(sorted.value.map((x) => [x.id, x]))
    const changed = ids.map((id, i) => [byId.get(id), i + 1]).filter(([x, sort]) => x && x.sort !== sort)
    if (!changed.length) { dragOrder.value = null; return }
    changed.forEach(([x, sort]) => { x.sort = sort }) // optimistic, so the row doesn't jump back
    dragOrder.value = null
    reordering.value = true
    try { await persist(changed) } finally { reordering.value = false }
  }

  return { dragId, reordering, ordered, dragStart, nudge }
}
