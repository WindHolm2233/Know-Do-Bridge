/**
 * 知行桥 - 年级系统和经验匹配常量
 * Grade system and experience matching for Know-Do Bridge
 */

// 年级 / Grade levels
export const GRADE_LEVELS = {
  MIDDLE: { key: 'middle', zh: '初中', en: 'Middle School', order: 1 },
  HIGH: { key: 'high', zh: '高中', en: 'High School', order: 2 },
  COLLEGE: { key: 'college', zh: '大学', en: 'College', order: 3 },
  GRADUATE: { key: 'graduate', zh: '已毕业', en: 'Graduate', order: 4 }
}

// 年级映射（从 role 到 grade key）
export const roleToGradeKey = {
  '初中生': GRADE_LEVELS.MIDDLE.key,
  'Middle School': GRADE_LEVELS.MIDDLE.key,
  '高中生': GRADE_LEVELS.HIGH.key,
  'High School': GRADE_LEVELS.HIGH.key,
  '大学生': GRADE_LEVELS.COLLEGE.key,
  'College': GRADE_LEVELS.COLLEGE.key,
  '已毕业': GRADE_LEVELS.GRADUATE.key,
  'Graduate': GRADE_LEVELS.GRADUATE.key
}

// 帖子类型 / Post types
export const POST_TYPES = {
  SEEK_GUIDANCE: { key: 'seek_guidance', zh: '求指导', en: 'Seeking Guidance', icon: '🤔' },
  SEEK_PRACTICE: { key: 'seek_practice', zh: '求实践', en: 'Seeking Practice', icon: '🚀' },
  SHARE_EXPERIENCE: { key: 'share_experience', zh: '分享经验', en: 'Share Experience', icon: '✨' },
  GENERAL_DISCUSSION: { key: 'general', zh: '讨论', en: 'Discussion', icon: '💬' }
}

// 跨年级推荐标签 / Cross-grade recommendation tags
export const CROSS_GRADE_TAGS = {
  BRIDGE_JUNIOR: {
    key: 'bridge_junior',
    zh: '鼓励跨年级',
    en: 'Cross-grade connection',
    description_zh: '欢迎高年级同学分享经验',
    description_en: 'Welcome insights from seniors',
    color: '#60a5fa'
  },
  BRIDGE_SENIOR: {
    key: 'bridge_senior',
    zh: '指导新生',
    en: 'Mentoring',
    description_zh: '高年级回顾低年级经历',
    description_en: 'Senior retrospective',
    color: '#10b981'
  }
}

// 推荐权重配置 / Recommendation weight config
export const RECOMMENDATION_WEIGHTS = {
  EXACT_GRADE_MATCH: 1.0,           // 相同年级
  ONE_LEVEL_UP: 1.8,                // 高一级（最优）
  TWO_LEVELS_UP: 1.6,               // 高两级
  THREE_LEVELS_UP: 1.4,             // 高三级
  SAME_INTEREST: 1.5,               // 相同兴趣
  EXPERIENCE_RELEVANCE: 1.7,        // 经验相关性（超级权重）
  POST_TYPE_MATCH: 1.3,             // 帖子类型匹配
  RECENCY_BONUS: 1.1                // 最近活跃加权
}

// 缓存配置 / Cache config
export const RECOMMENDATION_CACHE_MS = 5 * 60 * 1000 // 5 分钟

// 知行之星 / Know-Do Star system
export const KNOW_DO_STAR_CONFIG = {
  PERIODS: {
    MONTHLY: { key: 'monthly', zh: '月度', en: 'Monthly', daysWindow: 30 },
    SEMESTER: { key: 'semester', zh: '学期', en: 'Semester', daysWindow: 120 }
  },
  TIERS: {
    GOLD: { key: 'gold', zh: '金星', en: 'Gold Star', icon: '⭐', color: '#fbbf24' },
    SILVER: { key: 'silver', zh: '银星', en: 'Silver Star', icon: '✨', color: '#d1d5db' },
    BRONZE: { key: 'bronze', zh: '铜星', en: 'Bronze Star', icon: '⚡', color: '#f97316' }
  },
  ACHIEVEMENT_CATEGORIES: {
    BRIDGE_BUILDER: {
      key: 'bridge_builder',
      zh: '桥梁建造者',
      en: 'Bridge Builder',
      description_zh: '积极连接不同年级的学生',
      description_en: 'Actively connects students across grades',
      icon: '🌉'
    },
    WISDOM_SHARER: {
      key: 'wisdom_sharer',
      zh: '智慧分享者',
      en: 'Wisdom Sharer',
      description_zh: '分享有价值的经验和建议',
      description_en: 'Shares valuable experience and advice',
      icon: '📚'
    },
    HELPER: {
      key: 'helper',
      zh: '热心助手',
      en: 'Helper',
      description_zh: '积极回答问题、提供帮助',
      description_en: 'Actively answers questions and helps others',
      icon: '🤝'
    },
    TRENDSETTER: {
      key: 'trendsetter',
      zh: '话题引领者',
      en: 'Trendsetter',
      description_zh: '发起受欢迎的讨论',
      description_en: 'Initiates popular discussions',
      icon: '🔥'
    },
    COMMENT_STAR: {
      key: 'comment_star',
      zh: '评论达人',
      en: 'Comment Star',
      description_zh: '提出高质量的评论',
      description_en: 'Provides high-quality comments',
      icon: '💬'
    }
  },
  SCORING_RULES: {
    CROSS_GRADE_RESPONSE_POINTS: 15,      // 跨年级回复
    REPLY_TO_GUIDANCE_POINTS: 10,         // 回复求指导
    SHARE_EXPERIENCE_POINTS: 12,          // 分享经验
    RECEIVED_CROSS_GRADE_LIKE_POINTS: 3,  // 被跨年级点赞
    POST_POPULARITY_BONUS: 5,              // 帖子热度奖励（每10个赞）
    HELPFUL_RATING_TAP: 20                // 被标记为有帮助
  },
  SELECTION_CRITERIA: {
    MIN_SCORE_GOLD: 100,
    MIN_SCORE_SILVER: 60,
    MIN_SCORE_BRONZE: 30,
    WINNERS_PER_CATEGORY: 3,               // 每个分类选3个获胜者
    ENGAGEMENT_THRESHOLD: 0.5              // 最少要有50%的跨年级互动
  }
}
