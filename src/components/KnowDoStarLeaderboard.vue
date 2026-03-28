<template>
  <section class="know-do-stars">
    <div class="stars-header">
      <div class="stars-header__content">
        <h2>{{ uiStore.t('knowDoStarTitle') }}</h2>
        <p class="stars-header__explain">{{ uiStore.t('knowDoStarExplain') }}</p>
      </div>

      <div class="stars-period-tabs">
        <button
          :class="['period-tab', { 'period-tab--active': activePeriod === 'monthly' }]"
          @click="activePeriod = 'monthly'"
        >
          {{ uiStore.t('monthlyWinners') }}
        </button>
        <button
          :class="['period-tab', { 'period-tab--active': activePeriod === 'semester' }]"
          @click="activePeriod = 'semester'"
        >
          {{ uiStore.t('semesterWinners') }}
        </button>
      </div>
    </div>

    <!-- 金星获得者 -->
    <div v-if="leaderboard.goldStars.length > 0" class="stars-tier">
      <h3 class="stars-tier__title">
        <span class="stars-tier__icon">⭐</span>
        {{ uiStore.t('goldStar') }}
      </h3>
      <div class="stars-grid stars-grid--gold">
        <article v-for="(star, idx) in leaderboard.goldStars" :key="star.userId" class="star-card">
          <div class="star-card__rank">{{ idx + 1 }}</div>
          <div class="star-card__header">
            <div class="star-card__avatar">{{ star.userName.charAt(0) }}</div>
            <div>
              <strong>{{ star.userName }}</strong>
              <small>{{ star.userRole }}</small>
            </div>
          </div>

          <div class="star-card__score">
            <span class="score-value">{{ star.score }}</span>
            <span class="score-label">{{ uiStore.t('engagementRate') }}</span>
          </div>

          <div class="star-card__stats">
            <div class="stat-item">
              <small>{{ uiStore.t('crossGradeInteractions') }}</small>
              <strong>{{ star.crossGradeResponseCount }}</strong>
            </div>
            <div class="stat-item">
              <small>{{ uiStore.t('experienceShares') }}</small>
              <strong>{{ star.experienceShareCount }}</strong>
            </div>
          </div>

          <div v-if="star.badges.length > 0" class="star-badges">
            <span
              v-for="badge in star.badges"
              :key="badge.key"
              :title="badge.description_zh"
              class="badge"
            >
              {{ badge.icon }}
              <span>{{ badge.zh }}</span>
            </span>
          </div>

          <button class="star-card__action">{{ uiStore.t('viewStarProfile') }}</button>
        </article>
      </div>
    </div>

    <!-- 银星获得者 -->
    <div v-if="leaderboard.silverStars.length > 0" class="stars-tier">
      <h3 class="stars-tier__title">
        <span class="stars-tier__icon">✨</span>
        {{ uiStore.t('silverStar') }}
      </h3>
      <div class="stars-grid stars-grid--silver">
        <article v-for="(star, idx) in leaderboard.silverStars" :key="star.userId" class="star-card star-card--silver">
          <div class="star-card__rank">{{ leaderboard.goldStars.length + idx + 1 }}</div>
          <div class="star-card__header">
            <div class="star-card__avatar">{{ star.userName.charAt(0) }}</div>
            <div>
              <strong>{{ star.userName }}</strong>
              <small>{{ star.userRole }}</small>
            </div>
          </div>

          <div class="star-card__score">
            <span class="score-value">{{ star.score }}</span>
            <span class="score-label">{{ uiStore.t('engagementRate') }}</span>
          </div>

          <div class="star-card__stats">
            <div class="stat-item">
              <small>{{ uiStore.t('crossGradeInteractions') }}</small>
              <strong>{{ star.crossGradeResponseCount }}</strong>
            </div>
            <div class="stat-item">
              <small>{{ uiStore.t('experienceShares') }}</small>
              <strong>{{ star.experienceShareCount }}</strong>
            </div>
          </div>

          <div v-if="star.badges.length > 0" class="star-badges">
            <span
              v-for="badge in star.badges"
              :key="badge.key"
              :title="badge.description_zh"
              class="badge badge--small"
            >
              {{ badge.icon }}
            </span>
          </div>

          <button class="star-card__action">{{ uiStore.t('viewStarProfile') }}</button>
        </article>
      </div>
    </div>

    <!-- 铜星获得者 -->
    <div v-if="leaderboard.bronzeStars.length > 0" class="stars-tier">
      <h3 class="stars-tier__title">
        <span class="stars-tier__icon">⚡</span>
        {{ uiStore.t('bronzeStar') }}
      </h3>
      <div class="stars-list">
        <article v-for="(star, idx) in leaderboard.bronzeStars" :key="star.userId" class="star-item">
          <div class="star-item__rank">
            {{ leaderboard.goldStars.length + leaderboard.silverStars.length + idx + 1 }}
          </div>
          <div class="star-item__info">
            <strong>{{ star.userName }}</strong>
            <small>{{ star.userRole }} · {{ star.crossGradeResponseCount }} 次跨年级互动</small>
          </div>
          <div class="star-item__badges">
            <span v-for="badge in star.badges.slice(0, 2)" :key="badge.key" class="mini-badge">
              {{ badge.icon }}
            </span>
          </div>
        </article>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!leaderboard.goldStars && !leaderboard.silverStars && !leaderboard.bronzeStars" class="stars-empty">
      <p class="stars-empty__icon">🌟</p>
      <p class="stars-empty__text">{{ uiStore.t('knowDoStarSubtitle') }}</p>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import { generateKnowDoStarLeaderboard } from '@/utils/knowDoStarSystem'

