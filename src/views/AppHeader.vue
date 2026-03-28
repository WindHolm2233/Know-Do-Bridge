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
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  isLive: {
    type: Boolean,
    default: false
  }
})

const uiStore = useUiStore()
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--app-border);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(16px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
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
  border-radius: 6px;
  background: rgba(15, 20, 25, 0.05);
  color: var(--app-text-soft);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.4px;
  transition: all 0.2s ease;
}

.live-pill--active {
  background: var(--app-accent-soft);
  color: var(--app-primary);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}

@media (max-width: 680px) {
  .app-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 0.75rem 0.9rem;
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
