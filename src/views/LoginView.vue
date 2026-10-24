<template>
  <div class="login">
    <form class="login__card" novalidate @submit.prevent="submit">
      <div class="login__brand">
        <span class="login__mark"><AppIcon name="utensils" /></span>
        <div>
          <span class="login__name">Forkish</span>
          <span class="login__tag">{{ restName }}</span>
        </div>
      </div>

      <h1 class="login__title">Sign in</h1>
      <p class="login__subtitle">Start your shift with your staff account.</p>

      <p v-if="error" class="login__error" role="alert">{{ error }}</p>

      <label class="login__label" for="login-email">Email</label>
      <div class="login__input">
        <AppIcon name="mail" />
        <input id="login-email" v-model.trim="email" type="email" autocomplete="username" required
          placeholder="you@restaurant.com" :disabled="busy" autofocus>
      </div>

      <label class="login__label" for="login-password">Password</label>
      <div class="login__input">
        <AppIcon name="lock" />
        <input id="login-password" v-model="password" :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password" required placeholder="Your password" :disabled="busy">
        <button type="button" class="login__peek" :aria-label="showPassword ? 'Hide password' : 'Show password'"
          :title="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
          <AppIcon :name="showPassword ? 'eye-off' : 'eye'" />
        </button>
      </div>

      <label class="login__remember">
        <input v-model="remember" type="checkbox" class="form-check-input" :disabled="busy">
        Keep me signed in on this device
      </label>

      <button type="submit" class="btn-cta login__submit" :disabled="busy || !email || !password">
        <span>{{ busy ? 'Signing in…' : 'Sign in' }}</span>
      </button>

      <p v-if="demo" class="login__hint">Demo mode: <code>admin@pos.local</code> / <code>password</code></p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { useAuthStore } from '../stores/auth'
import { redirectTarget } from '../router'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const remember = ref(false)
const showPassword = ref(false)
const busy = ref(false)
const error = ref('')

const restName = import.meta.env.VITE_REST_NAME
const demo = import.meta.env.VITE_MOCK !== 'false'

async function submit() {
  if (!email.value || !password.value) return
  busy.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value, remember.value)
    router.replace(redirectTarget(route.query.redirect))
  } catch (e) {
    const status = e.response?.status
    error.value = status === 429 ? 'Too many attempts. Wait a minute and try again.'
      : status === 422 ? (e.response.data?.errors?.email?.[0] ?? e.message)
      : status === 419 ? 'Your session expired. Please try again.'
      : 'Could not reach the server. Check your connection and try again.'
    password.value = ''
  } finally {
    busy.value = false
  }
}
</script>
