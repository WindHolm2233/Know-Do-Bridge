/**
 * 知行匹配引擎 - Know-Do Bridge Recommendation Engine
 * 实现年级跨越、经验匹配、推荐算法
 */

import {
  GRADE_LEVELS,
  POST_TYPES,
  RECOMMENDATION_WEIGHTS,
  CROSS_GRADE_TAGS,
  roleToGradeKey
} from '@/constants/gradeSystem'

/**
 * 自动检测帖子类型（基于内容关键词）
 */
export function detectPostType(content, title = '') {
  const text = `${title} ${content}`.toLowerCase()

  // 求指导关键词
  const seekGuidanceKeywords = [
    '求助',
    '请教',
    '建议',
    '怎么办',
    '应该怎样',
    '咋样',
    '我该',
    '怎么选',
    '哪个',
    '应该',
    'help',
    'advice',
    'suggest',
    'should',
    '方向',
    '迷茫',
    '不知道'
  ]

  // 求实践关键词
  const seekPracticeKeywords = [
    '实习',
    '实践',
    '项目',
    '比赛',
    '竞赛',
    '组队',
    '招募',
    '寻找',
    '合作',
    '参加',
    'internship',
    'project',
    'hackathon',
    'recruit',
    'team',
    '求组队'
  ]

  // 分享经验关键词
  const shareExperienceKeywords = [
    '经验',
    '心得',
    '分享',
    '攻略',
    '总结',
    '复习',
    '应试',
    '面试',
    '升学',
    '选课',
    '专业',
    'experience',
    'tips',
    'guide',
    '感悟',
    '体会'
  ]

  let typeScores = {
    [POST_TYPES.SEEK_GUIDANCE.key]: 0,
    [POST_TYPES.SEEK_PRACTICE.key]: 0,
    [POST_TYPES.SHARE_EXPERIENCE.key]: 0,
    [POST_TYPES.GENERAL_DISCUSSION.key]: 0
  }

  seekGuidanceKeywords.forEach((kw) => {
    if (text.includes(kw)) typeScores[POST_TYPES.SEEK_GUIDANCE.key]++
  })

  seekPracticeKeywords.forEach((kw) => {
    if (text.includes(kw)) typeScores[POST_TYPES.SEEK_PRACTICE.key]++
  })

  shareExperienceKeywords.forEach((kw) => {
    if (text.includes(kw)) typeScores[POST_TYPES.SHARE_EXPERIENCE.key]++
  })

  const maxScore = Math.max(...Object.values(typeScores))
  if (maxScore === 0) {
    return POST_TYPES.GENERAL_DISCUSSION.key
  }

  return Object.entries(typeScores).find(([_, score]) => score === maxScore)[0]
}

/**
 * 获取推荐的标签（基于年级和帖子类型组合）
 */
export function getRecommendationTags(authorGrade, postType) {
  const tags = []

  // 低年级求指导或求实践 → 建议跨年级连接
  if (
    (authorGrade === GRADE_LEVELS.MIDDLE.key ||
      authorGrade === GRADE_LEVELS.HIGH.key) &&
    (postType === POST_TYPES.SEEK_GUIDANCE.key || postType === POST_TYPES.SEEK_PRACTICE.key)
  ) {
    tags.push(CROSS_GRADE_TAGS.BRIDGE_JUNIOR.key)
  }

  // 高年级分享经验 → 建议指导新生
  if (
    (authorGrade === GRADE_LEVELS.COLLEGE.key ||
      authorGrade === GRADE_LEVELS.GRADUATE.key) &&
    postType === POST_TYPES.SHARE_EXPERIENCE.key
  ) {
    tags.push(CROSS_GRADE_TAGS.BRIDGE_SENIOR.key)
  }

  return tags
}

/**
 * 获取一个帖子的推荐信息
 * Post enrichment with recommendation metadata
 */
export function enrichPostWithRecommendationData(post) {
  const authorGrade = roleToGradeKey[post.author_role] || GRADE_LEVELS.COLLEGE.key
  const detectedType = detectPostType(post.content, post.topic)
  const recommendationTags = getRecommendationTags(authorGrade, detectedType)

  return {
    ...post,
    authorGrade,
    postType: detectedType,
    recommendationTags,
    crossGradeIndicator:
      recommendationTags.length > 0
        ? CROSS_GRADE_TAGS[recommendationTags[0].toUpperCase()]
        : null
  }
}

