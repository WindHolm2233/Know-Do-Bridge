<template>
  <nav class="bottom-nav" :aria-label="uiStore.t('appName')">
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
import { RouterLink, useRoute } from 'vue-router'
import { useAppNavigation } from '@/composables/useAppNavigation'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const uiStore = useUiStore()
const { navItems: items, warmRoute } = useAppNavigation()
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  right: max(0.75rem, env(safe-area-inset-right));
  bottom: max(0.75rem, env(safe-area-inset-bottom));
  left: max(0.75rem, env(safe-area-inset-left));
  z-index: 8;
  display: none;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.2rem;
  width: min(34rem, calc(100vw - 1.5rem));
  margin: 0 auto;
  padding: 0.42rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  background: var(--glass-surface-strong);
  box-shadow: var(--shadow-md);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-height: 3.2rem;
  padding: 0.45rem 0.3rem;
  border-radius: var(--radius-xl);
  color: var(--app-text-soft);
  transition:
    background var(--motion-fast),
    color var(--motion-fast),
    transform var(--motion-fast);
}

.bottom-nav__item:active {
  transform: scale(0.96);
}

.bottom-nav__item--active {
  background: rgba(255, 255, 255, 0.82);
  color: var(--app-primary);
  box-shadow: var(--shadow-xs);
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
  border-radius: var(--radius-pill);
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
  0%,
  100% {
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
