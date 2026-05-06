<template>
  <header class="app-header">
    <div class="app-header__title">
      <h2>{{ title }}</h2>
      <small>{{ subtitle }}</small>
    </div>
    <div class="app-header__meta">
      <LanguageSwitch />
      <span :class="['live-pill', { 'live-pill--active': isLive }]">
        {{ isLive ? uiStore.t('live') : uiStore.t('idle') }}
      </span>
    </div>
  </header>
</template>

<script setup>
import LanguageSwitch from './LanguageSwitch.vue'
import { useUiStore } from '@/stores/ui'

defineProps({
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  isLive: {
    type: Boolean,
    default: false,
  },
})

const uiStore = useUiStore()
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0.75rem;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0.75rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  background: var(--glass-surface-strong);
  box-shadow: var(--shadow-sm);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.app-header__title h2 {
  color: var(--app-heading);
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: -0.5px;
  margin-bottom: 0.2rem;
}

.app-header__title small {
  color: var(--app-text-soft);
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.app-header__meta {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.live-pill {
  padding: 0.4rem 0.78rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.52);
  color: var(--app-text-soft);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.4px;
  transition:
    background var(--motion-fast),
    color var(--motion-fast),
    box-shadow var(--motion-fast);
}

.live-pill--active {
  background: rgba(219, 234, 254, 0.72);
  color: var(--app-primary);
  box-shadow: var(--shadow-xs);
}

@media (max-width: 680px) {
  .app-header {
    align-items: flex-start;
    flex-direction: column;
    margin: 0.75rem;
    padding: 0.75rem 0.9rem;
    border-radius: var(--radius-xl);
  }

  .app-header__title h2 {
    font-size: 1.05rem;
  }

  .app-header__title small {
    font-size: 0.75rem;
  }

  .app-header__meta {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
