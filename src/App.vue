<template>
  <RouterView v-if="$route.meta.public" />
  <div v-else class="app-shell">
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
        <template v-for="l in visibleLinks" :key="l.to">
          <div v-if="l.children" class="side-group" :class="{ 'is-open': openGroups[l.to] }">
            <button type="button" class="side-link side-group__toggle" :class="{ 'is-current': inGroup(l) }"
              :aria-expanded="!!openGroups[l.to]" :title="collapsed ? l.label : undefined" @click="openGroups[l.to] = !openGroups[l.to]">
              <AppIcon :name="l.icon" /><span class="side-link__label">{{ l.label }}</span>
              <!-- <AppIcon name="chevron-down" class="side-group__chevron" /> -->
            </button>
            <div v-show="openGroups[l.to]" class="side-group__items">
              <RouterLink v-for="c in l.children" :key="c.to" :to="c.to" class="side-link side-link--sub" active-class="is-active"
                :title="collapsed ? c.label : undefined">
                <AppIcon :name="c.icon" /><span class="side-link__label">{{ c.label }}</span>
              </RouterLink>
            </div>
          </div>
          <RouterLink v-else :to="l.to" class="side-link" active-class="is-active" :title="collapsed ? l.label : undefined">
            <AppIcon :name="l.icon" /><span class="side-link__label">{{ l.label }}</span>
          </RouterLink>
        </template>
      </nav>

      <div class="sidebar__footer">
        <div class="shift-card" :title="collapsed ? `Shift open · ${today}` : undefined">
          <span class="status-dot status-dot--live"></span>
          <div class="shift-card__text">
            <strong>Shift open</strong>
            <small>{{ today }}</small>
          </div>
        </div>
        <div v-if="auth.user" class="account-card" :title="collapsed ? auth.user.name : undefined">
          <span class="account-card__avatar">{{ initials }}</span>
          <div class="account-card__text">
            <strong>{{ auth.user.name }}</strong>
            <small>{{ auth.user.role || auth.user.email }}</small>
          </div>
          <button type="button" class="account-card__logout" aria-label="Log out" title="Log out" @click="logout">
            <AppIcon name="logout" />
          </button>
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
          <button type="button" class="topbar__logout" aria-label="Log out" title="Log out" @click="logout">
            <AppIcon name="logout" />
          </button>
        </div>
      </header>

      <main class="app-content">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in"><component :is="Component" /></Transition>
        </RouterView>
      </main>
    </div>

    <!-- Mobile bottom nav: the main screens, everything else under "More" -->
    <nav class="tabbar" aria-label="Main">
      <RouterLink v-for="l in tabLinks" :key="l.to" :to="l.to" class="tabbar__item" active-class="is-active">
        <AppIcon :name="l.icon" /><span>{{ l.short ?? l.label }}</span>
      </RouterLink>
      <button v-if="moreLinks.length" type="button" class="tabbar__item" :class="{ 'is-active': moreOpen || inMore }"
        :aria-expanded="moreOpen" aria-controls="more-sheet" @click="moreOpen = !moreOpen">
        <AppIcon name="grid-small" /><span>More</span>
      </button>
    </nav>

    <Transition name="sheet">
      <div v-if="moreOpen" class="more-sheet" @keydown.esc="moreOpen = false">
        <div class="more-sheet__backdrop" @click="moreOpen = false"></div>
        <div id="more-sheet" class="more-sheet__panel" role="dialog" aria-modal="true" aria-label="More">
          <span class="more-sheet__handle" aria-hidden="true"></span>
          <template v-for="l in moreLinks" :key="l.to">
            <section v-if="l.children" class="more-sheet__group">
              <h2 class="more-sheet__title">{{ l.label }}</h2>
              <div class="more-sheet__grid">
                <RouterLink v-for="c in l.children" :key="c.to" :to="c.to" class="more-tile" active-class="is-active">
                  <AppIcon :name="c.icon" /><span>{{ c.label }}</span>
                </RouterLink>
              </div>
            </section>
          </template>
          <section v-if="moreSingles.length" class="more-sheet__group">
            <h2 class="more-sheet__title">More</h2>
            <div class="more-sheet__grid">
              <RouterLink v-for="l in moreSingles" :key="l.to" :to="l.to" class="more-tile" active-class="is-active">
                <AppIcon :name="l.icon" /><span>{{ l.label }}</span>
              </RouterLink>
            </div>
          </section>
          <div v-if="auth.user" class="more-sheet__account">
            <span class="account-card__avatar">{{ initials }}</span>
            <div class="more-sheet__who">
              <strong>{{ auth.user.name }}</strong>
              <small>{{ auth.user.role || auth.user.email }}</small>
            </div>
            <button type="button" class="btn-soft" @click="logout"><AppIcon name="logout" />Log out</button>
          </div>
        </div>
      </div>
    </Transition>

    <ApprovalDialog />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MENU_ADMIN, TABLE_ADMIN } from './router'
