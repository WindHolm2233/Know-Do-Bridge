/**
 * 知行之星 Composable - useKnowDoStar
 * 方便在组件中使用知行之星的数据和功能
 */

import { computed, ref } from 'vue'
import {
  calculateUserKnowDoScore,
  selectKnowDoStars,
  assignAchievementBadges,
  formatKnowDoStarForDisplay,
  generateKnowDoStarLeaderboard
} from '@/utils/knowDoStarSystem'
import { enrichPostWithRecommendationData } from '@/utils/recommendationEngine'

/**
 * 使用知行之星系统
 */
export function useKnowDoStar(posts = [], comments = []) {
  const period = ref('monthly')
  const leaderboard = ref(null)
  const userStarStatus = ref(null)
  const loading = ref(false)

  /**
   * 生成排行榜
   */
  const generateLeaderboard = async () => {
    loading.value = true
    try {
      leaderboard.value = generateKnowDoStarLeaderboard(posts, comments, period.value)
      return leaderboard.value
    } catch (error) {
      console.error('Failed to generate leaderboard:', error)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取用户的知行之星状态
   */
  const getUserStarStatus = (userId) => {
    if (!leaderboard.value) return null

    // 在所有获奖者中寻找该用户
    for (const tier of ['goldStars', 'silverStars', 'bronzeStars']) {
      const star = leaderboard.value[tier].find((s) => s.userId === userId)
      if (star) {
        return star
      }
    }

    return null
  }

  /**
   * 检查用户是否是最新的知行之星
   */
  const isLatestStar = (userId) => {
    if (!leaderboard.value || !leaderboard.value.goldStars) return false
    return leaderboard.value.goldStars.some((s) => s.userId === userId)
  }

  /**
   * 计算用户的个人指标
   */
  const calculateUserMetrics = (userId, userGrade) => {
    const score = calculateUserKnowDoScore(posts, comments, userGrade, userId)
    return score
  }

  /**
   * 获取排行榜中的前几名
   */
  const getTopStars = (count = 5) => {
    if (!leaderboard.value) return []

    const all = [
      ...leaderboard.value.goldStars,
      ...leaderboard.value.silverStars,
      ...leaderboard.value.bronzeStars
    ]

    return all.slice(0, count)
  }

  /**
   * 获取特定分类的获奖者
   */
  const getStarsByTier = (tier) => {
    if (!leaderboard.value) return []
    return leaderboard.value[`${tier}Stars`] || []
  }

  /**
   * 切换排行榜周期（月度/学期）
   */
  const switchPeriod = async (newPeriod) => {
    period.value = newPeriod
    return generateLeaderboard()
  }

  /**
   * 获取所有用户的推荐标签
   */
  const getAllPostRecommendationTags = () => {
    return posts.map(enrichPostWithRecommendationData)
  }

  return {
    period,
    leaderboard,
    userStarStatus,
    loading,
    generateLeaderboard,
    getUserStarStatus,
    isLatestStar,
    calculateUserMetrics,
    getTopStars,
    getStarsByTier,
    switchPeriod,
    getAllPostRecommendationTags
  }
}

/**
 * 获取用户的知行之星勋章
 */
export function computedUserStar(userId, leaderboard) {
  return computed(() => {
    if (!leaderboard || !leaderboard.value) return null

    // 在所有获奖者中寻找该用户
    if (leaderboard.value.goldStars) {
      const star = leaderboard.value.goldStars.find((s) => s.userId === userId)
      if (star) return star
    }

    if (leaderboard.value.silverStars) {
      const star = leaderboard.value.silverStars.find((s) => s.userId === userId)
      if (star) return star
    }

    if (leaderboard.value.bronzeStars) {
      const star = leaderboard.value.bronzeStars.find((s) => s.userId === userId)
      if (star) return star
    }

    return null
  })
}

/**
 * 获取用户的成就徽章
 */
export function useUserAchievements(userId, posts, comments, userGrade) {
  const metrics = computed(() => {
    if (!posts || !comments) return null
    return calculateUserKnowDoScore(posts, comments, userGrade, userId)
  })

  const badges = computed(() => {
    if (!metrics.value) return []

    // 这里需要包装成完整的 metrics 对象
    const fullMetrics = {
      userId,
      score: metrics.value.score,
      details: metrics.value.details,
      calculateEngagementRate: () => {
        const total =
          metrics.value.details.crossGradeResponses +
          metrics.value.details.crossGradeLikesReceived +
          metrics.value.details.guidanceReplies +
          metrics.value.details.experienceShares

        if (total === 0) return 0
        return (
          (metrics.value.details.crossGradeResponses +
            metrics.value.details.crossGradeLikesReceived) /
          total
        )
      }
    }

    fullMetrics.details.engagementRate = fullMetrics.calculateEngagementRate()
    return assignAchievementBadges(fullMetrics)
  })

  return {
    metrics,
    badges
  }
}

/**
 * 组件辅助函数：格式化星级显示
 */
export function formatStarTier(tier) {
  const tierMap = {
    gold: { zh: '金星', en: 'Gold Star', icon: '⭐' },
    silver: { zh: '银星', en: 'Silver Star', icon: '✨' },
    bronze: { zh: '铜星', en: 'Bronze Star', icon: '⚡' }
  }

  return tierMap[tier] || tierMap.bronze
}

/**
 * 组件辅助函数：获取成就徽章的完整信息
 */
export function getAchievementInfo(badgeKey) {
  const badgeMap = {
    bridge_builder: {
      key: 'bridge_builder',
      zh: '桥梁建造者',
      en: 'Bridge Builder',
      icon: '🌉',
      color: '#60a5fa'
    },
    wisdom_sharer: {
      key: 'wisdom_sharer',
      zh: '智慧分享者',
      en: 'Wisdom Sharer',
      icon: '📚',
      color: '#fbbf24'
    },
    helper: {
      key: 'helper',
      zh: '热心助手',
      en: 'Helper',
      icon: '🤝',
      color: '#10b981'
    },
    trendsetter: {
      key: 'trendsetter',
      zh: '话题引领者',
      en: 'Trendsetter',
      icon: '🔥',
      color: '#f97316'
    },
    comment_star: {
      key: 'comment_star',
      zh: '评论达人',
      en: 'Comment Star',
      icon: '💬',
      color: '#8b5cf6'
    }
  }

  return badgeMap[badgeKey] || null
}

/**
 * 验证用户是否符合特定成就条件
 */
export function userQualifiesForAchievement(metrics, achievementKey) {
  const qualifications = {
    bridge_builder: () =>
      metrics.details.crossGradeResponses >= 5 && metrics.details.engagementRate >= 0.6,
    wisdom_sharer: () => metrics.details.experienceShares >= 3,
    helper: () => metrics.details.guidanceReplies >= 5,
    trendsetter: () => metrics.score >= 80,
    comment_star: () => metrics.details.crossGradeResponses >= 8
  }

  const checkFn = qualifications[achievementKey]
  return checkFn ? checkFn() : false
}
