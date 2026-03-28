<template>
  <AppShellLayout :current-user="authStore.currentUser">
    <AppHeader
      :title="uiStore.t('notificationsTitle')"
      :subtitle="uiStore.t('notificationsSubtitle')"
      :is-live="socialStore.isRealtimeActive"
    />

    <section class="page-panel hero-panel">
      <h1>{{ uiStore.t('notificationsLead') }}</h1>
      <p>{{ uiStore.t('notificationsText') }}</p>
    </section>

    <section class="page-panel list-panel">
      <article v-for="item in notifications" :key="item.id" class="list-item">
        <small>{{ item.meta }}</small>
        <strong>{{ item.message }}</strong>
      </article>

      <article v-if="!notifications.length" class="list-item list-item--empty">
        <small>{{ uiStore.t('navNotifications') }}</small>
        <strong>{{ uiStore.t('notificationsEmpty') }}</strong>
      </article>
    </section>

    <template #sidebar>
      <AuthPanel
        :current-user="authStore.currentUser"
        :error="authStore.error"
        :notice="authStore.notice"
        :using-supabase="authStore.usingSupabase"
        :pending-verification-email="authStore.pendingVerificationEmail"
        :resend-cooldown-seconds="authStore.verificationCooldownSeconds"
        :resending="authStore.resendingVerification"
        :submitting="authStore.submitting"
        @sign-in="authStore.signIn"
        @resend-verification="authStore.resendSignupConfirmation"
        @sign-out="authStore.signOut"
      />
    </template>
  </AppShellLayout>
</template>

<script setup>
import { computed } from 'vue'
import AppHeader from './AppHeader.vue'
import AppShellLayout from './AppShellLayout.vue'
import AuthPanel from './AuthPanel.vue'
import { useSocialViewLifecycle } from '@/composables/useSocialViewLifecycle'
import { useAuthStore } from '@/stores/auth'
import { useSocialStore } from '@/stores/social'
import { useUiStore } from '@/stores/ui'

const authStore = useAuthStore()
const socialStore = useSocialStore()
const uiStore = useUiStore()

useSocialViewLifecycle(socialStore)

const formatReplyMessage = (comment) =>
  uiStore.locale === 'zh'
    ? `${comment.author} 回复了你：“${comment.content}”`
    : `${comment.author} replied to you: "${comment.content}"`

const notifications = computed(() => {
  if (!authStore.currentUser) {
    return []
  }

  const currentUser = authStore.currentUser

  return socialStore.posts
    .filter((post) =>
      post.authorId
        ? post.authorId === currentUser.id
        : post.author === currentUser.name && post.role === currentUser.role
    )
    .flatMap((post) =>
      post.comments
        .filter((comment) =>
          comment.authorId
            ? comment.authorId !== currentUser.id
            : comment.author !== currentUser.name || comment.role !== currentUser.role
        )
        .map((comment) => ({
          id: comment.id,
          createdAt: comment.createdAt,
          meta: uiStore.t('notificationReplyMeta'),
          message: formatReplyMessage(comment)
        }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})
</script>

<style scoped>
.page-panel {
  margin: 1rem;
  padding: 1.1rem;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: var(--app-surface-elevated);
}

.hero-panel h1 {
  color: var(--app-heading);
  font-size: 1.5rem;
  font-weight: 800;
}

.hero-panel p {
  margin-top: 0.45rem;
  color: var(--app-text-soft);
}

.list-panel {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.list-item {
  padding-bottom: 0.9rem;
  border-bottom: 1px solid var(--app-border);
}

.list-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.list-item--empty strong {
  color: var(--app-text-soft);
}

.list-item small {
  display: block;
  color: var(--app-text-soft);
  margin-bottom: 0.2rem;
}

.list-item strong {
  color: var(--app-heading);
}

@media (max-width: 680px) {
  .page-panel {
    margin: 0.75rem;
    padding: 1rem;
  }
}
</style>
