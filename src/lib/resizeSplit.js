import { ref } from 'vue'

// Draggable divider between a list column and its preview panel (`menu-admin--resizable`).
// The list width is remembered per browser under `key`.
export function useResizeSplit(key, { min = 260, minPanel = 280, initial = 440 } = {}) {
  const root = ref(null), resizing = ref(false)
  const listW = ref((() => { try { return Number(localStorage.getItem(key)) || initial } catch { return initial } })())
  const maxList = () => Math.max(min, (root.value?.clientWidth ?? 1200) - minPanel)
  const setListW = (w) => {
    listW.value = Math.round(Math.min(maxList(), Math.max(min, w)))
    try { localStorage.setItem(key, String(listW.value)) } catch { /* storage unavailable */ }
  }
  function resizeStart(e) {
    if (e.button !== 0) return
    e.preventDefault()
    const left = root.value.getBoundingClientRect().left
    const move = (ev) => setListW(ev.clientX - left)
    const end = () => {
      resizing.value = false
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end)
    }
    resizing.value = true
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end)
  }
  return { root, listW, resizing, minList: min, defaultList: initial, maxList, setListW, resizeStart }
}
