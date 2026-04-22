import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router, { setupRoutePreloadStrategy } from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
setupRoutePreloadStrategy(router)

app.mount('#app')
