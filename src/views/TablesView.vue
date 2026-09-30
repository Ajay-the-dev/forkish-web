<template>
  <div class="page">
    <div class="stat-grid">
      <div v-for="s in stats" :key="s.status" class="stat-card" :class="`stat-card--${s.status}`">
        <span class="stat-card__icon"><AppIcon :name="s.icon" /></span>
        <div>
          <span class="stat-card__label">{{ s.label }}</span>
          <strong class="stat-card__value">{{ count(s.status) }}</strong>
        </div>
      </div>
    </div>

    <section v-for="(list, zone) in zones" :key="zone" class="zone">
      <header class="zone__head">
        <h2 class="zone__title">{{ zone }}</h2>
        <span class="zone__count">{{ list.filter((t) => t.status === 'available').length }} of {{ list.length }} free</span>
      </header>
      <div class="table-grid">
        <button v-for="t in list" :key="t.id" class="table-tile" :class="`table-tile--${t.status}`"
          :disabled="t.status !== 'available'" :title="t.status === 'available' ? 'Start order' : null" @click="pick(t)">
          <span class="table-tile__name">{{ t.name }}</span>
          <span class="table-tile__visual"><AppIcon :name="icons[t.status] || 'users'" /></span>
          <span class="table-tile__status"><span class="status-dot"></span>{{ t.status.replace(/_/g, ' ') }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { usePosStore } from '../stores/pos'

const pos = usePosStore(), router = useRouter()
const icons = { available: 'check', occupied: 'users', reserved: 'calendar', cleaning: 'sparkles', out_of_service: 'ban' }
const stats = [
  { status: 'available', label: 'Available', icon: 'check' },
  { status: 'occupied', label: 'Occupied', icon: 'users' },
  { status: 'reserved', label: 'Reserved', icon: 'calendar' },
  { status: 'cleaning', label: 'Cleaning', icon: 'sparkles' },
]

onMounted(pos.load)
const zones = computed(() => pos.tables.reduce((z, t) => ((z[t.zone || 'Other'] ??= []).push(t), z), {}))
const count = (status) => pos.tables.filter((t) => t.status === status).length
const pick = (t) => { pos.type = 'dine_in'; pos.tableId = t.id; router.push('/pos') }
</script>
