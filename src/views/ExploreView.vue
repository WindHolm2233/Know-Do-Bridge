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

    <section class="page-panel insight-panel">
      <div class="insight-panel__head">
        <div>
          <p class="insight-panel__eyebrow">{{ uiStore.t('exploreInsightTitle') }}</p>
          <h2>{{ uiStore.t('exploreInsightSubtitle') }}</h2>
        </div>
        <span class="insight-panel__pill">
          {{ discovery.totalPosts }} {{ uiStore.t('postsInFeed') }}
        </span>
      </div>

      <div class="insight-grid">
        <article class="insight-card">
          <small>{{ uiStore.t('exploreInsightBestMatch') }}</small>
          <strong>{{ bestMatchTitle }}</strong>
          <p>{{ bestMatchText }}</p>
        </article>

        <article class="insight-card">
          <small>{{ uiStore.t('exploreInsightCrossGrade') }}</small>
          <strong>{{ discovery.crossGradeOpportunities.length }}</strong>
          <p>{{ crossGradeText }}</p>
        </article>

        <article class="insight-card">
          <small>{{ uiStore.t('exploreInsightTopics') }}</small>
          <div class="topic-badges">
            <span v-for="topic in discovery.topTopics" :key="topic.topic" class="topic-badge">
              {{ topic.topic }} | {{ topic.count }}
            </span>
          </div>
        </article>
      </div>
    </section>

    <section class="page-panel track-panel">
      <div class="track-panel__head">
        <div>
          <p class="track-panel__eyebrow">{{ uiStore.t('exploreTracksTitle') }}</p>
          <h2>{{ uiStore.t('exploreTracksTitle') }}</h2>
          <p>{{ uiStore.t('exploreTracksSubtitle') }}</p>
        </div>

        <button
          v-if="activeChannel"
          type="button"
          class="track-panel__clear"
          @click="clearSelectedChannel"
        >
          {{ uiStore.t('exploreTrackClear') }}
        </button>
      </div>

      <div class="track-grid">
        <article
          v-for="(item, index) in discoveryTracks"
          :key="item.key"
          :class="['track-card', { 'track-card--active': activeChannel?.key === item.key }]"
        >
          <div class="track-card__top">
            <span class="track-card__index">0{{ index + 1 }}</span>
            <span class="track-card__count">{{ item.count }} {{ uiStore.t('postsInFeed') }}</span>
          </div>

          <h3>{{ item.label }}</h3>
          <p class="track-card__description">{{ item.description }}</p>
          <p class="track-card__summary">{{ item.summary }}</p>

          <div class="track-card__meta">
            <span>{{ item.meta }}</span>
            <strong v-if="activeChannel?.key === item.key">{{ uiStore.t('exploreTrackSelected') }}</strong>
          </div>

          <div class="track-card__actions">
            <button type="button" class="track-card__button" @click="applyPush(item)">
              {{ uiStore.t('exploreTrackOpen') }}
            </button>
            <button type="button" class="track-card__ghost" @click="openDraftComposer(item)">
              {{ uiStore.t('exploreTrackCompose') }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section ref="discoverPanelRef" class="page-panel discover-panel">
      <div class="discover-head">
        <div>
          <h2>{{ uiStore.t('exploreHotTitle') }}</h2>
          <p>{{ uiStore.t('exploreHotSubtitle') }}</p>
        </div>

        <div class="filter-strip">
          <button
            v-for="item in filterItems"
            :key="item.key"
            :class="['filter-chip', { 'filter-chip--active': selectedLens === item.key }]"
            type="button"
            @click="selectedLens = item.key"
          >
            {{ item.label }}
            <span class="filter-chip__count">{{ item.count }}</span>
          </button>
        </div>
      </div>

      <div v-if="activeChannel" class="discover-active-track">
        <span>{{ uiStore.t('exploreTrackSelected') }}</span>
        <strong>{{ activeChannel.label }}</strong>
        <button type="button" @click="clearSelectedChannel">
          {{ uiStore.t('exploreTrackClear') }}
        </button>
      </div>

      <p v-if="pageError" class="status-banner status-banner--error">
        {{ pageError }}
      </p>

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

      <section class="page-panel push-panel push-panel--expanded">
        <div class="push-panel__head">
          <div>
            <p class="push-panel__eyebrow">{{ uiStore.t('exploreQuickEyebrow') }}</p>
            <h3>{{ uiStore.t('exploreQuickTitle') }}</h3>
            <p class="push-panel__subtitle">{{ pushPanelSummary }}</p>
          </div>
          <button
            v-if="activeChannel"
            type="button"
            class="push-panel__clear"
            @click="clearSelectedChannel"
          >
            {{ uiStore.t('exploreTrackClear') }}
          </button>
        </div>
        <div class="push-panel__stats">
          <span class="push-panel__stat">{{ pushChannelsTotal }} {{ uiStore.t('postsInFeed') }}</span>
          <span v-if="hottestChannel" class="push-panel__stat">
            {{ uiStore.locale === 'zh' ? `\u70ed\u95e8\u5165\u53e3\uff1a${hottestChannel.label}` : `Hot lane: ${hottestChannel.label}` }}
          </span>
        </div>

        <div class="push-stream">
          <article
            v-for="(item, index) in pushChannels"
            :key="item.key"
            :class="[
              'push-stream__card',
              `push-stream__card--${item.key}`,
              { 'push-stream__card--active': activeChannel?.key === item.key }
            ]"
            :style="{ '--lane-delay': `${index * 45}ms` }"
            role="button"
            tabindex="0"
            :aria-pressed="activeChannel?.key === item.key"
            @click="applyPush(item)"
            @keydown.enter.prevent="applyPush(item)"
            @keydown.space.prevent="applyPush(item)"
          >
            <div class="push-stream__rail" aria-hidden="true">
              <span class="push-stream__dot"></span>
              <span v-if="index !== pushChannels.length - 1" class="push-stream__line"></span>
            </div>

            <div class="push-stream__body">
              <div class="push-stream__head">
                <div class="push-stream__identity">
                  <div class="push-stream__icon">
                    {{ index + 1 }}
                  </div>
                  <div>
                    <p class="push-stream__eyebrow">{{ uiStore.t('navExplore') }}</p>
                    <strong>{{ item.label }}</strong>
                  </div>
                </div>
                <span class="push-stream__count">{{ item.count }} {{ uiStore.t('postsInFeed') }}</span>
              </div>
              <p v-if="activeChannel?.key === item.key" class="push-stream__selected">
                {{ uiStore.t('exploreTrackSelected') }}
              </p>

              <p class="push-stream__summary">{{ item.summary }}</p>
              <p class="push-stream__meta">{{ item.meta }}</p>
              <div class="push-stream__meter">
                <span class="push-stream__meter-track">
                  <span class="push-stream__meter-fill" :style="{ width: `${item.coverage}%` }"></span>
                </span>
                <small>{{ item.coverage }}%</small>
              </div>

              <div class="push-stream__actions">
                <button type="button" class="push-stream__button" @click.stop="openDraftComposer(item)">
                  {{ uiStore.t('exploreTrackCompose') }}
                </button>
                <button type="button" class="push-stream__ghost" @click.stop="applyPush(item)">
                  {{ uiStore.t('exploreTrackOpen') }}
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>
  </AppShellLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from './AppHeader.vue'
