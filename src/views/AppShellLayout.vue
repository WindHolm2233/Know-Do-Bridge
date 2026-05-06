<template>
  <div class="app-layout">
    <aside class="left-rail">
      <RouterLink class="brand-mark" to="/">
        {{ uiStore.t('appName') }}
      </RouterLink>

      <nav class="rail-menu" :aria-label="uiStore.t('appName')">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="['rail-item', { 'rail-item--active': route.path === item.to }]"
          @mouseenter="warmRoute(item.to)"
          @focus="warmRoute(item.to)"
          @touchstart.passive="warmRoute(item.to)"
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
import { RouterLink, useRoute } from 'vue-router'
import BottomNav from './BottomNav.vue'
import { useAppNavigation } from '@/composables/useAppNavigation'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const uiStore = useUiStore()
const { navItems, warmRoute } = useAppNavigation()
</script>

<style scoped>
.app-layout {
  display: grid;
  grid-template-columns:
    minmax(176px, 216px)
    minmax(0, var(--app-main-max))
    minmax(var(--app-sidebar-min), var(--app-sidebar-max));
  justify-content: center;
  width: min(100%, var(--app-page-max));
  margin: 0 auto;
  min-height: 100vh;
  gap: 0.75rem;
  padding: 0 0.75rem;
}

.left-rail,
.right-rail {
  position: sticky;
  top: 0;
  align-self: start;
  height: calc(100vh - 1.5rem);
  margin-top: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  overflow-y: auto;
}

.left-rail {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  max-width: 100%;
  min-height: var(--control-height-md);
  padding: 0.7rem 1rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  background: var(--glass-surface-strong);
  color: var(--app-primary-dark);
  font-size: 0.85rem;
  font-weight: 900;
  letter-spacing: 0.3px;
  line-height: 1;
  white-space: nowrap;
  box-shadow: var(--shadow-primary);
  transition:
    background var(--motion-base),
    box-shadow var(--motion-base),
    transform var(--motion-base);
}

.brand-mark:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(219, 234, 254, 0.78));
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.rail-menu {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.rail-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
  min-height: 2.5rem;
  padding: 0.68rem 0.85rem;
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  color: var(--app-text);
  font-size: 0.95rem;
  font-weight: 600;
  transition:
    background var(--motion-base),
    color var(--motion-base),
    transform var(--motion-fast);
}

.rail-item:hover {
  border-color: var(--glass-border);
  background: rgba(255, 255, 255, 0.62);
  color: var(--app-primary);
  box-shadow: var(--shadow-xs);
  transform: translateX(1px);
}

.rail-item--active {
  border-color: rgba(37, 99, 235, 0.2);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(219, 234, 254, 0.72));
  color: var(--app-primary);
  font-weight: 800;
  box-shadow: var(--shadow-primary);
}

.rail-badge {
  position: absolute;
  top: 0.3rem;
  right: 0.55rem;
  min-width: 1.2rem;
  height: 1.2rem;
  padding: 0 0.32rem;
  border-radius: var(--radius-pill);
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
  0%,
  100% {
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);
    transform: scale(1.05);
  }
}

.main-column {
  min-height: calc(100vh - 1.5rem);
  margin: 0.75rem 0;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  background: rgba(255, 255, 255, 0.48);
  box-shadow: var(--shadow-sm);
  overflow: clip;
  backdrop-filter: blur(18px) saturate(1.25);
  -webkit-backdrop-filter: blur(18px) saturate(1.25);
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
    gap: 0;
    padding: 0;
  }

  .left-rail {
    display: none;
  }

  .main-column {
    min-height: auto;
    margin: 0;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  .right-rail {
    position: static;
    top: auto;
    height: auto;
    margin-top: 0;
    border: none;
    border-radius: 0;
    padding: 0 0.75rem calc(1rem + env(safe-area-inset-bottom));
    overflow: visible;
  }
}
</style>
