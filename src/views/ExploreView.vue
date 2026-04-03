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
              {{ topic.topic }} · {{ topic.count }}
            </span>
          </div>
        </article>
      </div>
    </section>

    <section class="page-panel discover-panel">
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
            <p class="push-panel__eyebrow">{{ localeText.pushEyebrow }}</p>
            <h3>{{ localeText.pushTitle }}</h3>
          </div>
        </div>

        <div class="push-stream">
          <article v-for="(item, index) in pushChannels" :key="item.key" class="push-stream__card">
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
                    <p class="push-stream__eyebrow">{{ item.label }}</p>
                    <strong>{{ item.title }}</strong>
                  </div>
                </div>
                <span class="push-stream__count">{{ item.count }}</span>
              </div>

              <p class="push-stream__summary">{{ item.summary }}</p>

              <div class="push-stream__actions">
                <button type="button" class="push-stream__button" @click="openDraftComposer(item)">
                  {{ item.actionLabel }}
                </button>
                <button type="button" class="push-stream__ghost" @click="applyPush(item)">
                  {{ uiStore.locale === 'zh' ? '看这一类' : 'Filter this stream' }}
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
const visibleCount = ref(INITIAL_POSTS)
const loadMoreTrigger = ref(null)
let loadMoreObserver = null

const discovery = computed(() =>
  buildDiscoveryInsights(socialStore.posts, authStore.currentUser?.role, uiStore.locale)
)

const localeText = computed(() =>
  uiStore.locale === 'zh'
    ? {
        pushEyebrow: '推送入口',
        pushTitle: '快速找到你要的内容',
        pushRefresh: '换一条',
        teamRequest: '组队请求',
        clubRecruitment: '社团招新',
        examExchange: '考试资料交换',
        actionTeam: '看组队请求',
        actionClub: '看招新内容',
        actionExam: '看资料交换',
        emptySummary: '先看看当前社区里有没有对应内容。'
      }
    : {
        pushEyebrow: 'Quick push',
        pushTitle: 'Jump into the right stream',
        pushRefresh: 'Next',
        teamRequest: 'Team requests',
        clubRecruitment: 'Club recruitment',
        examExchange: 'Exam materials',
        actionTeam: 'Open team requests',
        actionClub: 'Open club posts',
        actionExam: 'Open materials exchange',
        emptySummary: 'See what is available in the feed right now.'
      }
)

const lensPostTypeMap = {
  all: '',
  guidance: 'seek_guidance',
  practice: 'seek_practice',
  experience: 'share_experience',
  discussion: 'general'
}

const filterItems = computed(() => [
  {
    key: 'all',
    label: uiStore.t('exploreFilterAll'),
    count: discovery.value.totalPosts
  },
  {
    key: 'guidance',
    label: uiStore.t('exploreFilterGuidance'),
    count: discovery.value.typeCounts.seek_guidance || 0
  },
  {
    key: 'practice',
    label: uiStore.t('exploreFilterPractice'),
    count: discovery.value.typeCounts.seek_practice || 0
  },
  {
    key: 'experience',
    label: uiStore.t('exploreFilterExperience'),
    count: discovery.value.typeCounts.share_experience || 0
  },
  {
    key: 'discussion',
    label: uiStore.t('exploreFilterDiscussion'),
    count: discovery.value.typeCounts.general || 0
  }
])

const channelKeywords = {
  team_request: ['组队', '队友', 'team', '队伍', '合作', '招募队友', '拼队', '找人'],
  club_recruitment: ['社团', '招新', '纳新', 'club', '报名', '招募成员', '活动招募'],
  exam_exchange: ['资料', '笔记', '复习', '题库', '考前', '互换', 'exchange', '真题']
}

const channelLensMap = {
  team_request: 'practice',
  club_recruitment: 'discussion',
  exam_exchange: 'experience'
}

const pushChannels = computed(() => {
  const ranked = discovery.value.rankedPosts

  return [
    {
      key: 'team_request',
      label: localeText.value.teamRequest,
      title: uiStore.locale === 'zh' ? '组队请求正在升温' : 'Team requests are active',
      summary: findChannelSummary('team_request', ranked),
      count: countChannelPosts('team_request', ranked),
      actionLabel: localeText.value.actionTeam
    },
    {
      key: 'club_recruitment',
      label: localeText.value.clubRecruitment,
      title: uiStore.locale === 'zh' ? '社团招新可以多看两眼' : 'Club recruitment is worth a look',
      summary: findChannelSummary('club_recruitment', ranked),
      count: countChannelPosts('club_recruitment', ranked),
      actionLabel: localeText.value.actionClub
    },
    {
      key: 'exam_exchange',
      label: localeText.value.examExchange,
      title: uiStore.locale === 'zh' ? '考试资料交换有新动态' : 'Exam materials are moving',
      summary: findChannelSummary('exam_exchange', ranked),
      count: countChannelPosts('exam_exchange', ranked),
      actionLabel: localeText.value.actionExam
    }
  ]
})

const rankedPosts = computed(() => {
  const targetType = lensPostTypeMap[selectedLens.value]

  if (!targetType) {
    return discovery.value.rankedPosts
  }

  return discovery.value.rankedPosts.filter((post) => post.postType === targetType)
})

const visiblePosts = computed(() => rankedPosts.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < rankedPosts.value.length)

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
    ? '这是当前最值得优先浏览的一条内容。'
    : 'This is the strongest match to open with right now.'
})