import AppShellLayout from './AppShellLayout.vue'
import AuthPanel from './AuthPanel.vue'
import PostFeed from './PostFeed.vue'
import { useSocialViewLifecycle } from '@/composables/useSocialViewLifecycle'
import { useAuthStore } from '@/stores/auth'
import { useSocialStore } from '@/stores/social'
import { useUiStore } from '@/stores/ui'
import { buildDiscoveryInsights, formatPostTypeLabel } from '@/utils/recommendationEngine'

const authStore = useAuthStore()
const socialStore = useSocialStore()
const uiStore = useUiStore()
const router = useRouter()

useSocialViewLifecycle(socialStore)

const INITIAL_POSTS = 8
const LOAD_STEP = 6
const selectedLens = ref('all')
const selectedChannel = ref('')
const visibleCount = ref(INITIAL_POSTS)
const loadMoreTrigger = ref(null)
const discoverPanelRef = ref(null)
let loadMoreObserver = null

const discovery = computed(() =>
  buildDiscoveryInsights(socialStore.posts, authStore.currentUser?.role, uiStore.locale)
)
const pageError = computed(() => socialStore.error)

const channelDefinitions = computed(() => [
  {
    key: 'exam_exchange',
    priority: 1,
    label: uiStore.t('exploreItem1'),
    description: uiStore.t('exploreTrackDescription1'),
    keywords: [
      '\u8d44\u6599',
      '\u7b14\u8bb0',
      '\u590d\u4e60',
      '\u9898\u5e93',
      '\u8003\u524d',
      '\u4e92\u6362',
      '\u771f\u9898',
      'exchange',
      'revision',
      'notes',
      'exam',
      'paper'
    ],
    draftTopic: uiStore.t('exploreItem1'),
    draftContent:
      uiStore.locale === 'zh'
        ? '\u7528\u8fd9\u6761\u5e16\u5b50\u4ea4\u6362\u590d\u4e60\u8d44\u6599\u3001\u7b14\u8bb0\u3001\u771f\u9898\u6216\u8003\u524d\u6e05\u5355\u3002\u5199\u6e05\u8bfe\u7a0b\u3001\u5e74\u7ea7\u548c\u4f60\u80fd\u63d0\u4f9b\u7684\u5185\u5bb9\uff0c\u66f4\u5bb9\u6613\u5339\u914d\u5230\u4eba\u3002'
        : 'Use this post to exchange revision notes, past papers, or exam prep checklists. Mention the course, level, and what you can share.'
  },
  {
    key: 'team_request',
    priority: 2,
    label: uiStore.t('exploreItem2'),
    description: uiStore.t('exploreTrackDescription2'),
    keywords: [
      '\u9879\u76ee',
      '\u6bd4\u8d5b',
      '\u7ec4\u961f',
      '\u961f\u53cb',
      '\u5408\u4f5c',
      '\u62db\u52df',
      '\u627e\u4eba',
      'team',
      'project',
      'hackathon',
      'competition',
      'collaboration'
    ],
    draftTopic: uiStore.t('exploreItem2'),
    draftContent:
      uiStore.locale === 'zh'
        ? '\u6b63\u5728\u627e\u9879\u76ee\u642d\u5b50\u3001\u6bd4\u8d5b\u961f\u53cb\u6216\u6280\u80fd\u4e92\u8865\u7684\u5408\u4f5c\u4f19\u4f34\uff1f\u53ef\u4ee5\u8bf4\u660e\u76ee\u6807\u3001\u65f6\u95f4\u5b89\u6392\u548c\u4f60\u80fd\u8d1f\u8d23\u7684\u90e8\u5206\u3002'
        : 'Looking for project collaborators or competition teammates. Share your goal, timing, and what you can contribute.'
  },
  {
    key: 'club_recruitment',
    priority: 3,
    label: uiStore.t('exploreItem3'),
    description: uiStore.t('exploreTrackDescription3'),
    keywords: [
      '\u793e\u56e2',
      '\u62db\u65b0',
      '\u7eb3\u65b0',
      '\u62a5\u540d',
      '\u6d3b\u52a8',
      '\u7ebf\u4e0b',
      '\u8bb2\u5ea7',
      '\u5de5\u4f5c\u574a',
      'club',
      'event',
      'offline',
      'meetup'
    ],
    draftTopic: uiStore.t('exploreItem3'),
    draftContent:
      uiStore.locale === 'zh'
        ? '\u6b22\u8fce\u53d1\u5e03\u793e\u56e2\u62db\u65b0\u3001\u6d3b\u52a8\u62a5\u540d\u3001\u7ebf\u4e0b\u89c1\u9762\u6216\u6821\u56ed\u6d3b\u52a8\u9884\u544a\uff0c\u5199\u6e05\u65f6\u95f4\u3001\u5730\u70b9\u548c\u53c2\u4e0e\u65b9\u5f0f\uff0c\u66f4\u5bb9\u6613\u5f97\u5230\u56de\u590d\u3002'
        : 'Share club recruitment, event sign-ups, or offline meetups. Include the time, location, and how to join.'
  }
])

