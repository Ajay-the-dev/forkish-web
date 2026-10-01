import { defineStore } from 'pinia'
import { api } from '../lib/api'
import { defaultTemplate, withDefaults } from '../lib/billTemplate'

export const useBillStore = defineStore('bill', {
  state: () => ({ template: defaultTemplate(), loaded: false }),
  actions: {
    async load() {
      if (this.loaded) return
      try { this.template = withDefaults(await api.billTemplate()) } catch { /* keep defaults */ }
      this.loaded = true
    },
    async save(t) {
      this.template = withDefaults(await api.saveBillTemplate(JSON.parse(JSON.stringify(t))))
    },
  },
})
