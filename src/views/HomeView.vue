<template>
  <AppShellLayout :current-user="authStore.currentUser">
    <AppHeader
      :title="uiStore.t('homeTitle')"
      :subtitle="uiStore.t('homeSubtitle')"
      :is-live="socialStore.isRealtimeActive"
    />

    <section class="home-overview">
      <div class="home-overview__copy">
        <p class="home-overview__eyebrow">{{ uiStore.t('homeTitle') }}</p>
        <h1>{{ uiStore.t('homeHeroTitle') }}</h1>
        <p>{{ uiStore.t('homeHeroText') }}</p>
      </div>

      <div class="home-overview__metrics">
        <article class="home-metric">
          <small>{{ uiStore.t('homeSummaryPostsLabel') }}</small>
          <strong>{{ userPostsCount }}</strong>
        </article>
        <article class="home-metric">
          <small>{{ uiStore.t('homeSummaryEngagementLabel') }}</small>
          <strong>{{ userInteractionsCount }}</strong>
        </article>
        <article class="home-metric">
          <small>{{ uiStore.t('postsInFeed') }}</small>
          <strong>{{ socialStore.posts.length }}</strong>
        </article>
      </div>
    </section>

    <section class="timeline-panel">
      <div class="timeline-panel__header">
        <button type="button" class="timeline-tab timeline-tab--active">
          {{ timelinePrimaryLabel }}
        </button>
        <span class="timeline-panel__count">
          {{ socialStore.posts.length }} {{ uiStore.t('postsInFeed') }}
        </span>
      </div>

      <PostBox
        :current-user="authStore.currentUser"
        :submitting="socialStore.publishing"
        @publish="handlePublish"
      />

      <p v-if="pageError" class="status-banner status-banner--error">
        {{ pageError }}
      </p>

      <PostFeed
        :posts="socialStore.posts"
        :loading="socialStore.loading"
        :commenting="socialStore.commenting"
        :deleting-post-id="socialStore.deletingPostId"
        :current-user="authStore.currentUser"
        @toggle-like="socialStore.likePost"
        @add-comment="handleComment"
        @delete-post="handleDeletePost"
      />
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

      <section class="trend-card">
        <h3>{{ uiStore.t('whatHappening') }}</h3>
        <div class="trend-list">
          <article v-for="item in homeHighlights" :key="item.topic" class="trend-list__item">
            <small>{{ formatHighlightMeta(item.count) }}</small>
            <strong>{{ item.topic }}</strong>
          </article>
        </div>
      </section>

      <section class="trend-card">
        <h3>{{ uiStore.t('homeSummaryTitle') }}</h3>
        <div class="trend-item">
          <small>{{ uiStore.t('homeSummaryPostsLabel') }}</small>
          <strong>{{ userPostsCount }} {{ uiStore.t('homeSummaryPostsValue') }}</strong>
        </div>
        <div class="trend-item">
          <small>{{ uiStore.t('homeSummaryEngagementLabel') }}</small>
          <strong>
            {{ userInteractionsCount }} {{ uiStore.t('homeSummaryEngagementValue') }}
          </strong>
        </div>
      </section>
    </template>
  </AppShellLayout>
</template>

<script setup>
import { computed } from 'vue'
import AppHeader from './AppHeader.vue'
import AppShellLayout from './AppShellLayout.vue'
import AuthPanel from './AuthPanel.vue'
import PostBox from './PostBox.vue'
import PostFeed from './PostFeed.vue'
import { useSocialViewLifecycle } from '@/composables/useSocialViewLifecycle'
import { useAuthStore } from '@/stores/auth'
import { useSocialStore } from '@/stores/social'
import { useUiStore } from '@/stores/ui'

const authStore = useAuthStore()
const socialStore = useSocialStore()
const uiStore = useUiStore()

useSocialViewLifecycle(socialStore)

