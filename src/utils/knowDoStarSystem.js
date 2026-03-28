/**
 * 知行之星评选系统 - Know-Do Star Selection System
 * 每月/每学期表彰连接他人、打破年级壁垒的杰出用户
 */

import {
  KNOW_DO_STAR_CONFIG,
  roleToGradeKey,
  GRADE_LEVELS,
  POST_TYPES
} from '@/constants/gradeSystem'

/**
 * 用户交互数据类 - User interaction metrics
 */
class UserMetrics {
  constructor(userId, userName, userRole) {
    this.userId = userId
    this.userName = userName
    this.userRole = userRole
    this.userGrade = roleToGradeKey[userRole] || GRADE_LEVELS.COLLEGE.key
    this.score = 0
    this.details = {
      crossGradeResponses: 0,      // 跨年级回复数
      crossGradeLikesReceived: 0,  // 被跨年级点赞数
      guidanceReplies: 0,          // 回复求指导的次数
      experienceShares: 0,         // 分享经验的帖子数
      totalLikesReceived: 0,       // 总点赞数
      totalCommentsReceived: 0,    // 总评论数
      helpfulRatings: 0,           // 被标记为有帮助的次数
      engagementRate: 0            // 跨年级互动率
    }
    this.achievements = []
  }

  addScore(amount) {
    this.score += amount
  }

  calculateEngagementRate() {
    const totalInteractions =
      this.details.crossGradeResponses +
      this.details.crossGradeLikesReceived +
      this.details.guidanceReplies +
      this.details.experienceShares

    if (totalInteractions === 0) return 0

    const crossGradeInteractions =
      this.details.crossGradeResponses + this.details.crossGradeLikesReceived

    this.details.engagementRate = crossGradeInteractions / totalInteractions
    return this.details.engagementRate
  }
}

/**
 * 计算用户的"知行之星"得分
 * 基于跨年级互动、帮助他人、经验分享等因素
 */
export function calculateUserKnowDoScore(posts, comments, userGrade, userId) {
  let score = 0
  let details = {
    crossGradeResponses: 0,
    crossGradeLikesReceived: 0,
    guidanceReplies: 0,
    experienceShares: 0
  }

  // 1. 分析用户发布的帖子
  posts.forEach((post) => {
    if (post.author_id !== userId) return

    // 分享经验类帖子得分
    if (post.postType === POST_TYPES.SHARE_EXPERIENCE.key) {
      score += KNOW_DO_STAR_CONFIG.SCORING_RULES.SHARE_EXPERIENCE_POINTS
      details.experienceShares++
    }

    // 帖子热度奖励（每10个赞）
    if (post.likes_count && post.likes_count > 0) {
      const popularityBonus = Math.floor(post.likes_count / 10) *
        KNOW_DO_STAR_CONFIG.SCORING_RULES.POST_POPULARITY_BONUS
      score += popularityBonus
    }
  })

  // 2. 分析用户的评论（回复）
  comments.forEach((comment) => {
    if (comment.author_id !== userId) return

    // 获取原帖信息
    const originalPost = posts.find((p) => p.id === comment.post_id)
    if (!originalPost) return

    const commentAuthorGrade = roleToGradeKey[comment.author_role] || userGrade
    const postAuthorGrade = roleToGradeKey[originalPost.author_role] || userGrade

    // 跨年级回复检测
    if (commentAuthorGrade !== postAuthorGrade) {
      score += KNOW_DO_STAR_CONFIG.SCORING_RULES.CROSS_GRADE_RESPONSE_POINTS
      details.crossGradeResponses++

      // 如果是回复求指导的帖子，额外加分
      if (originalPost.postType === POST_TYPES.SEEK_GUIDANCE.key) {
        score += KNOW_DO_STAR_CONFIG.SCORING_RULES.REPLY_TO_GUIDANCE_POINTS
        details.guidanceReplies++
      }
    }
  })

  // 3. 分析用户收到的点赞（可能来自跨年级）
  posts.forEach((post) => {
    if (post.author_id === userId && post.likes_count) {
      // 估算跨年级点赞（假设有一定比例）
      const estimatedCrossGradeLikes = Math.floor(post.likes_count * 0.3)
      score += estimatedCrossGradeLikes * KNOW_DO_STAR_CONFIG.SCORING_RULES.RECEIVED_CROSS_GRADE_LIKE_POINTS
      details.crossGradeLikesReceived += estimatedCrossGradeLikes
    }
  })

  return {
    score,
    details
  }
}

