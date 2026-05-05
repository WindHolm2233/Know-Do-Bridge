<template>
  <section class="auth-panel">
    <h3>{{ uiStore.t('account') }}</h3>

    <div v-if="currentUser" class="account-card">
      <div class="account-main">
        <div class="auth-avatar">{{ currentUser.avatar }}</div>
        <div>
          <strong>{{ currentUser.name }}</strong>
          <small>{{ currentUser.email }}</small>
          <small>{{ currentUser.role }}</small>
        </div>
      </div>
      <p class="account-hint">{{ uiStore.t('accountReady') }}</p>
      <button class="ghost-btn" :disabled="submitting" @click="$emit('sign-out')">
        {{ submitting ? uiStore.t('updating') : uiStore.t('signOut') }}
      </button>
    </div>

    <form v-else class="auth-form" @submit.prevent="handleSubmit">
      <div class="auth-tabs">
        <button
          :class="['auth-tab', { 'auth-tab--active': form.mode === 'signin' }]"
          type="button"
          @click="form.mode = 'signin'"
        >
          {{ uiStore.t('signIn') }}
        </button>
        <button
          :class="['auth-tab', { 'auth-tab--active': form.mode === 'signup' }]"
          type="button"
          @click="form.mode = 'signup'"
        >
          {{ uiStore.t('signUp') }}
        </button>
      </div>

      <div class="auth-intro-trigger">
        <button class="intro-btn" type="button" @click="openIntroModal">
          {{ introButtonLabel }}
        </button>
      </div>

      <input
        v-model="form.email"
        type="email"
        autocomplete="email"
        inputmode="email"
        :placeholder="uiStore.t('yourEmail')"
      />
      <input
        v-model="form.password"
        type="password"
        autocomplete="current-password"
        :placeholder="uiStore.t('yourPassword')"
      />
      <input
        v-if="form.mode === 'signup'"
        v-model="form.name"
        type="text"
        autocomplete="nickname"
        :placeholder="uiStore.t('yourName')"
      />
      <select v-if="form.mode === 'signup'" v-model="form.role" class="auth-select">
        <option value="" disabled>{{ uiStore.t('rolePlaceholder') }}</option>
        <option v-for="option in roleOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <p v-if="error" class="form-status form-status--error">
        {{ error }}
      </p>
      <p v-else-if="notice" class="form-status form-status--notice">
        {{ notice }}
      </p>

      <div v-if="showResendConfirmation" class="verification-help">
        <p class="verification-help__text">{{ uiStore.t('resendHint') }}</p>
        <button
          class="verification-help__btn"
          type="button"
          :disabled="submitting || resending || isResendDisabled"
          @click="handleResendVerification"
        >
          {{ resendButtonText }}
        </button>
      </div>

      <p class="account-hint">{{ uiStore.t('identityHint') }}</p>
      <button class="primary-btn" type="submit" :disabled="submitting || !canSubmit">
        {{
          submitting
            ? uiStore.t('signingIn')
            : form.mode === 'signup'
              ? uiStore.t('signUp')
              : uiStore.t('signIn')
        }}
      </button>
    </form>

    <Teleport to="body">
      <div
        v-if="!currentUser && showIntroModal"
        class="intro-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-intro-title"
        @click.self="closeIntroModal"
      >
        <div class="intro-modal__card">
          <button class="intro-modal__close" type="button" @click="closeIntroModal" aria-label="Close">
            x
          </button>

          <p class="intro-modal__eyebrow">{{ introContent.eyebrow }}</p>
          <h4 id="site-intro-title">{{ introContent.title }}</h4>
          <p class="intro-modal__description">{{ introContent.description }}</p>

          <ul class="intro-modal__list">
            <li v-for="item in introContent.highlights" :key="item">{{ item }}</li>
          </ul>

          <button class="primary-btn intro-modal__action" type="button" @click="closeIntroModal">
            {{ introContent.actionLabel }}
          </button>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { roleOptionsByLocale } from '@/constants/userRoles'
import { useUiStore } from '@/stores/ui'

