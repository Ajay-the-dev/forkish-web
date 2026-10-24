<template>
  <Transition name="fade">
    <div v-if="open" class="modal" @keydown.esc="dismiss">
      <div class="modal__backdrop" @click="dismiss" />
      <form class="modal__card approval" role="dialog" aria-modal="true" aria-labelledby="approval-title" @submit.prevent="submit">
        <header class="modal__head">
          <span class="approval__mark"><AppIcon name="shield" /></span>
          <div>
            <h2 id="approval-title" class="modal__title">Manager approval</h2>
            <p class="modal__subtitle">{{ action }}</p>
          </div>
          <button type="button" class="modal__close" aria-label="Close" @click="dismiss"><AppIcon name="x" /></button>
        </header>

        <p v-if="error" class="form-error" role="alert">{{ error }}</p>

        <p v-if="!loading && !approvers.length" class="approval__none">
          Nobody on the team can approve this yet. A manager needs a PIN, set on the Team screen.
        </p>
        <template v-else>
          <label class="form-label" for="approval-who">Approved by</label>
          <select id="approval-who" v-model="approverId" class="field approval__who" :disabled="busy || loading" required>
            <option v-for="a in approvers" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>

          <label class="form-label" for="approval-pin">Their PIN</label>
          <input id="approval-pin" ref="pinInput" v-model="pin" class="text-field approval__pin" type="password"
            inputmode="numeric" pattern="\d*" maxlength="6" autocomplete="off" placeholder="••••" :disabled="busy" required>
        </template>

        <footer class="modal__foot">
          <button type="button" class="btn-soft" @click="dismiss">Cancel</button>
          <button type="submit" class="btn-cta modal__primary" :disabled="busy || !approverId || pin.length < 4">
            {{ busy ? 'Checking…' : 'Approve' }}
          </button>
        </footer>
      </form>
    </div>
  </Transition>
</template>

<script setup>
import { nextTick, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import { api, onApprovalRequired } from '../lib/api'

// Opened by the API layer whenever the server answers "approval_required".
const open = ref(false)
const action = ref('')
const approvers = ref([])
const approverId = ref(null)
const pin = ref('')
const error = ref('')
const busy = ref(false)
const loading = ref(false)
const pinInput = ref(null)
let pending = null // { retry, resolve, reject }

onApprovalRequired((req, retry) => new Promise((resolve, reject) => {
  if (pending) return resolve(null) // one approval at a time
  pending = { retry, resolve, reject }
  action.value = req.action ? `To: ${req.action}` : req.message
  error.value = ''
  pin.value = ''
  open.value = true
  loading.value = true
  api.approvers(req.permission)
    .then((list) => {
      approvers.value = list
      if (!list.some((a) => a.id === approverId.value)) approverId.value = list[0]?.id ?? null
    })
    .catch(() => { approvers.value = [] })
    .finally(() => { loading.value = false; nextTick(() => pinInput.value?.focus()) })
}))

const close = () => { open.value = false; pending = null }

function dismiss() {
  if (busy.value || !pending) return
  const { resolve } = pending
  close()
  resolve(null)
}

async function submit() {
  if (!pending) return
  busy.value = true
  error.value = ''
  try {
    const res = await pending.retry({ approver_id: approverId.value, pin: pin.value })
    const { resolve } = pending
    close()
    resolve(res)
  } catch (e) {
    const data = e.response?.data
    if (data?.approval_required) { // wrong PIN or too many tries: stay open and let them try again
      error.value = data.message
      pin.value = ''
      nextTick(() => pinInput.value?.focus())
    } else {
      const { reject } = pending
      close()
      reject(e)
    }
  } finally {
    busy.value = false
  }
}
</script>