const crossGradeText = computed(() => {
  if (!discovery.value.crossGradeOpportunities.length) {
    return uiStore.locale === 'zh'
      ? '当前没有明显的跨年级优先内容，换个筛选试试。'
      : 'No obvious cross-grade picks yet. Try a different filter.'
  }

  return uiStore.locale === 'zh'
    ? '这些内容更容易把不同阶段的同学连起来。'
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

const findChannelSummary = (key, posts) => {
  const keywords = channelKeywords[key] || []
  const matched = posts.find((post) => {
    const haystack = `${post.topic || ''} ${post.content || ''}`.toLowerCase()
    return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))
  })

  if (!matched) {
    return localeText.value.emptySummary
  }

  return `${matched.topic || formatPostTypeLabel(matched.postType, uiStore.locale)} · ${
    matched.author
  }`
}

const countChannelPosts = (key, posts) => {
  const keywords = channelKeywords[key] || []

  return posts.filter((post) => {
    const haystack = `${post.topic || ''} ${post.content || ''}`.toLowerCase()
    return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))
  }).length
}

const applyPush = (item) => {
  selectedLens.value = channelLensMap[item.key] || 'all'
}

const openDraftComposer = (item) => {
  const draftTopic =
    uiStore.locale === 'zh'
      ? item.key === 'team_request'
        ? '组队请求'
        : item.key === 'club_recruitment'
          ? '社团招新'
          : '考试资料交换'
      : item.key === 'team_request'
        ? 'Team requests'
        : item.key === 'club_recruitment'
          ? 'Club recruitment'
          : 'Exam materials'

  const draftContent =
    uiStore.locale === 'zh'
      ? item.key === 'team_request'
        ? '正在找队友/组队伙伴，欢迎私信或留言说明你的方向、时间和技能。'
        : item.key === 'club_recruitment'
          ? '欢迎分享社团招新信息、报名方式和活动亮点。'
          : '这里可以交换考试资料、笔记和复习清单。'
      : item.key === 'team_request'
        ? 'Looking for teammates. Leave a comment or DM with your direction, timing, and skills.'
        : item.key === 'club_recruitment'
          ? 'Share club recruitment info, signup steps, and what makes the club interesting.'
          : 'Use this for exchanging exam notes, materials, and revision lists.'

  router.push({
    path: '/',
    query: {
      draftPreset: item.key,
      draftTopic,
      draftContent
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

.insight-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.insight-panel__eyebrow {
  color: var(--app-accent);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.insight-panel__head h2 {
  color: var(--app-heading);
  font-size: 1.18rem;
  font-weight: 800;
}

.insight-panel__pill {
  flex-shrink: 0;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: rgba(79, 105, 206, 0.08);
  color: var(--app-primary-dark);
  font-size: 0.85rem;
  font-weight: 700;
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 1rem;
}

.insight-card {
  padding: 0.95rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.84);
}

.insight-card small {
  display: block;
  color: var(--app-text-soft);
}

.insight-card strong {
  display: block;
  margin-top: 0.35rem;
  color: var(--app-heading);
  font-size: 1.05rem;
}

.insight-card p {
  margin-top: 0.35rem;
  color: var(--app-text-soft);
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
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
  cursor: pointer;
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

.push-panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 0.35rem;
  background: linear-gradient(90deg, #2563eb, #60a5fa, #22c55e);
}

.push-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;
}

.push-panel__eyebrow {
  margin-bottom: 0.2rem;
  color: var(--app-accent);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.push-panel__head h3 {
  color: var(--app-heading);
  font-size: 1.08rem;
  font-weight: 800;
}

.push-stream {
  flex: 1;
  display: grid;
  align-content: start;
  gap: 0.7rem;
  margin-top: 1rem;
}

.push-stream__card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.85rem;
  padding: 0.9rem 0.95rem;
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(244, 248, 255, 0.96));
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.05);
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
  background: linear-gradient(135deg, #2563eb, #60a5fa);
  box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.08);
}

.push-stream__line {
  width: 2px;
  flex: 1;
  min-height: 2.4rem;
  margin-top: 0.35rem;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.3), rgba(96, 165, 250, 0.08));
}

.push-stream__body {
  min-width: 0;
}

.push-stream__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
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
  background: linear-gradient(135deg, #1d4ed8, #60a5fa);
  color: white;
  font-size: 0.96rem;
  font-weight: 900;
  box-shadow: 0 12px 22px rgba(37, 99, 235, 0.18);
}

.push-stream__eyebrow {
  color: var(--app-accent);
  font-size: 0.74rem;
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

.push-stream__count {
  flex-shrink: 0;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--app-primary-dark);
  font-size: 0.74rem;
  font-weight: 800;
}

.push-stream__summary {
  margin-top: 0.5rem;
  color: var(--app-text-soft);
  line-height: 1.55;
}

.push-stream__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.8rem;
}

.push-stream__button,
.push-stream__ghost {
  min-height: 2.35rem;
  padding: 0.58rem 0.88rem;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    background-color 120ms ease,
    border-color 120ms ease;
}

.push-stream__button {
  border: none;
  background: linear-gradient(135deg, #2563eb, #60a5fa);
  color: white;
  box-shadow: 0 12px 22px rgba(37, 99, 235, 0.18);
}

.push-stream__ghost {
  border: 1px solid rgba(37, 99, 235, 0.16);
  background: rgba(37, 99, 235, 0.06);
  color: var(--app-primary-dark);
}

.push-stream__button:hover,
.push-stream__ghost:hover {
  transform: translateY(-1px);
}

.push-stream__ghost:hover {
  background: rgba(37, 99, 235, 0.1);
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.08);
}

@media (max-width: 860px) {
  .insight-grid {
    grid-template-columns: 1fr;
  }

  .discover-head {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-strip {
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

  .load-more-btn {
    width: 100%;
    margin: 0.25rem 0 0.65rem;
  }
}
</style>
