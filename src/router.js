import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/pos' },
    { path: '/pos', name: 'pos', component: () => import('./views/PosView.vue'),
      meta: { title: 'Register', subtitle: 'Build orders and send them to the kitchen' } },
    { path: '/tables', name: 'tables', component: () => import('./views/TablesView.vue'),
      meta: { title: 'Floor plan', subtitle: 'Pick a free table to start a dine-in order' } },
    { path: '/kitchen', name: 'kitchen', component: () => import('./views/KitchenView.vue'),
      meta: { title: 'Kitchen display', subtitle: 'Live tickets, refreshed every few seconds' } },
  ],
})
