<template>
  <div class="page team">
    <div class="team__toolbar">
      <div class="segmented" role="tablist" aria-label="Team sections">
        <button v-for="t in tabs" :key="t.key" class="segmented__btn" role="tab" :aria-selected="tab === t.key"
          :class="{ 'is-active': tab === t.key }" @click="tab = t.key">{{ t.label }}</button>
      </div>
      <template v-if="tab === 'members'">
        <label class="search team__search">
          <AppIcon name="search" />
          <input v-model.trim="q" type="search" placeholder="Name, email or role…" aria-label="Search team" />
        </label>
        <button class="btn-soft btn-soft--brand" @click="edit(null)"><AppIcon name="plus" />Add member</button>
      </template>
    </div>

    <p v-if="loadError" class="form-error">{{ loadError }}</p>

    <!-- Members -->
    <section v-if="tab === 'members'" class="member-grid">
      <article v-for="m in shownMembers" :key="m.id" class="member-card" :class="{ 'is-inactive': !m.is_active }">
        <span class="member-card__avatar">{{ initials(m.name) }}</span>
        <div class="member-card__body">
          <strong class="member-card__name">{{ m.name }}<span v-if="m.id === auth.user?.id" class="member-card__you">You</span></strong>
          <span class="member-card__email">{{ m.email }}</span>
          <div class="member-card__tags">
            <span class="tag tag--brand">{{ m.role || 'No role' }}</span>
            <span v-if="!m.is_active" class="tag tag--danger">Inactive</span>
            <span v-if="m.has_pin" class="tag" title="Can enter a PIN to approve actions"><AppIcon name="key" />PIN</span>
            <span v-if="m.grants.length + m.revokes.length" class="tag tag--warning"
              :title="overrideTitle(m)">{{ m.grants.length + m.revokes.length }} custom</span>
          </div>
        </div>
        <button class="member-card__edit" :aria-label="`Edit ${m.name}`" title="Edit" @click="edit(m)"><AppIcon name="edit" /></button>
      </article>
      <div v-if="loaded && !shownMembers.length" class="empty">
        <AppIcon name="users" />
        <strong>No one matches “{{ q }}”</strong>
      </div>
    </section>

    <!-- Roles -->
    <section v-else-if="tab === 'roles'" class="roles">
      <p class="team__hint">What each role can do. Changes save straight away and apply to everyone with that role,
        except where a person has their own tweaks. <AppIcon name="shield" /> marks actions that can be done
        without the permission when a manager enters their PIN.</p>
      <div class="roles__scroll">
        <table class="roles__table">
          <thead>
            <tr>
              <th scope="col">Permission</th>
              <th v-for="r in roles" :key="r.id" scope="col">{{ r.name }}</th>
            </tr>
          </thead>
          <tbody v-for="g in groups" :key="g.name">
            <tr class="roles__group"><th :colspan="roles.length + 1" scope="colgroup">{{ g.name }}</th></tr>
            <tr v-for="p in g.permissions" :key="p.key">
              <th scope="row">
                <span class="roles__label">{{ p.label }}<AppIcon v-if="p.approvable" name="shield" class="roles__shield" /></span>
              </th>
              <td v-for="r in roles" :key="r.id">
                <input type="checkbox" class="form-check-input" :checked="r.permissions.includes(p.key)"
                  :disabled="r.locked || savingRole === r.id" :aria-label="`${r.name}: ${p.label}`"
                  :title="r.locked ? 'Admins always have every permission' : null" @change="toggleRole(r, p.key)">
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="roleError" class="form-error">{{ roleError }}</p>
    </section>

    <!-- Approval log -->
    <section v-else class="approval-log">
      <p class="team__hint">The last 50 actions a manager approved with their PIN.</p>
      <ul v-if="approvals.length" class="approval-log__list">
        <li v-for="a in approvals" :key="a.id" class="approval-log__row">
          <span class="approval-log__icon"><AppIcon name="shield" /></span>
          <div class="approval-log__text">
            <strong>{{ a.action }}<span v-if="a.subject"> · {{ a.subject }}</span></strong>
            <small>{{ a.requested_by }} · approved by {{ a.approved_by }}</small>
          </div>
          <time class="approval-log__time" :datetime="a.created_at">{{ when(a.created_at) }}</time>
        </li>
      </ul>
      <div v-else class="empty">
        <AppIcon name="shield" />
        <strong>No approvals yet</strong>
      </div>
    </section>

    <!-- Add / edit member -->
    <Transition name="fade">
      <div v-if="form" class="modal" @keydown.esc="form = null">
        <div class="modal__backdrop" @click="form = null" />
        <form class="modal__card modal__card--wide" role="dialog" aria-modal="true" aria-labelledby="member-title"
          novalidate @submit.prevent="saveMember">
          <header class="modal__head">
            <div>
              <h2 id="member-title" class="modal__title">{{ form.id ? `Edit ${form.original.name}` : 'Add team member' }}</h2>
              <p class="modal__subtitle">{{ form.id ? 'Update their details, role and access.' : 'They sign in with this email and password.' }}</p>
            </div>
            <button type="button" class="modal__close" aria-label="Close" @click="form = null"><AppIcon name="x" /></button>
          </header>

          <div class="modal__body">
            <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

            <div class="form-grid">
              <div>
                <label class="form-label" for="m-name">Name</label>
                <input id="m-name" v-model.trim="form.name" class="text-field" required maxlength="100" autocomplete="off">
              </div>
              <div>
                <label class="form-label" for="m-email">Email</label>
                <input id="m-email" v-model.trim="form.email" class="text-field" type="email" required autocomplete="off">
              </div>
              <div>
                <label class="form-label" for="m-password">{{ form.id ? 'New password' : 'Password' }}</label>
                <input id="m-password" v-model="form.password" class="text-field" type="password" autocomplete="new-password"
                  :placeholder="form.id ? 'Leave blank to keep' : 'At least 8 characters'" minlength="8">
              </div>
              <div>
                <label class="form-label" for="m-role">Role</label>
                <select id="m-role" v-model="form.role_id" class="field" required @change="tidyOverrides">
                  <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
                </select>
              </div>
              <div>
                <label class="form-label" for="m-pin">Approval PIN <small>(4–6 digits)</small></label>
                <input id="m-pin" v-model="form.pin" class="text-field" type="password" inputmode="numeric" maxlength="6"
                  autocomplete="new-password" :disabled="form.clearPin"
                  :placeholder="form.original?.has_pin ? 'Leave blank to keep current PIN' : 'Optional'">
                <label v-if="form.original?.has_pin" class="form-check-inline">
                  <input v-model="form.clearPin" type="checkbox" class="form-check-input"> Remove PIN
                </label>
              </div>
              <div v-if="form.id">
                <span class="form-label">Status</span>
                <label class="switch">
                  <input v-model="form.is_active" type="checkbox" :disabled="form.id === auth.user?.id">
                  <span class="switch__track" aria-hidden="true"></span>
                  {{ form.is_active ? 'Active, can sign in' : 'Inactive, cannot sign in' }}
                </label>
              </div>
            </div>

            <div class="perm-list">
              <div class="perm-list__head">
                <h3>Permissions</h3>
                <button v-if="form.grants.length || form.revokes.length" type="button" class="link-btn"
                  @click="form.grants = []; form.revokes = []">Reset to role</button>
              </div>
              <p class="team__hint">Starts from the <strong>{{ roleOf(form.role_id)?.name }}</strong> role. Switch anything on or off for this person only.</p>
              <div v-for="g in groups" :key="g.name" class="perm-list__group">
                <span class="perm-list__group-name">{{ g.name }}</span>
                <label v-for="p in g.permissions" :key="p.key" class="perm-row">
                  <input type="checkbox" class="form-check-input" :checked="formHas(p.key)" @change="togglePerson(p.key)">
                  <span class="perm-row__label">{{ p.label }}<AppIcon v-if="p.approvable" name="shield" class="roles__shield" /></span>
                  <span v-if="form.grants.includes(p.key)" class="tag tag--success">Added</span>
                  <span v-else-if="form.revokes.includes(p.key)" class="tag tag--danger">Removed</span>
                </label>
              </div>
            </div>
          </div>

          <footer class="modal__foot">
            <button type="button" class="btn-soft" @click="form = null">Cancel</button>
            <button type="submit" class="btn-cta modal__primary" :disabled="saving">
              {{ saving ? 'Saving…' : form.id ? 'Save changes' : 'Add member' }}
            </button>
          </footer>
        </form>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { api, errorMessage } from '../lib/api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const tabs = [
  { key: 'members', label: 'Members' },
  { key: 'roles', label: 'Roles' },
  { key: 'approvals', label: 'Approval log' },
]
const tab = ref('members')
const q = ref('')