const props = defineProps({
  posts: {
    type: Array,
    default: () => []
  },
  comments: {
    type: Array,
    default: () => []
  }
})

const uiStore = useUiStore()
const activePeriod = ref('monthly')

const leaderboard = computed(() => {
  if (props.posts.length === 0 || props.comments.length === 0) {
    return { goldStars: [], silverStars: [], bronzeStars: [] }
  }

  return generateKnowDoStarLeaderboard(props.posts, props.comments, activePeriod.value)
})
</script>

<style scoped>
.know-do-stars {
  padding: 2rem 1rem;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(59, 130, 246, 0.03));
  border-radius: 16px;
}

.stars-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
}

.stars-header__content h2 {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--app-heading);
  margin-bottom: 0.5rem;
}

.stars-header__explain {
  color: var(--app-text-soft);
  font-size: 0.95rem;
}

.stars-period-tabs {
  display: flex;
  gap: 0.5rem;
}

.period-tab {
  padding: 0.6rem 1.2rem;
  border: 2px solid var(--app-primary);
  border-radius: 8px;
  background: white;
  color: var(--app-primary);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.period-tab:hover {
  background: var(--app-accent-soft);
}

.period-tab--active {
  background: var(--app-primary);
  color: white;
}

.stars-tier {
  margin-bottom: 3rem;
}

.stars-tier__title {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--app-heading);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.stars-tier__icon {
  font-size: 1.5rem;
}

.stars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.stars-grid--gold {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.stars-grid--silver {
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.star-card {
  padding: 1.5rem;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(251, 191, 36, 0.03));
  border: 2px solid rgba(251, 191, 36, 0.2);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  position: relative;
}

.star-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(251, 191, 36, 0.2);
}

.star-card--silver {
  background: linear-gradient(135deg, rgba(209, 213, 219, 0.08), rgba(209, 213, 219, 0.03));
  border-color: rgba(209, 213, 219, 0.2);
}

.star-card--silver:hover {
  box-shadow: 0 12px 24px rgba(209, 213, 219, 0.15);
}

.star-card__rank {
  position: absolute;
  top: 0.8rem;
  right: 1rem;
  width: 2.2rem;
  height: 2.2rem;
  line-height: 2.2rem;
  text-align: center;
  border-radius: 50%;
  background: var(--app-primary);
  color: white;
  font-weight: 900;
  font-size: 0.95rem;
}

.star-card__header {
  display: flex;
  gap: 0.8rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.star-card__avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #60a5fa);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.star-card__header strong {
  display: block;
  color: var(--app-heading);
  margin-bottom: 0.2rem;
}

.star-card__header small {
  color: var(--app-text-soft);
  font-size: 0.85rem;
}

.star-card__score {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(37, 99, 235, 0.1);
}

.score-value {
  font-size: 2rem;
  font-weight: 900;
  color: var(--app-primary);
}

.score-label {
  font-size: 0.8rem;
  color: var(--app-text-soft);
}

.star-card__stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-item small {
  display: block;
  font-size: 0.75rem;
  color: var(--app-text-soft);
  margin-bottom: 0.2rem;
}

.stat-item strong {
  display: block;
  font-size: 1.3rem;
  color: var(--app-heading);
}

.star-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.7rem;
  border-radius: 6px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--app-primary);
  font-size: 0.8rem;
  font-weight: 600;
}

.badge--small {
  padding: 0.3rem 0.5rem;
  font-size: 0.7rem;
}

.star-card__action {
  width: 100%;
  padding: 0.7rem;
  border: 1.5px solid var(--app-primary);
  border-radius: 8px;
  background: white;
  color: var(--app-primary);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.star-card__action:hover {
  background: var(--app-accent-soft);
}

.stars-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.star-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(37, 99, 235, 0.1);
  transition: all 0.2s ease;
}

.star-item:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: var(--app-primary);
}

.star-item__rank {
  min-width: 2.2rem;
  height: 2.2rem;
  line-height: 2.2rem;
  text-align: center;
  border-radius: 50%;
  background: var(--app-primary);
  color: white;
  font-weight: 900;
  font-size: 0.8rem;
}

.star-item__info {
  flex: 1;
}

.star-item__info strong {
  display: block;
  color: var(--app-heading);
}

.star-item__info small {
  display: block;
  color: var(--app-text-soft);
  font-size: 0.8rem;
  margin-top: 0.2rem;
}

.star-item__badges {
  display: flex;
  gap: 0.3rem;
}

.mini-badge {
  font-size: 1rem;
  line-height: 1;
}

.stars-empty {
  text-align: center;
  padding: 3rem 1rem;
}

.stars-empty__icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.stars-empty__text {
  color: var(--app-text-soft);
  font-size: 0.95rem;
}

@media (max-width: 768px) {
  .stars-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
  }

  .stars-grid {
    grid-template-columns: 1fr;
  }

  .stars-grid--gold {
    grid-template-columns: 1fr;
  }

  .stars-grid--silver {
    grid-template-columns: 1fr;
  }
}
</style>