const getChannelDefinition = (channelKey) =>
  channelDefinitions.value.find((item) => item.key === channelKey) || null

const matchesChannel = (post, channelKey) => {
  const channel = getChannelDefinition(channelKey)

  if (!channel) {
    return true
  }

  const haystack = `${post.topic || ''} ${post.content || ''}`.toLowerCase()
  return channel.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))
}

const filterPostsByChannel = (posts, channelKey) =>
  channelKey ? posts.filter((post) => matchesChannel(post, channelKey)) : posts

const buildTrackSummary = (post, fallback) => {
  if (!post) {
    return fallback
  }

  const content = `${post.content || ''}`.trim().replace(/\s+/g, ' ')
  return content.length > 96 ? `${content.slice(0, 96).trim()}...` : content
}

const discoveryTotalPosts = computed(() => Math.max(1, discovery.value.rankedPosts.length))

const discoveryTracks = computed(() =>
  channelDefinitions.value.map((channel) => {
    const matchedPosts = filterPostsByChannel(discovery.value.rankedPosts, channel.key)
    const leadPost = matchedPosts[0] || null
    const coverage = Math.round((matchedPosts.length / discoveryTotalPosts.value) * 100)

    return {
      ...channel,
      count: matchedPosts.length,
      coverage,
      summary: buildTrackSummary(leadPost, channel.description),
      meta: leadPost
        ? `${leadPost.author} | ${leadPost.topic || formatPostTypeLabel(leadPost.postType, uiStore.locale)}`
        : uiStore.t('exploreTrackEmpty')
    }
  })
)