const props = defineProps({
  currentUser: {
    type: Object,
    default: null
  },
  submitting: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  notice: {
    type: String,
    default: ''
  },
  usingSupabase: {
    type: Boolean,
    default: false
  },
  pendingVerificationEmail: {
    type: String,
    default: ''
  },
  resending: {
    type: Boolean,
    default: false
  },
  resendCooldownSeconds: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['sign-in', 'sign-out', 'resend-verification'])
const uiStore = useUiStore()
const INTRO_MODAL_STORAGE_KEY = 'webapp:intro-modal-dismissed'
const showIntroModal = ref(false)

const form = reactive({
  mode: 'signin',
  email: '',
  password: '',
  name: '',
  role: ''
})

const roleOptions = computed(() => roleOptionsByLocale[uiStore.locale] || roleOptionsByLocale.en)

watch(
  () => props.currentUser,
  (nextUser) => {
    if (!nextUser) {
      showIntroModal.value = shouldAutoOpenIntro()
      return
    }

    showIntroModal.value = false
    form.password = ''
  }
)

watch(
  () => props.notice,
  (nextNotice) => {
    if (!nextNotice) {
      return
    }

    form.mode = 'signin'
    form.password = ''
  }
)

const canSubmit = computed(() => {
  if (!form.email.trim() || !form.password.trim()) {
    return false
  }

  if (form.mode === 'signup' && (!form.name.trim() || !form.role.trim())) {
    return false
  }

  return true
})

const resolvedEmail = computed(() => form.email.trim() || props.pendingVerificationEmail.trim())
const shouldSuggestResendFromError = computed(() =>
  /confirm|verified|verification|email/i.test(props.error)
)
const showResendConfirmation = computed(
  () =>
    props.usingSupabase &&
    Boolean(resolvedEmail.value) &&
    (Boolean(props.notice) || shouldSuggestResendFromError.value || form.mode === 'signup')
)
const resendCooldownLabel = computed(
  () => `${uiStore.t('resendInPrefix')} ${props.resendCooldownSeconds}s`
)
const isResendDisabled = computed(() => !resolvedEmail.value || props.resendCooldownSeconds > 0)
const resendButtonText = computed(() => {
  if (props.resending) {
    return uiStore.t('resendSending')
  }

  if (props.resendCooldownSeconds > 0) {
    return resendCooldownLabel.value
  }

  return uiStore.t('resendVerificationEmail')
})
const introContent = computed(() =>
  uiStore.locale === 'zh'
    ? {
        eyebrow: '欢迎来到本站',
        title: '一个轻量社交交流空间',
        description:
          '这里可以发布动态、互动点赞评论、查看通知并进行私信沟通，帮助你和同伴更快建立连接。',
        highlights: ['发布和浏览最新动态', '点赞与评论实时互动', '消息与通知集中管理'],
        actionLabel: '我知道了'
      }
    : {
        eyebrow: 'Welcome',
        title: 'A lightweight social space',
        description:
          'Share updates, interact through likes and comments, check notifications, and chat in one place.',
        highlights: [
          'Publish and browse fresh posts',
          'Engage with likes and comments',
          'Manage messages and notifications'
        ],
        actionLabel: 'Got it'
      }
)
const introButtonLabel = computed(() => (uiStore.locale === 'zh' ? '网站介绍' : 'About this site'))

const shouldAutoOpenIntro = () => {
  if (props.currentUser) {
    return false
  }

  if (typeof window === 'undefined') {
    return true
  }

  return window.localStorage.getItem(INTRO_MODAL_STORAGE_KEY) !== '1'
}

const closeIntroModal = () => {
  showIntroModal.value = false

  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(INTRO_MODAL_STORAGE_KEY, '1')
}

const openIntroModal = () => {
  showIntroModal.value = true
}

const handleIntroKeydown = (event) => {
  if (event.key === 'Escape' && showIntroModal.value) {
    closeIntroModal()
  }
}

const handleSubmit = () => {
  emit('sign-in', {
    mode: form.mode,
    email: form.email.trim(),
    password: form.password,
    name: form.name.trim(),
    role: form.role.trim()
  })
}

const handleResendVerification = () => {
  emit('resend-verification', resolvedEmail.value)
}

onMounted(() => {
  showIntroModal.value = shouldAutoOpenIntro()

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleIntroKeydown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleIntroKeydown)
  }
})
</script>

<style scoped>
.auth-panel {
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 20px;
  background: var(--app-surface-elevated);
  box-shadow: 0 18px 40px rgba(111, 135, 180, 0.08);
}