const members = ref([])
const roles = ref([])
const permissions = ref([])
const approvals = ref([])
const loaded = ref(false)
const loadError = ref('')

async function load() {
  try {
    const t = await api.team()
    console.log(t);
    
    members.value = t.members; roles.value = t.roles; permissions.value = t.permissions
    loadError.value = ''
  } catch (e) { loadError.value = errorMessage(e) }
  loaded.value = true
}
onMounted(load)
watch(tab, async (t) => {
  if (t === 'approvals') { try { approvals.value = await api.approvals() } catch (e) { loadError.value = errorMessage(e) } }
})

const groups = computed(() => {
  const by = new Map()
  for (const p of permissions.value) {
    if (!by.has(p.group)) by.set(p.group, [])
    by.get(p.group).push(p)
  }
  return [...by].map(([name, list]) => ({ name, permissions: list }))
})
const label = (key) => permissions.value.find((p) => p.key === key)?.label ?? key
const roleOf = (id) => roles.value.find((r) => r.id === id)

const shownMembers = computed(() => {
  const s = q.value.toLowerCase()
  return s ? members.value.filter((m) => [m.name, m.email, m.role].some((v) => v?.toLowerCase().includes(s))) : members.value
})
const initials = (n) => (n || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
const overrideTitle = (m) => [...m.grants.map((k) => `+ ${label(k)}`), ...m.revokes.map((k) => `− ${label(k)}`)].join('\n')
const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const when = (iso) => (iso ? dateFmt.format(new Date(iso)) : '')

// ---- Roles tab: each checkbox saves that role right away ------------------------
const savingRole = ref(null)
const roleError = ref('')
async function toggleRole(role, key) {
  const before = role.permissions
  role.permissions = before.includes(key) ? before.filter((k) => k !== key) : [...before, key]
  savingRole.value = role.id
  roleError.value = ''
  try {
    Object.assign(role, await api.saveRolePermissions(role.id, role.permissions))
    await load() // members' effective permissions changed too
    if (auth.user?.role === role.name) auth.refresh()
  } catch (e) {
    role.permissions = before
    roleError.value = errorMessage(e)
  } finally { savingRole.value = null }
}

// ---- Member form -------------------------------------------------------------
const form = ref(null)
const formError = ref('')
const saving = ref(false)

function edit(m) {
  formError.value = ''
  form.value = m
    ? { id: m.id, original: m, name: m.name, email: m.email, password: '', role_id: m.role_id, pin: '', clearPin: false,
        is_active: m.is_active, grants: [...m.grants], revokes: [...m.revokes] }
    : { id: null, original: null, name: '', email: '', password: '', role_id: roles.value.find((r) => r.name === 'waiter')?.id ?? roles.value[0]?.id,
        pin: '', clearPin: false, is_active: true, grants: [], revokes: [] }
}

const rolePerms = () => roleOf(form.value.role_id)?.permissions ?? []
const formHas = (key) => (rolePerms().includes(key) || form.value.grants.includes(key)) && !form.value.revokes.includes(key)
function togglePerson(key) {
  const f = form.value
  const drop = (list) => list.filter((k) => k !== key)
  if (formHas(key)) f.grants.includes(key) ? (f.grants = drop(f.grants)) : f.revokes.push(key)
  else f.revokes.includes(key) ? (f.revokes = drop(f.revokes)) : f.grants.push(key)
}
// After a role change, drop tweaks that now match the role anyway.
function tidyOverrides() {
  const role = rolePerms()
  form.value.grants = form.value.grants.filter((k) => !role.includes(k))
  form.value.revokes = form.value.revokes.filter((k) => role.includes(k))
}

function validate(f) {
  if (!f.name) return 'Enter a name.'
  if (!/^\S+@\S+\.\S+$/.test(f.email)) return 'Enter a valid email.'
  if (!f.id && f.password.length < 8) return 'The password must be at least 8 characters.'
  if (f.id && f.password && f.password.length < 8) return 'The new password must be at least 8 characters.'
  if (f.pin && !/^\d{4,6}$/.test(f.pin)) return 'The PIN must be 4 to 6 digits.'
  return ''
}

async function saveMember() {
  const f = form.value
  formError.value = validate(f)
  if (formError.value) return
  const payload = { name: f.name, email: f.email, role_id: f.role_id, grants: f.grants, revokes: f.revokes }
  if (f.password) payload.password = f.password
  if (f.clearPin) payload.pin = null
  else if (f.pin) payload.pin = f.pin
  if (f.id) payload.is_active = f.is_active

  saving.value = true
  try {
    if (f.id) await api.updateMember(f.id, payload)
    else await api.createMember(payload)
    form.value = null
    await load()
    if (f.id === auth.user?.id) auth.refresh()
  } catch (e) {
    const errors = e.response?.data?.errors
    formError.value = errors ? Object.values(errors).flat().join(' ') : errorMessage(e)
  } finally { saving.value = false }
}
</script>