const activeChannel = computed(() =>
  discoveryTracks.value.find((item) => item.key === selectedChannel.value) || null
)

const channelRankedPosts = computed(() =>
  filterPostsByChannel(discovery.value.rankedPosts, selectedChannel.value)
)

const channelTypeCounts = computed(() =>
  channelRankedPosts.value.reduce((summary, post) => {
    summary[post.postType] = (summary[post.postType] || 0) + 1
    return summary
  }, {})
)

const filterItems = computed(() => [
  {
    key: 'all',
    label: uiStore.t('exploreFilterAll'),
    count: channelRankedPosts.value.length
  },
  {
    key: 'guidance',
    label: uiStore.t('exploreFilterGuidance'),
    count: channelTypeCounts.value.seek_guidance || 0
  },
  {
    key: 'practice',
    label: uiStore.t('exploreFilterPractice'),
    count: channelTypeCounts.value.seek_practice || 0
  },
  {
    key: 'experience',
    label: uiStore.t('exploreFilterExperience'),
    count: channelTypeCounts.value.share_experience || 0
  },
  {
    key: 'discussion',
    label: uiStore.t('exploreFilterDiscussion'),
    count: channelTypeCounts.value.general || 0
  }
])

const lensPostTypeMap = {
  all: '',
  guidance: 'seek_guidance',
  practice: 'seek_practice',
  experience: 'share_experience',
  discussion: 'general'
}

const rankedPosts = computed(() => {
  const targetType = lensPostTypeMap[selectedLens.value]

  if (!targetType) {
    return channelRankedPosts.value
  }

  return channelRankedPosts.value.filter((post) => post.postType === targetType)
})

const pushChannels = computed(() =>
  [...discoveryTracks.value].sort((left, right) => right.count - left.count || left.priority - right.priority)
)
const pushChannelsTotal = computed(() =>
  pushChannels.value.reduce((sum, item) => sum + item.count, 0)
)
const hottestChannel = computed(() => pushChannels.value.find((item) => item.count > 0) || null)
const visiblePosts = computed(() => rankedPosts.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < rankedPosts.value.length)
const pushPanelSummary = computed(() => {
  if (activeChannel.value) {
    return uiStore.locale === 'zh'
      ? `\u5f53\u524d\u5df2\u7b5b\u9009\uff1a${activeChannel.value.label}\uff08${channelRankedPosts.value.length} \u6761\uff09`
      : `Now filtered: ${activeChannel.value.label} (${channelRankedPosts.value.length})`
  }

  if (hottestChannel.value?.count) {
    return uiStore.locale === 'zh'
      ? `\u5efa\u8bae\u5148\u770b ${hottestChannel.value.label}\uff0c\u5f53\u524d\u70ed\u5ea6\u6700\u9ad8\u3002`
      : `Start with ${hottestChannel.value.label}, it is currently the hottest lane.`
  }

  const total = pushChannelsTotal.value
  return uiStore.locale === 'zh'
    ? `\u70b9\u51fb\u4efb\u610f\u5165\u53e3\u53ef\u5feb\u901f\u7b5b\u9009\u4e3b\u5185\u5bb9\u6d41\uff08\u5171 ${total} \u6761\uff09`
    : `Tap any lane to filter the main feed quickly (${total} total posts)`
})