/**
 * 计算推荐分数 - Calculate recommendation score for matching
 * 用于排序展示和匹配算法
 */
export function calculateRecommendationScore(post, viewerGrade, viewerInterests = []) {
  let score = 0

  // 1. 年级匹配得分
  const gradeGap = getGradeGap(viewerGrade, post.authorGrade)
  if (gradeGap === 0) {
    score += RECOMMENDATION_WEIGHTS.EXACT_GRADE_MATCH
  } else if (gradeGap === 1) {
    score += RECOMMENDATION_WEIGHTS.ONE_LEVEL_UP
  } else if (gradeGap === 2) {
    score += RECOMMENDATION_WEIGHTS.TWO_LEVELS_UP
  } else if (gradeGap === 3) {
    score += RECOMMENDATION_WEIGHTS.THREE_LEVELS_UP
  }

  // 2. 帖子类型匹配
  // 低年级学生看求指导/分享经验的帖子得分更高
  if (viewerGrade < post.authorGrade) {
    if (
      post.postType === POST_TYPES.SHARE_EXPERIENCE.key ||
      post.postType === POST_TYPES.SEEK_GUIDANCE.key
    ) {
      score += RECOMMENDATION_WEIGHTS.POST_TYPE_MATCH
    }
  }

  // 3. 跨年级推荐标签加权
  if (post.recommendationTags && post.recommendationTags.length > 0) {
    score += RECOMMENDATION_WEIGHTS.EXPERIENCE_RELEVANCE
  }

  // 4. 热度加权（基于互动）
  const engagementScore = (post.likes_count || 0) * 0.1 + (post.comment_count || 0) * 0.15
  score += Math.min(engagementScore, 2)

  // 5. 新鲜度加权
  const hoursOld = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60)
  if (hoursOld < 24) {
    score += RECOMMENDATION_WEIGHTS.RECENCY_BONUS
  } else if (hoursOld < 72) {
    score += RECOMMENDATION_WEIGHTS.RECENCY_BONUS * 0.5
  }

  return score
}

/**
 * 获取年级间隔（正数表示 post author 更高级）
 */
function getGradeGap(viewerGrade, authorGrade) {
  const gradeOrder = {
    [GRADE_LEVELS.MIDDLE.key]: 1,
    [GRADE_LEVELS.HIGH.key]: 2,
    [GRADE_LEVELS.COLLEGE.key]: 3,
    [GRADE_LEVELS.GRADUATE.key]: 4
  }

  return (gradeOrder[authorGrade] || 0) - (gradeOrder[viewerGrade] || 0)
}

/**
 * 帖子排序和推荐 - 智能排序列表
 */
export function sortPostsByRecommendation(posts, viewerGrade, options = {}) {
  const { enableCrossGrade = true, filterSameGrade = false } = options

  let filtered = posts

  // 可选的年级过滤
  if (filterSameGrade) {
    filtered = posts.filter((post) => post.authorGrade !== viewerGrade)
  }

  return filtered.sort((a, b) => {
    const scoreA = calculateRecommendationScore(a, viewerGrade)
    const scoreB = calculateRecommendationScore(b, viewerGrade)
    return scoreB - scoreA
  })
}

/**
 * 获取特定年级的推荐列表
 * 用于"发现"页面的精准推荐
 */
export function getGradeSpecificRecommendations(allPosts, viewerGrade) {
  const enriched = allPosts.map(enrichPostWithRecommendationData)
  const sorted = sortPostsByRecommendation(enriched, viewerGrade)

  return {
    topRecommendations: sorted.slice(0, 10),
    crossGradeOpportunities: sorted.filter(
      (post) => post.crossGradeIndicator && post.authorGrade !== viewerGrade
    ),
    allSorted: sorted
  }
}

/**
 * 格式化帖子类型显示
 */
export function formatPostTypeLabel(postType, locale = 'zh') {
  const typeObj = Object.values(POST_TYPES).find((t) => t.key === postType)
  if (!typeObj) return POST_TYPES.GENERAL_DISCUSSION[locale]
  return typeObj[locale] || typeObj.en
}

/**
 * 格式化年级显示
 */
export function formatGradeLabel(gradeKey, locale = 'zh') {
  const gradeObj = Object.values(GRADE_LEVELS).find((g) => g.key === gradeKey)
  if (!gradeObj) return '未知年级'
  return gradeObj[locale] || gradeObj.en
}
