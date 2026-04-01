<template>
  <AppShellLayout :current-user="authStore.currentUser">
    <AppHeader
      :title="uiStore.t('exploreTitle')"
      :subtitle="uiStore.t('exploreSubtitle')"
      :is-live="socialStore.isRealtimeActive"
    />

    <section class="page-panel hero-panel">
      <h1>{{ uiStore.t('exploreLead') }}</h1>
      <p>{{ uiStore.t('exploreText') }}</p>
    </section>

    <section class="page-panel discover-panel">
      <div class="discover-head">
        <h2>{{ uiStore.t('exploreHotTitle') }}</h2>
        <p>{{ uiStore.t('exploreHotSubtitle') }}</p>
      </div>

      <PostFeed
        :posts="visiblePosts"
        :loading="socialStore.loading"
        :commenting="socialStore.commenting"
        :deleting-post-id="socialStore.deletingPostId"
        :current-user="authStore.currentUser"
        @toggle-like="socialStore.likePost"
        @add-comment="handleComment"
        @delete-post="handleDeletePost"
      />

      <div ref="loadMoreTrigger" class="discover-load-trigger" aria-hidden="true"></div>
      <button v-if="hasMore" class="load-more-btn" type="button" @click="loadMore">
        {{ uiStore.t('exploreLoadMore') }}
      </button>
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

      <section class="page-panel list-panel">
        <article v-for="item in exploreItems" :key="item" class="list-item">
          <small>{{ uiStore.t('navExplore') }}</small>
          <strong>{{ item }}</strong>
        </article>
      </section>
    </template>
  </AppShellLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  experienceKeywords,
  helpKeywords,
  roleStageAliases
} from '@/constants/userRoles'
import AppHeader from './AppHeader.vue'
import AppShellLayout from './AppShellLayout.vue'
import AuthPanel from './AuthPanel.vue'
import PostFeed from './PostFeed.vue'
import { useSocialViewLifecycle } from '@/composables/useSocialViewLifecycle'
import { useAuthStore } from '@/stores/auth'
import { useSocialStore } from '@/stores/social'
import { useUiStore } from '@/stores/ui'

const authStore = useAuthStore()
const socialStore = useSocialStore()
const uiStore = useUiStore()

useSocialViewLifecycle(socialStore)

const stageRank = {
  middle: 0,
  high: 1,
  college: 2,
  graduate: 3
}

const exploreItems = computed(() => [
  uiStore.t('exploreItem1'),
  uiStore.t('exploreItem2'),
  uiStore.t('exploreItem3')
])

const normalizeStage = (role) => roleStageAliases[role] || null
const getPostStage = (post) => normalizeStage(post.role)

const getStageMatchScore = (viewerStage, postStage) => {
  if (!viewerStage || !postStage) {
    return 0.45
  }

  const gap = Math.abs(stageRank[viewerStage] - stageRank[postStage])

  if (gap === 0) {
    return 1
  }

  if (gap === 1) {
    return 0.78
  }

  if (gap === 2) {
    return 0.52
  }

  return 0.34
}

const getHelpScore = (viewerStage, post, postStage) => {
  const text = `${post.topic} ${post.content}`.toLowerCase()
  const hasHelpIntent = helpKeywords.some((keyword) => text.includes(keyword.toLowerCase()))
  const hasExperienceIntent = experienceKeywords.some((keyword) =>
    text.includes(keyword.toLowerCase())
  )

  if (!viewerStage || !postStage) {
    return hasHelpIntent || hasExperienceIntent ? 0.55 : 0.2
  }

  const viewerRank = stageRank[viewerStage]
  const postRank = stageRank[postStage]
  const upwardGap = postRank - viewerRank
  const downwardGap = viewerRank - postRank

  let score = 0.18

  if (hasExperienceIntent && upwardGap > 0) {
    score += 0.55
  }

  if (hasHelpIntent && upwardGap > 0) {
    score += 0.45
  }

  if (hasHelpIntent && downwardGap > 0) {
    score += 0.3
  }

  if (hasExperienceIntent && downwardGap > 0) {
    score += 0.18
  }

  if (viewerStage === postStage) {
    score += hasHelpIntent || hasExperienceIntent ? 0.15 : 0.08
  }

  return Math.min(score, 1)
}

