import { errorMessages } from '@/locales/errorMessages'

const localeFallbackErrors = {
  zh: {
    socialRequireSignInDelete: '\u8bf7\u5148\u767b\u5f55\u540e\u518d\u5220\u9664\u5185\u5bb9\u3002',
    socialDeletePost: '\u5220\u9664\u5185\u5bb9\u5931\u8d25\u3002',
    socialDeletePostForbidden: '\u53ea\u80fd\u5220\u9664\u4f60\u81ea\u5df1\u53d1\u5e03\u7684\u5185\u5bb9\u3002'
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

export class AppError extends Error {
  constructor(code, fallbackMessage) {
    super(fallbackMessage || code)
    this.name = 'AppError'
    this.code = code
  }
}

export const createAppError = (code, fallbackMessage) => new AppError(code, fallbackMessage)

export const translateError = (error, fallbackCode = '') => {
  const locale = detectLocale()
  const dictionary = errorMessages[locale] || errorMessages.en
  const localeFallbackDictionary = localeFallbackErrors[locale] || {}
  const englishDictionary = errorMessages.en || {}
  const code = error instanceof AppError ? error.code : fallbackCode

  if (code && dictionary[code]) {
    return dictionary[code]
  }

  if (code && localeFallbackDictionary[code]) {
    return localeFallbackDictionary[code]
  }

  if (code && englishDictionary[code]) {
    return englishDictionary[code]
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return (
    (fallbackCode &&
      (dictionary[fallbackCode] ||
        localeFallbackDictionary[fallbackCode] ||
        englishDictionary[fallbackCode])) ||
    'Unexpected error'
  )
}
