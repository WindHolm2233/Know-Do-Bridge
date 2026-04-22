<template>
  <nav class="bottom-nav">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      :class="['bottom-nav__item', { 'bottom-nav__item--active': route.path === item.to }]"
      @mouseenter="warmRoute(item.to)"
      @focus="warmRoute(item.to)"
      @touchstart.passive="warmRoute(item.to)"
    >
      <span class="bottom-nav__icon">
        {{ item.icon }}
        <i v-if="item.badge" class="bottom-nav__badge">{{ item.badge }}</i>
      </span>
      <small>{{ item.label }}</small>
    </RouterLink>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { preloadRouteComponent } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const uiStore = useUiStore()
const authStore = useAuthStore()
const messagesStore = useMessagesStore()

const items = computed(() => [
  { to: '/', label: uiStore.t('navHome'), icon: 'H' },
  { to: '/explore', label: uiStore.t('navExplore'), icon: '#' },
  { to: '/notifications', label: uiStore.t('navNotifications'), icon: '!' },
  {
    to: '/messages',
    label: uiStore.t('navMessages'),
    icon: 'M',
    badge: messagesStore.getUnreadThreadCount(authStore.currentUser?.id)
  },
  { to: '/profile', label: uiStore.t('navProfile'), icon: 'P' }
])

const warmRoute = (path) => {
  void preloadRouteComponent(path)
}
</script>

<style scoped>
.bottom-nav {
  position: sticky;
  bottom: 0;
  z-index: 8;
  display: none;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.2rem;
  padding: 0.5rem 0.75rem calc(0.5rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--app-border);
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
  box-shadow: 0 -1px 2px rgba(0, 0, 0, 0.02);
}

.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.45rem 0.3rem;
  border-radius: 8px;
  color: var(--app-text-soft);
  transition: all 0.2s ease;
}

.bottom-nav__item:active {
  transform: scale(0.95);
}

.bottom-nav__item--active {
  background: var(--app-accent-soft);
  color: var(--app-primary);
}

.bottom-nav__item span {
  font-size: 1rem;
  font-weight: 700;
}

.bottom-nav__icon {
  position: relative;
}

.bottom-nav__badge {
  position: absolute;
  top: -0.45rem;
  right: -0.6rem;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.22rem;
  border-radius: 999px;
  background: var(--app-primary);
  color: white;
  font-size: 0.65rem;
  font-style: normal;
  font-weight: 700;
  line-height: 1rem;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
  animation: pulse-badge 2s ease-in-out infinite;
}

@keyframes pulse-badge {
  0%, 100% {
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 3px 10px rgba(37, 99, 235, 0.4);
    transform: scale(1.05);
  }
}

.bottom-nav__item small {
  font-size: 0.72rem;
  font-weight: 500;
}

@media (max-width: 1024px) {
  .bottom-nav {
    display: grid;
  }
}
</style>