const bestMatchTitle = computed(() => {
  if (!discovery.value.bestPost) {
    return uiStore.t('exploreInsightEmpty')
  }

  return `${formatPostTypeLabel(discovery.value.bestPost.postType, uiStore.locale)} · ${
    discovery.value.bestPost.topic
  }`
})

const bestMatchText = computed(() => {
  if (!discovery.value.bestPost) {
    return uiStore.t('exploreInsightEmptyText')
  }

  return uiStore.locale === 'zh'
    ? '\u8fd9\u662f\u5f53\u524d\u6700\u503c\u5f97\u4f18\u5148\u6253\u5f00\u7684\u4e00\u6761\u5185\u5bb9\u3002'
    : 'This is the strongest match to open with right now.'
})

const crossGradeText = computed(() => {
  if (!discovery.value.crossGradeOpportunities.length) {
    return uiStore.locale === 'zh'
      ? '\u5f53\u524d\u8fd8\u6ca1\u6709\u660e\u663e\u7684\u8de8\u5e74\u7ea7\u4f18\u5148\u5185\u5bb9\uff0c\u53ef\u4ee5\u6362\u4e00\u4e2a\u7b5b\u9009\u518d\u770b\u770b\u3002'
      : 'No obvious cross-grade picks yet. Try a different filter.'
  }

  return uiStore.locale === 'zh'
    ? '\u8fd9\u4e9b\u5185\u5bb9\u66f4\u5bb9\u6613\u628a\u4e0d\u540c\u9636\u6bb5\u7684\u540c\u5b66\u8fde\u63a5\u8d77\u6765\u3002'
    : 'These posts are more likely to connect students across stages.'
})

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

  visibleCount.value = Math.min(rankedPosts.value.length, visibleCount.value + LOAD_STEP)
}

