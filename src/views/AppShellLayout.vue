<template>
  <div class="app-layout">
    <aside class="left-rail">
      <RouterLink class="brand-mark" to="/">
        {{ uiStore.t('appName') }}
      </RouterLink>

      <nav class="rail-menu">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="['rail-item', { 'rail-item--active': route.path === item.to }]"
        >
          {{ item.label }}
          <span v-if="item.badge" class="rail-badge">{{ item.badge }}</span>
        </RouterLink>
      </nav>
    </aside>

    <main class="main-column">
      <slot />
    </main>

    <aside class="right-rail">
      <slot name="sidebar" />
    </aside>

    <BottomNav />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BottomNav from './BottomNav.vue'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const uiStore = useUiStore()
const authStore = useAuthStore()
const messagesStore = useMessagesStore()

const navItems = computed(() => [
  { to: '/', label: uiStore.t('navHome') },
  { to: '/explore', label: uiStore.t('navExplore') },
  { to: '/notifications', label: uiStore.t('navNotifications') },
  {
    to: '/messages',
    label: uiStore.t('navMessages'),
    badge: messagesStore.getUnreadThreadCount(authStore.currentUser?.id)
  },
  { to: '/profile', label: uiStore.t('navProfile') }
])
</script>

<style scoped>
.app-layout {
  display: grid;
  grid-template-columns: minmax(160px, 200px) minmax(0, 900px) minmax(280px, 340px);
  justify-content: center;
  width: min(100%, 1440px);
  margin: 0 auto;
  min-height: 100vh;
}

.left-rail,
.right-rail {
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  padding: 0.6rem 0.75rem;
  overflow-y: auto;
}

.left-rail {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  max-width: 100%;
  min-height: 2.75rem;
  padding: 0.6rem 0.9rem;
  border-radius: 12px;
  border: 2px solid var(--app-primary);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(59, 130, 246, 0.05));
  color: var(--app-primary-dark);
  font-size: 0.85rem;
  font-weight: 900;
  letter-spacing: 0.3px;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
  transition: all 0.3s ease;
}

.brand-mark:hover {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(59, 130, 246, 0.1));
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
  transform: translateY(-2px);
}

.rail-menu {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.rail-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 2.5rem;
  padding: 0.65rem 0.9rem;
  border-radius: 8px;
  color: var(--app-text);
  font-size: 0.95rem;
  font-weight: 600;
  transition:
    background 0.25s ease,
    color 0.25s ease,
    transform 0.2s ease;
}

.rail-item:hover {
  background: var(--app-accent-soft);
  color: var(--app-primary);
  transform: translateX(2px);
}

.rail-item--active {
  background: var(--app-accent-soft);
  color: var(--app-primary);
  font-weight: 800;
  border-left: 3px solid var(--app-primary);
  padding-left: calc(0.9rem - 3px);
}

.rail-badge {
  position: absolute;
  top: 0.3rem;
  right: 0.55rem;
  min-width: 1.2rem;
  height: 1.2rem;
  padding: 0 0.32rem;
  border-radius: 999px;
  background: var(--app-primary);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.2rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
  animation: pulse-badge 2s ease-in-out infinite;
}

@keyframes pulse-badge {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);
    transform: scale(1.05);
  }
}

.main-column {
  min-height: 100vh;
  background: var(--app-surface-elevated);
  border-right: 1px solid var(--app-border);
  border-left: 1px solid var(--app-border);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4);
}

.right-rail {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

@media (max-width: 1024px) {
  .app-layout {
    grid-template-columns: minmax(0, 1fr);
    width: 100%;
  }

  .left-rail {
    display: none;
  }

  .main-column {
    min-height: auto;
    border-left: none;
    border-right: none;
  }

  .right-rail {
    position: static;
    top: auto;
    height: auto;
    padding: 0 0.75rem calc(1rem + env(safe-area-inset-bottom));
    overflow: visible;
  }
}
</style>
