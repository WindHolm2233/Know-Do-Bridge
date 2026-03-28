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
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.54);
}

.language-switch__item {
  padding: 0.35rem 0.8rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--app-text-soft);
  cursor: pointer;
}

.language-switch__item--active {
  background: white;
  color: var(--app-text);
  box-shadow: 0 4px 12px rgba(58, 76, 110, 0.12);
}
</style>
