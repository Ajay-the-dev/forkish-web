import { onMounted, onUnmounted, ref } from 'vue'

// A row's options popup (phones), fixed-positioned so a table's scroll box doesn't clip it.
// Clicks inside the popup and on its button must stop propagation; scroll is captured since it doesn't bubble.
export function useRowMenu() {
  const menuFor = ref(null), menuPos = ref({})
  const closeMenu = () => { menuFor.value = null }
  const openMenu = (row, e) => {
    if (menuFor.value?.id === row.id) return closeMenu()
    const r = e.currentTarget.getBoundingClientRect()
    const below = r.bottom + 180 < window.innerHeight
    menuPos.value = { right: `${window.innerWidth - r.right}px`, ...(below ? { top: `${r.bottom + 4}px` } : { bottom: `${window.innerHeight - r.top + 4}px` }) }
    menuFor.value = row
  }
  const onDocEvent = (e) => { if (e.type !== 'keydown' || e.key === 'Escape') closeMenu() }
  const listen = (on) => {
    const m = on ? 'addEventListener' : 'removeEventListener'
    document[m]('click', onDocEvent); document[m]('keydown', onDocEvent)
    window[m]('scroll', onDocEvent, true); window[m]('resize', onDocEvent)
  }
  onMounted(() => listen(true))
  onUnmounted(() => listen(false))
  return { menuFor, menuPos, openMenu, closeMenu }
}
