<template>
  <div class="app-shell">
    <!-- Desktop sidebar -->
    <aside class="sidebar" :class="{ 'is-collapsed': collapsed }">
      <div class="brand">
        <span class="brand__mark"><AppIcon name="utensils" /></span>
        <div class="brand__text">
          <span class="brand__name">Forkish</span>
          <span class="brand__tag">{{ restName.VITE_REST_NAME }}</span>
        </div>
      </div>

      <nav class="sidebar__nav">
        <span class="sidebar__label">Workspace</span>
        <RouterLink v-for="l in links" :key="l.to" :to="l.to" class="side-link" active-class="is-active"
          :title="collapsed ? l.label : undefined">
          <AppIcon :name="l.icon" /><span class="side-link__label">{{ l.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar__footer">
        <div class="shift-card" :title="collapsed ? `Shift open · ${today}` : undefined">
          <span class="status-dot status-dot--live"></span>
          <div class="shift-card__text">
            <strong>Shift open</strong>
            <small>{{ today }}</small>
          </div>
        </div>
        <button type="button" class="sidebar__toggle" :aria-expanded="!collapsed"
          :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'" @click="collapsed = !collapsed">
          <AppIcon name="chevrons-left" /><span class="sidebar__toggle-label">Collapse</span>
        </button>
      </div>
    </aside>

    <div class="app-main">
      <header class="topbar">
        <div class="topbar__lead">
          <span class="topbar__mark"><AppIcon name="utensils" /></span>
          <div>
            <h1 class="topbar__title">{{ $route.meta.title }}</h1>
            <p class="topbar__subtitle">{{ $route.meta.subtitle }}</p>
          </div>
        </div>
        <div class="topbar__meta">
          <span class="chip chip--live"><span class="status-dot status-dot--live"></span>Live</span>
          <span class="topbar__clock"><AppIcon name="clock" />{{ time }}</span>
        </div>
      </header>

      <main class="app-content">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in"><component :is="Component" /></Transition>
        </RouterView>
      </main>
    </div>

    <!-- Mobile bottom nav -->
    <nav class="tabbar">
      <RouterLink v-for="l in links" :key="l.to" :to="l.to" class="tabbar__item" active-class="is-active">
        <AppIcon :name="l.icon" /><span>{{ l.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import AppIcon from './components/AppIcon.vue'
import { useNow } from './lib/now'

const links = [
  { to: '/pos', label: 'POS', icon: 'receipt' },
  { to: '/tables', label: 'Tables', icon: 'grid' },
  { to: '/kitchen', label: 'Kitchen', icon: 'chef' },
]

// Desktop sidebar collapse state, remembered across reloads.
const COLLAPSE_KEY = 'pos.sidebarCollapsed'
const readCollapsed = () => { try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false } }
const collapsed = ref(readCollapsed())
watch(collapsed, (v) => { try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0') } catch {} })

const now = useNow()
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
const time = computed(() => timeFmt.format(now.value))
const today = computed(() => dateFmt.format(now.value))

const restName = import.meta.env
</script>