const setupIntersectionLoad = () => {
  if (typeof IntersectionObserver === 'undefined' || !loadMoreTrigger.value) {
    return
  }

  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
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

const scrollToDiscoverPanel = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.requestAnimationFrame(() => {
    discoverPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

watch(
  rankedPosts,
  (next) => {
    ensureVisibleCountWithinBounds(next)
  },
  { immediate: true }
)

watch(selectedLens, () => {
  visibleCount.value = INITIAL_POSTS
})

watch(selectedChannel, () => {
  visibleCount.value = INITIAL_POSTS
})

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

const applyPush = (item) => {
  selectedLens.value = 'all'
  selectedChannel.value = selectedChannel.value === item.key ? '' : item.key
  scrollToDiscoverPanel()
}

const clearSelectedChannel = () => {
  selectedChannel.value = ''
}

const openDraftComposer = (item) => {
  router.push({
    path: '/',
    query: {
      draftPreset: item.key,
      draftTopic: item.draftTopic,
      draftContent: item.draftContent
    }
  })
}

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

.insight-panel {
  background:
    radial-gradient(circle at top right, rgba(107, 201, 255, 0.16), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(245, 249, 255, 0.94));
}

.insight-panel__head,
.track-panel__head,
.discover-head,
.push-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.insight-panel__eyebrow,
.track-panel__eyebrow,
.push-panel__eyebrow {
  color: var(--app-accent);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.insight-panel__head h2,
.track-panel__head h2,
.discover-head h2,
.push-panel__head h3 {
  color: var(--app-heading);
  font-size: 1.18rem;
  font-weight: 800;
}

.track-panel__head p:last-child,
.discover-head p,
.insight-card p,
.push-stream__summary,
.push-stream__meta,
.track-card__description,
.track-card__meta span {
  color: var(--app-text-soft);
}

.track-panel__head p:last-child,
.discover-head p {
  margin-top: 0.35rem;
}

.insight-panel__pill,
.track-card__count,
.push-stream__count {
  flex-shrink: 0;
  padding: 0.32rem 0.6rem;
  border-radius: 999px;
  background: rgba(79, 105, 206, 0.08);
  color: var(--app-primary-dark);
  font-size: 0.82rem;
  font-weight: 700;
}

.insight-grid,
.track-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 1rem;
}

.insight-card,
.track-card {
  padding: 0.95rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
}

.insight-card small {
  display: block;
  color: var(--app-text-soft);
}

.insight-card strong,
.track-card h3 {
  display: block;
  margin-top: 0.35rem;
  color: var(--app-heading);
  font-size: 1.05rem;
  font-weight: 800;
}

.insight-card p {
  margin-top: 0.35rem;
  line-height: 1.55;
}

.topic-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.65rem;
}

.topic-badge {
  padding: 0.42rem 0.66rem;
  border-radius: 999px;
  background: rgba(79, 105, 206, 0.08);
  color: var(--app-primary-dark);
  font-size: 0.84rem;
  font-weight: 700;
}

.track-panel__clear,
.discover-active-track button,
.track-card__button,
.track-card__ghost,
.filter-chip,
.load-more-btn,
.push-stream__button,
.push-stream__ghost {
  cursor: pointer;
}

.track-panel__clear {
  flex-shrink: 0;
  min-height: 2.45rem;
  padding: 0.6rem 0.95rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--app-heading);
  font-weight: 700;
}

.track-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 249, 255, 0.94));
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.04);
}

.track-card--active,
.push-stream__card--active {
  border-color: rgba(37, 99, 235, 0.22);
  box-shadow: 0 16px 28px rgba(37, 99, 235, 0.12);
}

.track-card__top,
.track-card__meta,
.push-stream__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.track-card__index {
  color: var(--app-accent);
  font-size: 0.8rem;
  font-weight: 800;
}

.track-card__description,
.track-card__summary,
.push-stream__summary {
  line-height: 1.55;
}

.track-card__summary {
  min-height: 4.8rem;
  color: var(--app-heading);
}

.track-card__meta strong {
  color: var(--app-primary-dark);
  font-size: 0.8rem;
  font-weight: 800;
}

.track-card__actions,
.push-stream__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: auto;
}

.track-card__button,
.track-card__ghost,
.push-stream__button,
.push-stream__ghost {
  min-height: 2.35rem;
  padding: 0.58rem 0.88rem;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 800;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    background-color 120ms ease,
    border-color 120ms ease;
}

.track-card__button,
.push-stream__button {
  border: none;
  background: linear-gradient(135deg, #2563eb, #60a5fa);
  color: white;
  box-shadow: 0 12px 22px rgba(37, 99, 235, 0.18);
}

.track-card__ghost,
.push-stream__ghost {
  border: 1px solid rgba(37, 99, 235, 0.16);
  background: rgba(37, 99, 235, 0.06);
  color: var(--app-primary-dark);
}

.track-card__button:hover,
.track-card__ghost:hover,
.push-stream__button:hover,
.push-stream__ghost:hover,
.load-more-btn:hover {
  transform: translateY(-1px);
}

.discover-panel {
  padding: 0;
  overflow: hidden;
}

.discover-active-track {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--app-border);
  background: rgba(37, 99, 235, 0.06);
}

.discover-active-track span,
.discover-active-track button {
  color: var(--app-primary-dark);
  font-size: 0.8rem;
  font-weight: 800;
}

.discover-active-track strong {
  flex: 1;
  min-width: 0;
  color: var(--app-heading);
}

.discover-active-track button {
  padding: 0;
  border: none;
  background: transparent;
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
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.discover-head {
  padding: 1.1rem 1.1rem 0.85rem;
  border-bottom: 1px solid var(--app-border);
}

.filter-strip {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.45rem;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.52rem 0.8rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--app-text);
  font-size: 0.86rem;
  font-weight: 700;
}

