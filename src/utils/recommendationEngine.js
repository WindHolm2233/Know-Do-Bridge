import {
  GRADE_LEVELS,
  POST_TYPES,
  RECOMMENDATION_WEIGHTS,
  CROSS_GRADE_TAGS,
  roleToGradeKey
} from '@/constants/gradeSystem'

const DRAFT_TOPIC_SUGGESTIONS = {
  [POST_TYPES.SEEK_GUIDANCE.key]: {
    zh: ['考试准备', '课程选择', '学习方法'],
    en: ['Exam prep', 'Course choice', 'Study methods']
  },
  [POST_TYPES.SEEK_PRACTICE.key]: {
    zh: ['组队招募', '项目协作', '比赛实践'],
    en: ['Team search', 'Project work', 'Practice build']
  },
  [POST_TYPES.SHARE_EXPERIENCE.key]: {
    zh: ['踩坑总结', '经验复盘', '成长清单'],
    en: ['Lessons learned', 'Reflection', 'Growth notes']
  },
  [POST_TYPES.GENERAL_DISCUSSION.key]: {
    zh: ['校园生活', '活动提醒', '日常讨论'],
    en: ['Campus life', 'Event notice', 'General talk']
  }
}

const DRAFT_COACH_HINTS = {
  [POST_TYPES.SEEK_GUIDANCE.key]: {
    zh: ['把卡住的地方说具体一点，别人更容易接住', '如果有时间限制，也可以直接写出来'],
    en: ['State the blocker clearly so others can jump in', 'Add a deadline if timing matters']
  },
  [POST_TYPES.SEEK_PRACTICE.key]: {
    zh: ['把目标、时间和需要的人写清楚，招募会更快', '顺手补一句你已经尝试过什么'],
    en: ['Name the goal, timing, and what help you need', 'Mention what you have already tried']
  },
  [POST_TYPES.SHARE_EXPERIENCE.key]: {
    zh: ['把结论放在前面，读者会更快抓住重点', '如果有踩坑点，可以直接写成小清单'],
    en: ['Lead with the takeaway so it is easy to scan', 'Turn pitfalls into a quick checklist']
  },
  [POST_TYPES.GENERAL_DISCUSSION.key]: {
    zh: ['如果想让更多人回复，可以加一个明确提问', '配上更具体的话题会更容易被推荐'],
    en: ['Add a clear question to invite replies', 'A specific topic helps the post get surfaced']
  }
}

const DRAFT_IMPACT_BASE = {
  [POST_TYPES.SEEK_GUIDANCE.key]: 72,
  [POST_TYPES.SEEK_PRACTICE.key]: 68,
  [POST_TYPES.SHARE_EXPERIENCE.key]: 62,
  [POST_TYPES.GENERAL_DISCUSSION.key]: 48
}

const getPostAuthorRole = (post) => post.author_role || post.role || ''
const getPostLikes = (post) => Number(post.likes_count ?? post.likes ?? 0)
const getPostCommentCount = (post) => Number(post.comment_count ?? post.commentsCount ?? 0)
const getPostCreatedAt = (post) => post.created_at || post.createdAt || new Date().toISOString()

export function detectPostType(content, title = '') {
  const text = `${title} ${content}`.toLowerCase()

  const seekGuidanceKeywords = [
    '姹傚姪',
    '璇锋暀',
    '寤鸿',
    '鎬庝箞鍔?',
    '搴旇鎬庢牱',
    '鍜嬫牱',
    '鎴戣',
    '鎬庝箞閫?',
    '鍝釜',
    '搴旇',
    'help',
    'advice',
    'suggest',
    'should',
    '鏂瑰悜',
    '杩疯尗',
    '涓嶇煡閬?'
  ]

  const seekPracticeKeywords = [
    '瀹炰範',
    '瀹炶返',
    '椤圭洰',
    '姣旇禌',
    '绔炶禌',
    '缁勯槦',
    '鎷涘嫙',
    '瀵绘壘',
    '鍚堜綔',
    '鍙傚姞',
    'internship',
    'project',
    'hackathon',
    'recruit',
    'team',
    '姹傜粍闃?'
  ]

  const shareExperienceKeywords = [
    '缁忛獙',
    '蹇冨緱',
    '鍒嗕韩',
    '鏀荤暐',
    '鎬荤粨',
    '澶嶄範',
    '搴旇瘯',
    '闈㈣瘯',
    '鍗囧',
    '閫夎',
    '涓撲笟',
    'experience',
    'tips',
    'guide',
    '鎰熸偀',
    '浣撶'
  ]

  const typeScores = {
    [POST_TYPES.SEEK_GUIDANCE.key]: 0,
    [POST_TYPES.SEEK_PRACTICE.key]: 0,
    [POST_TYPES.SHARE_EXPERIENCE.key]: 0,
    [POST_TYPES.GENERAL_DISCUSSION.key]: 0
  }

  seekGuidanceKeywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      typeScores[POST_TYPES.SEEK_GUIDANCE.key]++
    }
  })

  seekPracticeKeywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      typeScores[POST_TYPES.SEEK_PRACTICE.key]++
    }
  })

  shareExperienceKeywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      typeScores[POST_TYPES.SHARE_EXPERIENCE.key]++
    }
  })

  const maxScore = Math.max(...Object.values(typeScores))

  if (maxScore === 0) {
    return POST_TYPES.GENERAL_DISCUSSION.key
  }

  return Object.entries(typeScores).find(([, score]) => score === maxScore)?.[0]
}

