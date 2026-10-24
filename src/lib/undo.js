import { reactive } from 'vue'
import { api, errorMessage } from './api'

// Recent floor actions that can be undone, newest last. Each holds the undo tokens its API calls returned
// (settling a table pays several orders, so several tokens). The server keeps tokens for 10 minutes.
const WINDOW_MS = 10 * 60 * 1000
export const undoable = reactive({ items: [], error: '' })
let seq = 1

const prune = () => { undoable.items = undoable.items.filter((e) => Date.now() - e.at < WINDOW_MS) }

// Remember an action under a label shown in the toast, from the API results it produced.
export function remember(label, ...results) {
  const tokens = results.flat().map((r) => r?.undo).filter(Boolean)
  if (!tokens.length) return
  prune()
  undoable.error = ''
  undoable.items.push({ id: seq++, label, tokens, at: Date.now() })
}

export const latest = () => { prune(); return undoable.items.at(-1) ?? null }
export const forget = (entry) => { undoable.items = undoable.items.filter((e) => e !== entry) }

// Undo the newest action, its API calls in reverse. Returns true when it was fully undone.
export async function undoLatest() {
  const e = latest()
  if (!e) return false
  undoable.error = ''
  try {
    while (e.tokens.length) {
      await api.undo(e.tokens.at(-1))
      e.tokens.pop()
    }
    forget(e)
    return true
  } catch (err) {
    const m = errorMessage(err)
    if (m) undoable.error = m
    if (err?.response?.status !== 403) forget(e) // can't be undone any more; a missing permission may be approved next time
    return false
  }
}