.filter-chip--active {
  border-color: rgba(79, 105, 206, 0.22);
  background: rgba(79, 105, 206, 0.08);
  color: var(--app-primary-dark);
}

.filter-chip__count {
  padding: 0.16rem 0.38rem;
  border-radius: 999px;
  background: rgba(79, 105, 206, 0.12);
  font-size: 0.72rem;
}

.push-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.14), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 250, 255, 0.96));
}

.push-panel--expanded {
  flex: 1;
  min-height: 0;
}

.push-panel__subtitle {
  margin-top: 0.38rem;
  color: var(--app-text-soft);
  font-size: 0.82rem;
  line-height: 1.5;
  max-width: 34ch;
}

.push-panel__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.46rem;
  margin-top: 0.78rem;
}

.push-panel__stat {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.34rem 0.68rem;
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.74);
  color: var(--app-primary-dark);
  font-size: 0.76rem;
  font-weight: 700;
  backdrop-filter: blur(2px);
}

.push-panel__stat::before {
  content: '';
  width: 0.36rem;
  height: 0.36rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #1d4ed8, #60a5fa);
}

.push-panel__clear {
  flex-shrink: 0;
  min-height: 2.25rem;
  padding: 0.5rem 0.86rem;
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: var(--app-primary-dark);
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 140ms ease,
    background-color 140ms ease,
    border-color 140ms ease;
}

.push-panel__clear:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.28);
  background: rgba(37, 99, 235, 0.13);
}

.push-panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 0.35rem;
  background: linear-gradient(90deg, #2563eb, #60a5fa, #22c55e);
}

.push-stream {
  flex: 1;
  display: grid;
  align-content: start;
  gap: 0.7rem;
  margin-top: 1rem;
  padding-right: 0.12rem;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(37, 99, 235, 0.28) transparent;
}

.push-stream__card {
  --lane-gradient: linear-gradient(135deg, #1d4ed8, #60a5fa);
  --lane-halo: rgba(37, 99, 235, 0.1);
  --lane-shadow: rgba(37, 99, 235, 0.2);
  --lane-line: rgba(37, 99, 235, 0.3);
  --lane-chip: rgba(37, 99, 235, 0.08);

  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.85rem;
  padding: 0.9rem 0.95rem;
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 18px;
  cursor: pointer;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(244, 248, 255, 0.96));
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.05);
  transition:
    transform 170ms ease,
    border-color 170ms ease,
    box-shadow 170ms ease;
  animation: push-card-in 340ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--lane-delay, 0ms);
}

.push-stream__card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 0.24rem;
  border-radius: 18px 0 0 18px;
  background: var(--lane-gradient);
}

.push-stream__card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0) 38%,
    rgba(255, 255, 255, 0.52) 52%,
    rgba(255, 255, 255, 0) 66%
  );
  transform: translateX(-130%);
  transition: transform 320ms ease;
  pointer-events: none;
}

.push-stream__card:hover {
  transform: translateY(-2px);
  border-color: rgba(37, 99, 235, 0.26);
  box-shadow: 0 18px 28px rgba(37, 99, 235, 0.12);
}

.push-stream__card:hover::after {
  transform: translateX(125%);
}

.push-stream__card:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.4);
  outline-offset: 2px;
}

.push-stream__card--active {
  border-color: rgba(37, 99, 235, 0.24);
  background: linear-gradient(180deg, rgba(238, 246, 255, 0.98), rgba(234, 245, 255, 0.96));
  box-shadow: 0 18px 30px rgba(37, 99, 235, 0.15);
}