const pageError = computed(() => socialStore.error)
const timelinePrimaryLabel = computed(() => (uiStore.locale === 'zh' ? '推荐' : 'For you'))
const homeHighlights = computed(() => {
  const topicCounts = socialStore.posts.reduce((summary, post) => {
    const topic = post.topic?.trim()

    if (!topic) {
      return summary
    }

    summary.set(topic, (summary.get(topic) || 0) + 1)
    return summary
  }, new Map())

  const items = [...topicCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([topic, count]) => ({ topic, count }))

  if (items.length) {
    return items
  }

  return [uiStore.t('homeCard1'), uiStore.t('homeCard2'), uiStore.t('homeCard3')].map((topic) => ({
    topic,
    count: 0
  }))
})
const userPosts = computed(() => {
  if (!authStore.currentUser) {
    return []
  }

  return socialStore.posts.filter(
    (post) => post.author === authStore.currentUser.name && post.role === authStore.currentUser.role
  )
})

const userPostsCount = computed(() => userPosts.value.length)
const userInteractionsCount = computed(() =>
  userPosts.value.reduce((sum, post) => sum + post.likes, 0)
)

const formatHighlightMeta = (count) => {
  if (!count) {
    return uiStore.t('navExplore')
  }

  return uiStore.locale === 'zh' ? `${count} 条相关内容` : `${count} related posts`
}

const handlePublish = async (payload) => {
  await socialStore.publishPost(payload)
}

const handleComment = async (postId, payload) => {
  await socialStore.commentOnPost(postId, payload)
}

const handleDeletePost = async (postId) => {
  await socialStore.removePost(postId, authStore.currentUser?.id)
}
</script>

<style scoped>
.home-overview,
.timeline-panel,
.trend-card {
  margin: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: var(--app-surface-elevated);
}

.home-overview {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem;
}

.home-overview__copy {
  flex: 1;
  min-width: min(100%, 18rem);
}

.home-overview__eyebrow {
  margin-bottom: 0.4rem;
  color: var(--app-accent);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-overview h1 {
  color: var(--app-heading);
  font-size: 1.45rem;
  font-weight: 800;
}

.home-overview p {
  margin-top: 0.45rem;
  color: var(--app-text-soft);
}

.home-overview__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  min-width: min(100%, 24rem);
}

.home-metric {
  padding: 0.95rem 1rem;
  border-radius: 16px;
  background: var(--app-surface-soft);
}

.home-metric small {
  display: block;
  color: var(--app-text-soft);
  margin-bottom: 0.22rem;
}

.home-metric strong {
  color: var(--app-heading);
  font-size: 1.3rem;
  font-weight: 800;
}

.timeline-panel {
  overflow: hidden;
}

.timeline-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.2rem 1rem;
  border-bottom: 1px solid var(--app-border);
}

.timeline-tab {
  min-height: 3rem;
  border: none;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: var(--app-text-soft);
  font-weight: 700;
}

.timeline-tab--active {
  border-bottom-color: var(--app-accent);
  color: var(--app-heading);
}

.timeline-panel__count {
  color: var(--app-text-soft);
  font-size: 0.88rem;
}

.trend-card {
  padding: 1rem;
}

.trend-card h3 {
  margin-bottom: 0.9rem;
  color: var(--app-heading);
  font-size: 1.12rem;
  font-weight: 800;
}

.trend-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.trend-list__item {
  padding-bottom: 0.9rem;
  border-bottom: 1px solid var(--app-border);
}

.trend-list__item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.trend-list__item small {
  display: block;
  margin-bottom: 0.2rem;
  color: var(--app-text-soft);
}

.trend-list__item strong {
  color: var(--app-heading);
}

.trend-item + .trend-item {
  margin-top: 1rem;
}

.trend-item small {
  display: block;
  color: var(--app-text-soft);
  margin-bottom: 0.18rem;
}

.trend-item strong {
  color: var(--app-heading);
  line-height: 1.45;
}

.status-banner {
  margin: 0 1rem 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(244, 33, 46, 0.16);
  border-radius: 12px;
  background: rgba(244, 33, 46, 0.08);
  color: var(--app-danger);
}

@media (max-width: 680px) {
  .home-overview,
  .timeline-panel,
  .trend-card,
  .status-banner {
    margin: 0.75rem;
  }

  .home-overview {
    padding: 1rem;
  }

  .home-overview h1 {
    font-size: 1.3rem;
  }

  .home-overview__metrics {
    grid-template-columns: 1fr;
    min-width: 100%;
  }

  .timeline-panel__header {
    padding: 0.15rem 0.8rem;
  }
}
</style>