import AppIcon from './components/AppIcon.vue'
import ApprovalDialog from './components/ApprovalDialog.vue'
import { useNow } from './lib/now'
import { useAuthStore } from './stores/auth'
import { usePosStore } from './stores/pos'

const links = [
  { to: '/pos', label: 'POS', icon: 'receipt' },
  { to: '/tables', label: 'Tables', icon: 'grid', permission: 'tables.view' },
  { to: '/kitchen', label: 'Kitchen', icon: 'chef', permission: 'kitchen.view' },
  { to: '/history', label: 'History', icon: 'calendar', permission: 'reports.view' },
  { to: '/bill-editor', label: 'Bill editor', icon: 'printer', permission: 'settings.view' },
  { to: '/menu', label: 'Menu management', short: 'Menu', icon: 'book', permission: MENU_ADMIN, children: [
    { to: '/menu/categories', label: 'Categories', icon: 'tag' },
    { to: '/menu/items', label: 'Items', icon: 'list' },
  ] },
  { to: '/floor', label: 'Table management', short: 'Floor', icon: 'layout', permission: TABLE_ADMIN, children: [
    { to: '/floor/plan', label: 'Floor plan', icon: 'map' },
    { to: '/floor/tables', label: 'Tables', icon: 'table' },
    { to: '/floor/zones', label: 'Zones', icon: 'layers' },
  ] },
  { to: '/team', label: 'Team', icon: 'users', permission: 'team.view' },
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

const auth = useAuthStore()
const visibleLinks = computed(() => links.filter((l) => !l.permission || [].concat(l.permission).some(auth.can)))
const route = useRoute()
// Sidebar groups (Menu management): open while you're on one of their pages, otherwise up to you.
const inGroup = (l) => !!l.children && route.path.startsWith(`${l.to}/`)
const openGroups = reactive({})
watch(() => route.path, () => { for (const l of links) if (inGroup(l)) openGroups[l.to] = true }, { immediate: true })
// Mobile tab bar: up to four plain screens get a tab; the rest (and the admin groups) go under "More".
const TAB_SLOTS = 4
const tabLinks = computed(() => {
  const plain = visibleLinks.value.filter((l) => !l.children)
  return plain.length === visibleLinks.value.length && plain.length <= TAB_SLOTS + 1 ? plain : plain.slice(0, TAB_SLOTS)
})
const moreLinks = computed(() => visibleLinks.value.filter((l) => !tabLinks.value.includes(l)))
const moreSingles = computed(() => moreLinks.value.filter((l) => !l.children))
const inMore = computed(() => moreLinks.value.some((l) => route.path === l.to || route.path.startsWith(`${l.to}/`)))
const moreOpen = ref(false)
watch(() => route.path, () => { moreOpen.value = false })

const router = useRouter()
const initials = computed(() => (auth.user?.name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase())

async function logout() {
  const pos = usePosStore()
  const msg = pos.cart.length
    ? 'Log out? The order in the cart hasn’t been placed or held and will be lost.'
    : 'Log out?'
  if (!window.confirm(msg)) return
  moreOpen.value = false
  await auth.logout()
  pos.$reset() // don't leave a half-built cart for the next person
  router.replace({ name: 'login' })
}
</script>
