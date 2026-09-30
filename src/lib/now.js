import { onMounted, onUnmounted, ref } from 'vue'

// Reactive "current time" for clocks and elapsed-time labels.
export function useNow(interval = 1000) {
  const now = ref(Date.now())
  let timer
  onMounted(() => { timer = setInterval(() => (now.value = Date.now()), interval) })
  onUnmounted(() => clearInterval(timer))
  return now
}
