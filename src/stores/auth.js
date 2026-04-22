import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchCurrentUser,
  resendSignupConfirmation as resendSignupConfirmationApi,
  signInLocally,
  signOutLocally
} from '@/services/authApi'
import { getDataMode } from '@/services/socialApi'
import { createAppError, translateError } from '@/utils/appError'

const VERIFICATION_RESEND_COOLDOWN_MS = 30 * 1000
const AUTH_CACHE_MS = 60 * 1000

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const loading = ref(false)
  const submitting = ref(false)
  const resendingVerification = ref(false)
  const error = ref('')
  const notice = ref('')
  const pendingVerificationEmail = ref('')
  const verificationCooldownUntil = ref(0)
  const cooldownNow = ref(Date.now())
  const loadedAt = ref(0)
  let loadPromise = null

  const usingSupabase = computed(() => getDataMode() === 'supabase')
  const isSignedIn = computed(() => Boolean(currentUser.value))
  const verificationCooldownSeconds = computed(() =>
    Math.max(0, Math.ceil((verificationCooldownUntil.value - cooldownNow.value) / 1000))
  )
  let cooldownTimer = null

  const stopCooldownTicker = () => {
    if (typeof window === 'undefined' || !cooldownTimer) {
      cooldownTimer = null
      return
    }

    window.clearInterval(cooldownTimer)
    cooldownTimer = null
  }

  const startCooldownTicker = () => {
    if (typeof window === 'undefined' || cooldownTimer) {
      return
    }

    cooldownTimer = window.setInterval(() => {
      const now = Date.now()
      cooldownNow.value = now

      if (verificationCooldownUntil.value <= now) {
        stopCooldownTicker()
      }
    }, 1000)
  }

  watch(
    verificationCooldownUntil,
    (nextValue) => {
      cooldownNow.value = Date.now()

      if (nextValue > cooldownNow.value) {
        startCooldownTicker()
        return
      }

      stopCooldownTicker()
    },
    { immediate: true }
  )

  const loadCurrentUser = async ({ force = false } = {}) => {
    if (!force && loadPromise) {
      return loadPromise
    }

    if (!force && loadedAt.value && Date.now() - loadedAt.value < AUTH_CACHE_MS) {
      return currentUser.value
    }

    loading.value = true
    error.value = ''
    notice.value = ''

    loadPromise = (async () => {
      try {
        currentUser.value = await fetchCurrentUser()
        pendingVerificationEmail.value = ''
        verificationCooldownUntil.value = 0
        loadedAt.value = Date.now()
        return currentUser.value
      } catch (err) {
        error.value = translateError(err, 'authLoadUser')
        return currentUser.value
      } finally {
        loading.value = false
        loadPromise = null
      }
    })()

    return loadPromise
  }

  const signIn = async (payload) => {
    submitting.value = true
    error.value = ''
    notice.value = ''

    try {
      const result = await signInLocally(payload)
      currentUser.value = result.user
      pendingVerificationEmail.value = result.pendingEmail || ''
      verificationCooldownUntil.value = result.pendingEmail ? Date.now() + VERIFICATION_RESEND_COOLDOWN_MS : 0
      loadedAt.value = Date.now()

      if (result.noticeCode) {
        notice.value = translateError(
          createAppError(
            result.noticeCode,
            'Sign up succeeded. Please confirm your email before signing in.'
          ),
          result.noticeCode
        )
      }
    } catch (err) {
      error.value = translateError(err, 'authSignIn')
    } finally {
      submitting.value = false
    }
  }

  const signOut = async () => {
    submitting.value = true
    error.value = ''
    notice.value = ''

    try {
      const result = await signOutLocally()
      currentUser.value = result.user
      pendingVerificationEmail.value = ''
      verificationCooldownUntil.value = 0
      loadedAt.value = Date.now()
    } catch (err) {
      error.value = translateError(err, 'authSignOut')
    } finally {
      submitting.value = false
    }
  }

  const resendSignupConfirmation = async (email = '') => {
    if (verificationCooldownSeconds.value > 0) {
      return
    }

    resendingVerification.value = true
    error.value = ''

    try {
      const targetEmail = email.trim() || pendingVerificationEmail.value
      const result = await resendSignupConfirmationApi(targetEmail)

      pendingVerificationEmail.value = result.pendingEmail || targetEmail
      verificationCooldownUntil.value = Date.now() + VERIFICATION_RESEND_COOLDOWN_MS
      notice.value = translateError(
        createAppError(
          result.noticeCode,
          'Verification email sent again. Please check your inbox.'
        ),
        result.noticeCode
      )
    } catch (err) {
      error.value = translateError(err, 'authResendConfirmation')
    } finally {
      resendingVerification.value = false
    }
  }

  return {
    currentUser,
    error,
    isSignedIn,
    loadCurrentUser,
    loading,
    notice,
    pendingVerificationEmail,
    resendSignupConfirmation,
    verificationCooldownSeconds,
    resendingVerification,
    signIn,
    signOut,
    submitting,
    usingSupabase
  }
})