/**
 * 评选"知行之星"获得者
 * 基于一个时间窗口内的用户表现
 */
export function selectKnowDoStars(posts, comments, periodDays = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - periodDays)

  // 过滤时间窗口内的数据
  const recentPosts = posts.filter((p) => new Date(p.created_at) > cutoffDate)
  const recentComments = comments.filter((c) => new Date(c.created_at) > cutoffDate)

  // 收集所有活跃用户
  const userMetricsMap = new Map()

  recentPosts.forEach((post) => {
    const userId = post.author_id
    const userName = post.author_name
    const userRole = post.author_role

    if (!userMetricsMap.has(userId)) {
      userMetricsMap.set(userId, new UserMetrics(userId, userName, userRole))
    }
  })

  recentComments.forEach((comment) => {
    const userId = comment.author_id
    const userName = comment.author_name
    const userRole = comment.author_role

    if (!userMetricsMap.has(userId)) {
      userMetricsMap.set(userId, new UserMetrics(userId, userName, userRole))
    }
  })

  // 计算每个用户的得分
  const userScoresWithDetails = Array.from(userMetricsMap.values()).map((metrics) => {
    const { score, details } = calculateUserKnowDoScore(
      recentPosts,
      recentComments,
      metrics.userGrade,
      metrics.userId
    )

    metrics.score = score
    metrics.details = details
    metrics.calculateEngagementRate()

    return metrics
  })

  // 按分数排序，过滤达到最低门槛的用户
  const qualified = userScoresWithDetails.filter(
    (metrics) =>
      metrics.score >=
        KNOW_DO_STAR_CONFIG.SELECTION_CRITERIA.MIN_SCORE_BRONZE &&
      metrics.details.engagementRate >=
        KNOW_DO_STAR_CONFIG.SELECTION_CRITERIA.ENGAGEMENT_THRESHOLD
  )

  const sorted = qualified.sort((a, b) => b.score - a.score)

  // 分类评选
  const results = {
    goldStars: sorted.slice(0, KNOW_DO_STAR_CONFIG.SELECTION_CRITERIA.WINNERS_PER_CATEGORY),
    silverStars: sorted.slice(
      KNOW_DO_STAR_CONFIG.SELECTION_CRITERIA.WINNERS_PER_CATEGORY,
      KNOW_DO_STAR_CONFIG.SELECTION_CRITERIA.WINNERS_PER_CATEGORY * 2
    ),
    bronzeStars: sorted.slice(
      KNOW_DO_STAR_CONFIG.SELECTION_CRITERIA.WINNERS_PER_CATEGORY * 2,
      KNOW_DO_STAR_CONFIG.SELECTION_CRITERIA.WINNERS_PER_CATEGORY * 3
    ),
    allParticipants: sorted
  }

  return results
}

/**
 * 根据用户的具体表现分配成就徽章
 */