.push-stream__card--exam_exchange {
  --lane-gradient: linear-gradient(135deg, #0284c7, #2563eb);
  --lane-halo: rgba(2, 132, 199, 0.14);
  --lane-shadow: rgba(2, 132, 199, 0.22);
  --lane-line: rgba(2, 132, 199, 0.34);
  --lane-chip: rgba(2, 132, 199, 0.1);
}

.push-stream__card--team_request {
  --lane-gradient: linear-gradient(135deg, #0f766e, #22c55e);
  --lane-halo: rgba(15, 118, 110, 0.14);
  --lane-shadow: rgba(34, 197, 94, 0.22);
  --lane-line: rgba(34, 197, 94, 0.34);
  --lane-chip: rgba(34, 197, 94, 0.1);
}

.push-stream__card--club_recruitment {
  --lane-gradient: linear-gradient(135deg, #ea580c, #f97316);
  --lane-halo: rgba(249, 115, 22, 0.16);
  --lane-shadow: rgba(234, 88, 12, 0.24);
  --lane-line: rgba(249, 115, 22, 0.36);
  --lane-chip: rgba(249, 115, 22, 0.12);
}

.push-stream__rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 0.2rem;
}

.push-stream__dot {
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 999px;
  background: var(--lane-gradient);
  box-shadow: 0 0 0 5px var(--lane-halo);
}

.push-stream__line {
  width: 2px;
  flex: 1;
  min-height: 2.4rem;
  margin-top: 0.35rem;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--lane-line), rgba(255, 255, 255, 0));
}

.push-stream__body {
  min-width: 0;
}

.push-stream__identity {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  min-width: 0;
}

.push-stream__icon {
  display: grid;
  place-items: center;
  width: 2.15rem;
  height: 2.15rem;
  flex-shrink: 0;
  border-radius: 0.8rem;
  background: var(--lane-gradient);
  color: white;
  font-size: 0.96rem;
  font-weight: 900;
  box-shadow: 0 12px 22px var(--lane-shadow);
}

.push-stream__eyebrow {
  color: var(--app-text-soft);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.push-stream__identity strong {
  display: block;
  margin-top: 0.1rem;
  color: var(--app-heading);
  font-size: 0.98rem;
  font-weight: 800;
}

.push-stream__selected {
  margin-top: 0.35rem;
  color: var(--app-primary-dark);
  font-size: 0.76rem;
  font-weight: 800;
}

.push-stream__summary {
  margin-top: 0.46rem;
  color: var(--app-heading);
}

.push-stream__meta {
  margin-top: 0.4rem;
  font-size: 0.82rem;
  line-height: 1.45;
}

.push-stream__count {
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: var(--lane-chip);
}

.push-stream__meter {
  display: flex;
  align-items: center;
  gap: 0.48rem;
  margin-top: 0.52rem;
}

.push-stream__meter-track {
  position: relative;
  flex: 1;
  height: 0.4rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.09);
  overflow: hidden;
}

.push-stream__meter-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--lane-gradient);
  transition: width 220ms ease;
}

.push-stream__meter small {
  flex-shrink: 0;
  color: var(--app-primary-dark);
  font-size: 0.72rem;
  font-weight: 800;
}

.push-stream__actions {
  margin-top: 0.62rem;
}

.push-stream__button,
.push-stream__ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.push-stream__actions .push-stream__button,
.push-stream__actions .push-stream__ghost {
  flex: 1 1 auto;
}

@keyframes push-card-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .push-stream__card {
    animation: none;
    transition: none;
  }

  .push-stream__card::after {
    transition: none;
  }
}

@media (max-width: 860px) {
  .insight-grid,
  .track-grid {
    grid-template-columns: 1fr;
  }

  .track-panel__head,
  .discover-head,
  .push-panel__head {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-strip {
    justify-content: flex-start;
  }

  .push-panel__stats {
    justify-content: flex-start;
  }
}

@media (max-width: 680px) {
  .page-panel {
    margin: 0.75rem;
    padding: 1rem;
  }

  .discover-panel {
    padding: 0;
  }

  .discover-active-track {
    padding: 0.8rem 1rem;
  }

  .load-more-btn {
    width: 100%;
    margin: 0.25rem 0 0.65rem;
  }

  .push-stream__card {
    grid-template-columns: 1fr;
    gap: 0.68rem;
  }

  .push-stream__rail {
    display: none;
  }

  .push-stream__actions .push-stream__button,
  .push-stream__actions .push-stream__ghost {
    flex: 1 1 calc(50% - 0.4rem);
  }
}
</style>