.auth-panel h3 {
  margin-bottom: 0.9rem;
  color: var(--app-heading);
  font-size: 1.2rem;
  font-weight: 800;
}

.account-card {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.account-main {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.account-main strong {
  display: block;
  color: var(--app-heading);
}

.account-main small,
.account-hint {
  display: block;
  color: var(--app-text-soft);
}

.auth-avatar {
  display: grid;
  place-items: center;
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #2563eb, #60a5fa);
  color: white;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.auth-intro-trigger {
  display: flex;
  justify-content: flex-end;
}

.intro-btn {
  border: none;
  background: transparent;
  color: var(--app-accent);
  font-size: 0.88rem;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}

.auth-tabs {
  display: inline-flex;
  width: 100%;
  padding: 0.2rem;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.08);
}

.auth-tab {
  flex: 1;
  padding: 0.5rem 0.85rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--app-text-soft);
  cursor: pointer;
  transition: all 0.2s ease;
}

.auth-tab--active {
  background: var(--app-primary);
  color: white;
  font-weight: 700;
}

.auth-form input,
.auth-select {
  padding: 0.8rem 0.9rem;
  border: 1.5px solid var(--app-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  color: var(--app-heading);
  outline: none;
  transition: all 0.2s ease;
  font-size: inherit;
}

.auth-form input:focus,
.auth-select:focus {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  background: white;
}

.auth-select {
  appearance: none;
  cursor: pointer;
}

.form-status {
  padding: 0.72rem 0.85rem;
  border-radius: 12px;
  font-size: 0.92rem;
}

.form-status--error {
  border: 1px solid rgba(216, 91, 115, 0.22);
  background: rgba(216, 91, 115, 0.08);
  color: var(--app-danger);
}

.form-status--notice {
  border: 1px solid rgba(77, 141, 247, 0.2);
  background: rgba(77, 141, 247, 0.08);
  color: var(--app-accent);
}

.verification-help {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.8rem 0.85rem;
  border: 1px dashed rgba(77, 141, 247, 0.28);
  border-radius: 14px;
  background: rgba(244, 248, 255, 0.72);
}

.verification-help__text {
  color: var(--app-text-soft);
  font-size: 0.92rem;
}

.verification-help__btn {
  width: 100%;
  padding: 0.72rem 0.9rem;
  border: 1px solid rgba(77, 141, 247, 0.24);
  border-radius: 999px;
  background: white;
  color: var(--app-accent);
  font-weight: 700;
  cursor: pointer;
}

.verification-help__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.primary-btn,
.ghost-btn {
  padding: 0.78rem 1rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.primary-btn {
  border: none;
  background: var(--app-primary);
  color: white;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.primary-btn:hover:not(:disabled) {
  background: var(--app-primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ghost-btn {
  border: 1.5px solid var(--app-primary);
  background: rgba(255, 255, 255, 0.8);
  color: var(--app-primary);
}

.ghost-btn:hover:not(:disabled) {
  background: var(--app-accent-soft);
}

.intro-modal {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(14, 23, 43, 0.5);
}

.intro-modal__card {
  position: relative;
  width: min(100%, 30rem);
  padding: 1.1rem 1rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-surface-elevated);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.22);
}

.intro-modal__close {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 999px;
  background: var(--app-surface-soft);
  color: var(--app-text-soft);
  font-size: 0.95rem;
  cursor: pointer;
}

.intro-modal__eyebrow {
  color: var(--app-accent);
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.intro-modal h4 {
  margin-top: 0.35rem;
  color: var(--app-heading);
  font-size: 1.22rem;
  font-weight: 800;
}

.intro-modal__description {
  margin-top: 0.5rem;
  color: var(--app-text-soft);
}

.intro-modal__list {
  margin: 0.7rem 0 0;
  padding-left: 1.1rem;
  color: var(--app-heading);
  line-height: 1.55;
}

.intro-modal__action {
  width: 100%;
  margin-top: 0.8rem;
}

@media (max-width: 680px) {
  .auth-panel {
    border-radius: 18px;
  }

  .account-main {
    align-items: flex-start;
  }

  .auth-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .primary-btn,
  .ghost-btn {
    width: 100%;
  }

  .intro-modal__card {
    border-radius: 14px;
  }
}
</style>
