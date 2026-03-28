import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { uiMessages } from '@/locales/uiMessages'

const localeFallbackMessages = {
  zh: {
    deletePost: '\u5220\u9664',
    deleting: '\u5220\u9664\u4e2d...',
    deletePostConfirm: '\u786e\u8ba4\u5220\u9664\u8fd9\u6761\u5185\u5bb9\u5417\uff1f\u5220\u9664\u540e\u65e0\u6cd5\u6062\u590d\u3002'
  }
}

const detectLocale = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('campus-link-locale')
    if (saved === 'en' || saved === 'zh') {
      return saved
    }
  }

  if (typeof navigator !== 'undefined') {
    return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }

  return 'zh'
}

export const useUiStore = defineStore('ui', () => {
  const locale = ref(detectLocale())
  const dictionary = computed(() => uiMessages[locale.value] || uiMessages.zh)

  const setLocale = (nextLocale) => {
    if (!uiMessages[nextLocale]) {
      return
    }

    locale.value = nextLocale

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('campus-link-locale', nextLocale)
    }
  }

  const t = (key) =>
    dictionary.value[key] ||
    localeFallbackMessages[locale.value]?.[key] ||
    uiMessages.en[key] ||
    key

  return {
    locale,
    setLocale,
    t
  }
})
