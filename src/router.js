import { createRouter, createWebHistory } from 'vue-router'
import { onUnauthorized } from './lib/api'
import { useAuthStore } from './stores/auth'

// Menu management is open to anyone who can change the menu in some way.
export const MENU_ADMIN = ['menu.create', 'menu.update', 'menu.cancel']
// Table management: layout editors and anyone who moves parties between tables.
export const TABLE_ADMIN = ['tables.create', 'tables.update', 'tables.cancel']

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/pos' },
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'),
      meta: { public: true, title: 'Sign in' } },
    { path: '/pos', name: 'pos', component: () => import('./views/PosView.vue'),
      meta: { title: 'Register', subtitle: 'Build orders and send them to the kitchen' } },
    { path: '/tables', name: 'tables', component: () => import('./views/TablesView.vue'),
      meta: { title: 'Floor plan', subtitle: 'Pick a free table to start a dine-in order', permission: 'tables.view' } },
    { path: '/kitchen', name: 'kitchen', component: () => import('./views/KitchenView.vue'),
      meta: { title: 'Kitchen display', subtitle: 'Live tickets, refreshed every few seconds', permission: 'kitchen.view' } },
    { path: '/history', name: 'history', component: () => import('./views/HistoryView.vue'),
      meta: { title: 'Order history', subtitle: 'Every order, searchable by date', permission: 'reports.view' } },
    { path: '/bill-editor', name: 'bill-editor', component: () => import('./views/BillEditorView.vue'),
      meta: { title: 'Bill editor', subtitle: 'Design the printed bill: details, fields, labels and layout', permission: 'settings.view' } },
    { path: '/menu', redirect: '/menu/items' },
    { path: '/menu/categories', name: 'menu-categories', component: () => import('./views/MenuCategoriesView.vue'),
      meta: { title: 'Categories', subtitle: 'Group dishes into the tabs shown on the register', permission: MENU_ADMIN } },
    { path: '/menu/items', name: 'menu-items', component: () => import('./views/MenuItemsView.vue'),
      meta: { title: 'Menu items', subtitle: 'Dishes, prices and what is available today', permission: MENU_ADMIN } },
    { path: '/floor', redirect: '/floor/plan' },
    { path: '/floor/plan', name: 'floor-plan', component: () => import('./views/FloorPlanView.vue'),
      meta: { title: 'Floor plan', subtitle: 'Live table status, layout, moves and joins', permission: TABLE_ADMIN } },
    { path: '/floor/tables', name: 'floor-tables', component: () => import('./views/TablesAdminView.vue'),
      meta: { title: 'Tables', subtitle: 'Every table, its seats, zone and status', permission: TABLE_ADMIN } },
    { path: '/floor/zones', name: 'floor-zones', component: () => import('./views/ZonesView.vue'),
      meta: { title: 'Zones', subtitle: 'Areas of the restaurant, in the order staff see them', permission: TABLE_ADMIN } },
    { path: '/team', name: 'team', component: () => import('./views/TeamView.vue'),
      meta: { title: 'Team', subtitle: 'Members, roles and what each person can do', permission: 'team.view' } },
  ],
})

// Only follow in-app paths from ?redirect=, never another site.
export const redirectTarget = (q) => (typeof q === 'string' && q.startsWith('/') && !q.startsWith('//') ? q : '/pos')

// Every screen except the login page needs a signed-in user.
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.ensure()
  if (to.meta.public) return auth.loggedIn ? redirectTarget(to.query.redirect) : true
  if (!auth.loggedIn) return { name: 'login', query: to.fullPath !== '/pos' ? { redirect: to.fullPath } : {} }
  if (to.meta.permission && ![].concat(to.meta.permission).some(auth.can)) return to.name === 'pos' ? true : '/pos'
})

// Session expired mid-shift: drop the user and come back to this screen after signing in again.
onUnauthorized(() => {
  const auth = useAuthStore()
  if (!auth.loggedIn) return
  auth.clear()
  const here = router.currentRoute.value
  router.replace({ name: 'login', query: { redirect: here.fullPath } })
})

export default router
