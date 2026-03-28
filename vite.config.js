import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [vue(), command === 'serve' ? vueDevTools() : null].filter(Boolean),
  build: {
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('@supabase/supabase-js')) {
            return 'supabase'
          }

          if (id.includes('vue-router') || id.includes('/vue/') || id.includes('\\vue\\')) {
            return 'framework'
          }

          if (id.includes('pinia')) {
            return 'framework'
          }
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    origin: 'https://campuslink.dpdns.org',
    allowedHosts: ['campuslink.dpdns.org']
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['campuslink.dpdns.org']
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
}))