export function getRecommendationTags(authorGrade, postType) {
  const tags = []

  if (
    (authorGrade === GRADE_LEVELS.MIDDLE.key || authorGrade === GRADE_LEVELS.HIGH.key) &&
    (postType === POST_TYPES.SEEK_GUIDANCE.key || postType === POST_TYPES.SEEK_PRACTICE.key)
  ) {
    tags.push(CROSS_GRADE_TAGS.BRIDGE_JUNIOR.key)
  }

  if (
    (authorGrade === GRADE_LEVELS.COLLEGE.key || authorGrade === GRADE_LEVELS.GRADUATE.key) &&
    postType === POST_TYPES.SHARE_EXPERIENCE.key
  ) {
    tags.push(CROSS_GRADE_TAGS.BRIDGE_SENIOR.key)
  }

  return tags
}

export function enrichPostWithRecommendationData(post) {
  const authorGrade = roleToGradeKey[getPostAuthorRole(post)] || GRADE_LEVELS.COLLEGE.key
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

export function calculateRecommendationScore(post, viewerGrade, viewerInterests = []) {
  let score = 0

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

  if (gradeGap > 0) {
    if (
      post.postType === POST_TYPES.SHARE_EXPERIENCE.key ||
      post.postType === POST_TYPES.SEEK_GUIDANCE.key
    ) {
      score += RECOMMENDATION_WEIGHTS.POST_TYPE_MATCH
    }
  }

  if (post.recommendationTags && post.recommendationTags.length > 0) {
    score += RECOMMENDATION_WEIGHTS.EXPERIENCE_RELEVANCE
  }

  const engagementScore = getPostLikes(post) * 0.1 + getPostCommentCount(post) * 0.15
  score += Math.min(engagementScore, 2)

  const createdAt = new Date(getPostCreatedAt(post))
  const hoursOld = Number.isNaN(createdAt.getTime())
    ? 0
    : (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)

  if (hoursOld < 24) {
    score += RECOMMENDATION_WEIGHTS.RECENCY_BONUS
  } else if (hoursOld < 72) {
    score += RECOMMENDATION_WEIGHTS.RECENCY_BONUS * 0.5
  }

  if (viewerInterests.length > 0) {
    const normalizedText = `${post.topic} ${post.content}`.toLowerCase()
    const interestMatch = viewerInterests.some((interest) =>
      normalizedText.includes(String(interest).toLowerCase())
    )

    if (interestMatch) {
      score += RECOMMENDATION_WEIGHTS.SAME_INTEREST
    }
  }

  return score
}

function getGradeGap(viewerGrade, authorGrade) {
  const gradeOrder = {
    [GRADE_LEVELS.MIDDLE.key]: 1,
    [GRADE_LEVELS.HIGH.key]: 2,
    [GRADE_LEVELS.COLLEGE.key]: 3,
    [GRADE_LEVELS.GRADUATE.key]: 4
  }

  return (gradeOrder[authorGrade] || 0) - (gradeOrder[viewerGrade] || 0)
}

export function sortPostsByRecommendation(posts, viewerGrade, options = {}) {
  const { filterSameGrade = false } = options

  let filtered = posts

  if (filterSameGrade) {
    filtered = posts.filter((post) => post.authorGrade !== viewerGrade)
  }

  return filtered.sort((a, b) => {
    const scoreA = calculateRecommendationScore(a, viewerGrade)
    const scoreB = calculateRecommendationScore(b, viewerGrade)
    return scoreB - scoreA
  })
}

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

export function formatPostTypeLabel(postType, locale = 'zh') {
  const typeObj = Object.values(POST_TYPES).find((type) => type.key === postType)
  if (!typeObj) {
    return POST_TYPES.GENERAL_DISCUSSION[locale]
  }

  return typeObj[locale] || typeObj.en
}

export function formatGradeLabel(gradeKey, locale = 'zh') {
  const gradeObj = Object.values(GRADE_LEVELS).find((grade) => grade.key === gradeKey)
  if (!gradeObj) {
    return '未知年级'
  }

  return gradeObj[locale] || gradeObj.en
}

export function analyzeDraftPost(content = '', topic = '', authorRole = '', locale = 'zh') {
  const normalizedContent = content.trim()
  const normalizedTopic = topic.trim()
  const postType = detectPostType(normalizedContent, normalizedTopic)
  const gradeKey = roleToGradeKey[authorRole] || ''
  const suggestions = DRAFT_TOPIC_SUGGESTIONS[postType]?.[locale] || []
  const coachHints = DRAFT_COACH_HINTS[postType]?.[locale] || []
  const isQuestion = /[?？]/.test(normalizedContent)
  const isDetailed = normalizedContent.length >= 80
  const isCrossGradeFriendly =
    gradeKey &&
    ['middle', 'high'].includes(gradeKey) &&
    (postType === POST_TYPES.SEEK_GUIDANCE.key || postType === POST_TYPES.SEEK_PRACTICE.key)

  const impactScore = Math.min(
    100,
    DRAFT_IMPACT_BASE[postType] +
      Math.min(Math.floor(normalizedContent.length / 18), 12) +
      (isQuestion ? 6 : 0) +
      (isDetailed ? 8 : 0) +
      (isCrossGradeFriendly ? 10 : 3)
  )

  const gradeLabel = gradeKey ? formatGradeLabel(gradeKey, locale) : ''
  const recommendedTopic =
    normalizedTopic || suggestions[0] || (locale === 'zh' ? '校园生活' : 'Campus life')

  return {
    gradeKey,
    gradeLabel,
    postType,
    postTypeLabel: formatPostTypeLabel(postType, locale),
    recommendedTopic,
    topicSuggestions: suggestions.slice(0, 3),
    coachHints: coachHints.slice(0, 2),
    impactScore,
    impactLevel:
      impactScore >= 85
        ? locale === 'zh'
          ? '非常强'
          : 'Very strong'
        : impactScore >= 65
          ? locale === 'zh'
            ? '不错'
            : 'Solid'
          : locale === 'zh'
            ? '可再加强'
            : 'Needs more detail',
    reachHint: isCrossGradeFriendly
      ? locale === 'zh'
        ? '这类内容更容易连接到高年级或同阶段同学'
        : 'This kind of post tends to connect well across grades'
      : locale === 'zh'
        ? '补一个更明确的提问，能让更多人愿意回复'
        : 'A clearer ask usually gets more replies',
    callToAction:
      postType === POST_TYPES.SHARE_EXPERIENCE.key
        ? locale === 'zh'
          ? '先写结论，再补细节'
          : 'Lead with the takeaway'
        : locale === 'zh'
          ? '把问题写得更具体'
          : 'Make the ask more specific'
  }
}

export function buildDiscoveryInsights(posts = [], viewerRole = '', locale = 'zh') {
  const viewerGrade = roleToGradeKey[viewerRole] || GRADE_LEVELS.COLLEGE.key
  const rankedPosts = sortPostsByRecommendation(
    posts.map(enrichPostWithRecommendationData),
    viewerGrade
  )

  const typeCounts = rankedPosts.reduce((summary, post) => {
    summary[post.postType] = (summary[post.postType] || 0) + 1
    return summary
  }, {})

  const topicCounts = rankedPosts.reduce((summary, post) => {
    const key = post.topic?.trim()
    if (!key) {
      return summary
    }

    summary.set(key, (summary.get(key) || 0) + 1)
    return summary
  }, new Map())

  const topTopics = [...topicCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([topic, count]) => ({ topic, count }))

  const crossGradeOpportunities = rankedPosts.filter(
    (post) => post.crossGradeIndicator && post.authorGrade !== viewerGrade
  )

  return {
    viewerGrade,
    rankedPosts,
    typeCounts,
    topTopics,
    bestPost: rankedPosts[0] || null,
    crossGradeOpportunities: crossGradeOpportunities.slice(0, 5),
    totalPosts: rankedPosts.length,
    locale
  }
}
