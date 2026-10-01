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
    { path: '/history', name: 'history', component: () => import('./views/HistoryView.vue'),
      meta: { title: 'Order history', subtitle: 'Every order, searchable by date' } },
    { path: '/bill-editor', name: 'bill-editor', component: () => import('./views/BillEditorView.vue'),
      meta: { title: 'Bill editor', subtitle: 'Design the printed bill: details, fields, labels and layout' } },
  ],
})
