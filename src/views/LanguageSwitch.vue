<template>
  <div class="language-switch">
    <button
      :class="['language-switch__item', { 'language-switch__item--active': uiStore.locale === 'zh' }]"
      type="button"
      @click="uiStore.setLocale('zh')"
    >
      中文
    </button>
    <button
      :class="['language-switch__item', { 'language-switch__item--active': uiStore.locale === 'en' }]"
      type="button"
      @click="uiStore.setLocale('en')"
    >
      EN
    </button>
  </div>
</template>

<script setup>
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
</script>

<style scoped>
.language-switch {
  display: inline-flex;
  padding: 0.2rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.46);
  box-shadow: var(--shadow-xs);
}

.language-switch__item {
  min-height: 2rem;
  padding: 0.35rem 0.8rem;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--app-text-soft);
  cursor: pointer;
}

.language-switch__item--active {
  background: rgba(255, 255, 255, 0.88);
  color: var(--app-heading);
  box-shadow: var(--shadow-xs);
}
</style>