const getHeatScore = (post) => {
  const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60)
  const rawHeat = post.likes * 2 + post.commentsCount * 3
  const decay = Math.min(ageHours * 0.08, 3)

  return Math.max(rawHeat - decay, 0)
}

const RANK_POOL = 60

const hotPosts = computed(() =>
  [...socialStore.posts]
    .sort((a, b) => {
      const viewerStage = normalizeStage(authStore.currentUser?.role)
      const scoreA =
        getHeatScore(a) * 0.4 +
        getStageMatchScore(viewerStage, getPostStage(a)) * 12 * 0.35 +
        getHelpScore(viewerStage, a, getPostStage(a)) * 12 * 0.25
      const scoreB =
        getHeatScore(b) * 0.4 +
        getStageMatchScore(viewerStage, getPostStage(b)) * 12 * 0.35 +
        getHelpScore(viewerStage, b, getPostStage(b)) * 12 * 0.25

      if (scoreA !== scoreB) {
        return scoreB - scoreA
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    .slice(0, RANK_POOL)
)

const INITIAL_POSTS = 8
const LOAD_STEP = 6
const visibleCount = ref(INITIAL_POSTS)
const loadMoreTrigger = ref(null)
let loadMoreObserver = null

const visiblePosts = computed(() => hotPosts.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < hotPosts.value.length)

const ensureVisibleCountWithinBounds = (nextList = []) => {
  const minimum = Math.min(nextList.length, INITIAL_POSTS)
  const maximum = nextList.length || INITIAL_POSTS

  if (visibleCount.value < minimum) {
    visibleCount.value = minimum
  } else if (visibleCount.value > maximum) {
    visibleCount.value = maximum
  }
}

const loadMore = () => {
  if (!hasMore.value) {
    return
  }

  visibleCount.value = Math.min(
    hotPosts.value.length,
    visibleCount.value + LOAD_STEP
  )
}

const setupIntersectionLoad = () => {
  if (typeof IntersectionObserver === 'undefined' || !loadMoreTrigger.value) {
    return
  }

  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      const shouldLoad = entries.some((entry) => entry.isIntersecting)

      if (shouldLoad) {
        loadMore()
      }
    },
    {
      rootMargin: '120px 0px'
    }
  )

  loadMoreObserver.observe(loadMoreTrigger.value)
}

const teardownIntersectionLoad = () => {
  if (loadMoreObserver) {
    loadMoreObserver.disconnect()
    loadMoreObserver = null
  }
}

watch(
  hotPosts,
  (next) => {
    ensureVisibleCountWithinBounds(next)
  },
  { immediate: true }
)

watch(
  loadMoreTrigger,
  () => {
    teardownIntersectionLoad()
    setupIntersectionLoad()
  },
  { flush: 'post' }
)

onMounted(() => {
  setupIntersectionLoad()
})

onBeforeUnmount(() => {
  teardownIntersectionLoad()
})

const handleComment = async (postId, payload) => {
  await socialStore.commentOnPost(postId, payload)
}

const handleDeletePost = async (postId) => {
  await socialStore.removePost(postId, authStore.currentUser?.id)
}
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

.discover-panel {
  padding: 0;
  overflow: hidden;
}

.discover-load-trigger {
  height: 1px;
  width: 100%;
}

.load-more-btn {
  display: block;
  width: min(18rem, 100%);
  margin: 0.5rem auto 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-surface-elevated);
  color: var(--app-heading);
  font-weight: 700;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.load-more-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.06);
}

.load-more-btn:active {
  transform: translateY(0);
  box-shadow: none;
}

.discover-head {
  padding: 1.1rem 1.1rem 0.85rem;
  border-bottom: 1px solid var(--app-border);
}

.discover-head h2 {
  color: var(--app-heading);
  font-size: 1.2rem;
  font-weight: 800;
}

.discover-head p {
  margin-top: 0.35rem;
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

  .discover-panel {
    padding: 0;
  }

  .load-more-btn {
    width: 100%;
    margin: 0.25rem 0 0.65rem;
  }
}
</style>
