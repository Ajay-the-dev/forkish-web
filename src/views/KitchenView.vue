<template>
  <div class="page">
    <div class="kds">
      <section v-for="c in cols" :key="c.status" class="kds-col" :class="`kds-col--${c.status.toLowerCase()}`">
        <header class="kds-col__head">
          <span class="kds-col__dot"></span>
          <h2 class="kds-col__title">{{ c.label }}</h2>
          <span class="kds-col__count">{{ by(c.status).length }}</span>
        </header>

        <TransitionGroup name="ticket" tag="div" class="kds-col__body">
          <article v-for="o in by(c.status)" :key="o.id" class="ticket"
            :class="{ 'is-warn': mins(o) >= 8 && mins(o) < 15, 'is-late': mins(o) >= 15 }">
            <header class="ticket__head">
              <strong class="ticket__no">{{ o.number }}</strong>
              <span v-if="o.created_at" class="ticket__timer"><AppIcon name="clock" />{{ elapsed(o) }}</span>
            </header>
            <div class="ticket__tags">
              <span class="tag">{{ o.type.replace('_', '-') }}</span>
              <span v-if="o.table_id" class="tag tag--brand">T{{ o.table_id }}</span>
            </div>
            <ul class="ticket__items">
              <li v-for="(i, k) in o.items" :key="k">
                <span class="ticket__qty">{{ i.quantity }}×</span>
                <span>{{ i.name }}<em v-if="i.notes" class="ticket__note">{{ i.notes }}</em></span>
              </li>
            </ul>
            <button class="ticket__action" @click="advance(o, c.next)"><AppIcon :name="c.icon" />{{ c.action }}</button>
          </article>
        </TransitionGroup>

        <div v-if="!by(c.status).length" class="kds-col__empty">
          <AppIcon :name="c.icon" />No tickets
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { api } from '../lib/api'
import { useNow } from '../lib/now'

const orders = ref([])
const cols = [
  { status: 'CONFIRMED', label: 'New', next: 'PREPARING', action: 'Start preparing', icon: 'flame' },
  { status: 'PREPARING', label: 'Preparing', next: 'READY', action: 'Mark ready', icon: 'bell' },
  { status: 'READY', label: 'Ready', next: 'SERVED', action: 'Mark served', icon: 'check' },
]
const by = (s) => orders.value.filter((o) => o.status === s)
const refresh = async () => { orders.value = await api.orders() }
const advance = async (o, next) => { await api.setStatus(o.id, next); refresh() }

const now = useNow(15000)
const mins = (o) => (o.created_at ? Math.floor((now.value - Date.parse(o.created_at)) / 60000) : 0)
const elapsed = (o) => (mins(o) < 1 ? 'Just now' : `${mins(o)}m`)

let timer
onMounted(() => { refresh(); timer = setInterval(refresh, 3000) }) // swap for Reverb/Echo later
onUnmounted(() => clearInterval(timer))
</script>