export function assignAchievementBadges(metrics) {
  const badges = []
  const { BRIDGE_BUILDER, WISDOM_SHARER, HELPER, TRENDSETTER, COMMENT_STAR } =
    KNOW_DO_STAR_CONFIG.ACHIEVEMENT_CATEGORIES

  // 桥梁建造者 - 高跨年级互动率
  if (
    metrics.details.crossGradeResponses >= 5 &&
    metrics.details.engagementRate >= 0.6
  ) {
    badges.push(BRIDGE_BUILDER)
  }

  // 智慧分享者 - 多个分享经验的帖子
  if (metrics.details.experienceShares >= 3) {
    badges.push(WISDOM_SHARER)
  }

  // 热心助手 - 多次回复求指导
  if (metrics.details.guidanceReplies >= 5) {
    badges.push(HELPER)
  }

  // 话题引领者 - 高点赞内容（自己发布的热门帖）
  if (metrics.score >= 80) {
    badges.push(TRENDSETTER)
  }

  // 评论达人 - 高质量评论（体现在跨年级评论中）
  if (metrics.details.crossGradeResponses >= 8) {
    badges.push(COMMENT_STAR)
  }

  return badges
}

/**
 * 格式化知行之星的展示数据
 */
export function formatKnowDoStarForDisplay(metrics, tier) {
  const tierConfig = Object.values(KNOW_DO_STAR_CONFIG.TIERS).find((t) => t.key === tier)
  const badges = assignAchievementBadges(metrics)

  return {
    userId: metrics.userId,
    userName: metrics.userName,
    userRole: metrics.userRole,
    score: metrics.score,
    tier,
    tierLabel: tierConfig?.zh || '未知',
    tierIcon: tierConfig?.icon || '✨',
    tierColor: tierConfig?.color || '#9ca3af',
    badges,
    engagementRate: Math.round(metrics.details.engagementRate * 100),
    crossGradeResponseCount: metrics.details.crossGradeResponses,
    experienceShareCount: metrics.details.experienceShares,
    guidanceReplyCount: metrics.details.guidanceReplies,
    certificateText: generateCertificateText(metrics, tierConfig)
  }
}

/**
 * 生成证书文案
 */
function generateCertificateText(metrics, tierConfig) {
  const badges = assignAchievementBadges(metrics)
  const badgeText = badges.map((b) => b.zh).join('、')

  return `恭喜！您入选本月知行之星 ${tierConfig.zh} 获得者。您以 ${metrics.details.crossGradeResponses} 次跨年级互动、${metrics.details.experienceShares} 篇经验分享，展现了"连接、共享、打破壁垒"的精神。荣获：${badgeText || '热心参与者'}。`
}

/**
 * 获取两个用户之间的互动历史
 * 用于验证跨年级互动
 */
export function getInteractionBetweenUsers(posts, comments, userId1, userId2) {
  const interactions = []

  // 查找用户1对用户2帖子的评论
  const user2Posts = posts.filter((p) => p.author_id === userId2)
  user2Posts.forEach((post) => {
    const user1Comments = comments.filter(
      (c) => c.post_id === post.id && c.author_id === userId1
    )
    user1Comments.forEach((comment) => {
      interactions.push({
        type: 'comment',
        fromUserId: userId1,
        toUserId: userId2,
        date: comment.created_at,
        content: comment.content
      })
    })
  })

  return interactions
}

/**
 * 月度/学期"知行之星"排行榜
 */
export function generateKnowDoStarLeaderboard(posts, comments, period = 'monthly') {
  const periodConfig =
    period === 'monthly'
      ? KNOW_DO_STAR_CONFIG.PERIODS.MONTHLY
      : KNOW_DO_STAR_CONFIG.PERIODS.SEMESTER

  const selection = selectKnowDoStars(posts, comments, periodConfig.daysWindow)

  const leaderboard = {
    period: period,
    periodLabel: periodConfig.zh,
    windowDays: periodConfig.daysWindow,
    timestamp: new Date().toISOString(),
    goldStars: selection.goldStars.map((m) => formatKnowDoStarForDisplay(m, 'gold')),
    silverStars: selection.silverStars.map((m) => formatKnowDoStarForDisplay(m, 'silver')),
    bronzeStars: selection.bronzeStars.map((m) => formatKnowDoStarForDisplay(m, 'bronze'))
  }

  return leaderboard
}
