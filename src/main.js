import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { registerSupabaseClient } from '@/services/supabaseBridge'

const bootstrap = async () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    const { createClient } = await import('@supabase/supabase-js')

    registerSupabaseClient(createClient(supabaseUrl, supabaseAnonKey))
  }

  const app = createApp(App)

  app.use(createPinia())
  app.use(router)

  app.mount('#app')
}

bootstrap()
