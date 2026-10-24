import { defineStore } from 'pinia'
import { api } from '../lib/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null, checked: false }),
  getters: {
    loggedIn: (s) => !!s.user,
    // can('orders.cancel'): whether the signed-in user holds a permission (role + personal tweaks).
    can: (s) => (key) => !!s.user?.permissions?.includes(key),
  },
  actions: {
    // Asks the server once per page load whether a session already exists.
    async ensure() {
      if (this.checked) return
      try { this.user = await api.me() } catch { this.user = null }
      this.checked = true
    },
    async login(email, password, remember = false) {
      this.user = await api.login({ email, password, remember })
      this.checked = true
    },
    // Re-read permissions after the Team screen changes the signed-in user's own access.
    async refresh() {
      try { this.user = await api.me() } catch { /* keep what we have */ }
    },
    async logout() {
      try { await api.logout() } catch {} // the local session ends even if the server is unreachable
      this.clear()
    },
    clear() {
      this.user = null
      this.checked = true
    },
  },
})
