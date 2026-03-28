# 知行之星系统 - 实现指南

## 📋 功能概述

知行之星系统是知行桥项目的核心激励机制，用于每月/每学期表彰以下用户贡献：
- **打破年级壁垒**：持续提升互动率（重点鼓励跨年级互动）
- **连接他人**：帮助不同年级的学生交流
- **分享智慧**：发布高质量的经验和建议

## 🎯 核心功能模块

### 1. 年级系统 (`constants/gradeSystem.js`)
定义了完整的年级体系和推荐权重：
- **年级等级**：初中、高中、大学、已毕业
- **帖子类型**：求指导、求实践、分享经验、讨论
- **跨年级标签**：鼓励跨年级、指导新生
- **评选规则**：3级星（金/银/铜）、5大成就类别

### 2. 推荐引擎 (`utils/recommendationEngine.js`)
智能推荐系统检查实现：
- 自动检测帖子类型（基于关键词）
- 计算推荐分数（年级、互动、新鲜度等）
- 精准排序推荐内容

**核心函数**：
```javascript
// 自动检测帖子类型
detectPostType(content, title)

// 获取推荐标签
getRecommendationTags(authorGrade, postType)

// 计算推荐分数
calculateRecommendationScore(post, viewerGrade)

// 智能排序
sortPostsByRecommendation(posts, viewerGrade, options)
```

### 3. 知行之星评选系统 (`utils/knowDoStarSystem.js`)
用户表彰和排行榜系统：

**主要类**：
- `UserMetrics`：用户交互指标收集

**主要函数**：
```javascript
// 计算用户得分（总分 0-200+）
calculateUserKnowDoScore(posts, comments, userGrade, userId)

// 月度/学期评选
selectKnowDoStars(posts, comments, periodDays)

// 分配成就徽章
assignAchievementBadges(metrics)

// 生成排行榜
generateKnowDoStarLeaderboard(posts, comments, period)
```

**计分规则**：
| 行为 | 分数 |
|------|------|
| 跨年级回复 | 15分 |
| 回复求指导 | 10分 |
| 分享经验 | 12分 |
| 被跨年级点赞（每个） | 3分 |
| 贴子热度奖励（每10赞） | 5分 |
| 被标记有帮助 | 20分 |

**获奖门槛**：
- 🥇 **金星**：≥100分 + ≥50%互动率（跨年级权重）
- 🥈 **银星**：≥60分 + ≥50%互动率（跨年级权重）
- 🥉 **铜星**：≥30分 + ≥50%互动率（跨年级权重）

每个分类选取Top 3获胜者

### 4. UI 组件

#### `KnowDoStarLeaderboard.vue`
知行之星排行榜展示组件
```vue
<KnowDoStarLeaderboard 
  :posts="posts"
  :comments="comments"
/>
```

**功能**：
- 月度/学期切换
- 三级星级划分展示
- 成就徽章显示
- 互动数据统计

#### `UserAchievementCertificate.vue`
用户个人成就证书
```vue
<UserAchievementCertificate
  :user-id="currentUser.id"
  :user-star="selectedStar"
  @share="handleShare"
  @download="handleDownloadCertificate"
/>
```

**功能**：
- 个人证书展示
- 成就徽章展示
- 分享到社交媒体
- 证书下载

## 🔌 集成步骤

### Step 1: 在 Store 中集成评选逻辑

编辑 `src/stores/social.js`：

```javascript
import { generateKnowDoStarLeaderboard } from '@/utils/knowDoStarSystem'

export const useSocialStore = defineStore('social', () => {
  // ... 现有代码 ...

  const knowDoStarLeaderboard = ref(null)

  const updateKnowDoStarLeaderboard = () => {
    if (posts.value.length === 0 || comments.value.length === 0) return
    
    knowDoStarLeaderboard.value = generateKnowDoStarLeaderboard(
      posts.value,
      comments.value,
      'monthly'  // 或 'semester'
    )
  }

  // 在加载帖子和评论后调用
  const loadInitialPosts = async () => {
    // ... 现有逻辑 ...
    updateKnowDoStarLeaderboard()
  }

  return {
    // ... 现有exports ...
    knowDoStarLeaderboard,
    updateKnowDoStarLeaderboard
  }
})
```

### Step 2: 在页面中添加排行榜

编辑 `src/views/ExploreView.vue`（或新建页面）：

```vue
<template>
  <AppShellLayout :current-user="authStore.currentUser">
    <AppHeader
      :title="uiStore.t('knowDoStarTitle')"
      :subtitle="uiStore.t('knowDoStarSubtitle')"
    />

    <KnowDoStarLeaderboard
      :posts="socialStore.posts"
      :comments="comments"
    />

    <!-- 其他内容 -->
  </AppShellLayout>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useSocialStore } from '@/stores/social'
import { useUiStore } from '@/stores/ui'
import KnowDoStarLeaderboard from '@/components/KnowDoStarLeaderboard.vue'

const authStore = useAuthStore()
const socialStore = useSocialStore()
const uiStore = useUiStore()
</script>
```

### Step 3: 添加用户个人成就展示

在用户个人主页（`ProfileView.vue`）中添加：

```vue
<template>
  <!-- ... 现有代码 ... -->
  
  <UserAchievementCertificate
    :user-id="currentUser.id"
    :user-star="userStar"
  />
</template>

<script setup>
import UserAchievementCertificate from '@/components/UserAchievementCertificate.vue'
import { computedUserStar } from '@/composables/useKnowDoStar'

const userStar = computedUserStar(currentUserId, socialStore.knowDoStarLeaderboard)
</script>
```

### Step 4: 在帖子中显示标签和类型

编辑 `PostFeed.vue` 或 `PostBox.vue`：

```javascript
import { enrichPostWithRecommendationData } from '@/utils/recommendationEngine'

const enrichedPosts = posts.map(enrichPostWithRecommendationData)
```

在模板中展示：
```vue
<span v-if="post.postType" class="post-type-badge">
  {{ post.postType }}
</span>

<span v-if="post.crossGradeIndicator" class="cross-grade-tag">
  🌉 {{ post.crossGradeIndicator.zh }}
</span>
```

## 📊 数据流程

```
用户发帖/评论
    ↓
enrichPostWithRecommendationData()
    ↓
detectPostType() + getRecommendationTags()
    ↓
帖子储存（含元数据）
    ↓
每天/周/月触发评选
    ↓
calculateUserKnowDoScore()
    ↓
selectKnowDoStars()
    ↓
返回排行榜 + 个人证书
    ↓
UI 展示 + 通知用户
```

## 🛠️ 定制配置

编辑 `src/constants/gradeSystem.js` 中的 `KNOW_DO_STAR_CONFIG`：

```javascript
// 修改计分规则
SCORING_RULES: {
  CROSS_GRADE_RESPONSE_POINTS: 15,  // 调整跨年级回复分数
  // ...
}

// 修改获奖门槛
SELECTION_CRITERIA: {
  MIN_SCORE_GOLD: 100,      // 调整金星最低分
  MIN_SCORE_SILVER: 60,
  WINNERS_PER_CATEGORY: 3   // 每个分类的获奖人数
}

// 修改成就类别
ACHIEVEMENT_CATEGORIES: {
  // 添加或修改成就徽章
}
```

## 📍 数据库扩展（可选）

是否需要加到 SQL 库：默认不需要。

互动率可以由现有 `posts`、`comments`、`post_likes` 实时聚合计算，不必新增字段。只有在需要做“历史快照”“月度榜单归档”或“高并发预计算”时，才建议新增统计表。

如使用 Supabase，需要持久化榜单结果时，可在 `schema.sql` 中添加：

```sql
-- 知行之星记录表
create table if not exists public.know_do_stars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period text not null,  -- 'monthly' or 'semester'
  tier text not null,    -- 'gold', 'silver', 'bronze'
  score integer not null,
  achievement_badges jsonb,
  certificate_url text,
  issued_at timestamptz not null default timezone('utc', now()),
  unique (user_id, period)
);

create index if not exists idx_know_do_stars_period on public.know_do_stars (period);
create index if not exists idx_know_do_stars_user on public.know_do_stars (user_id);
```

## 🌟 特性清单

- [x] 自动年级检测和映射
- [x] 帖子类型智能识别
- [x] 跨年级推荐算法
- [x] 用户表现评分系统
- [x] 月度/学期排行榜
- [x] 成就徽章系统
- [x] 个人证书展示
- [x] 多语言支持
- [ ] 推送通知（入选时通知）
- [ ] 证书分享到社交媒体
- [ ] 排行榜持久化存储

## 📝 示例：完整工作流

```javascript
// 1. 用户发帖
const post = {
  content: '怎样准备高考？求高年级同学分享经验',
  author_role: '高中生'
}

// 2. 自动检测和标记
const enriched = enrichPostWithRecommendationData(post)
// → postType: 'seek_guidance'
// → recommendationTags: ['bridge_junior']

// 3. 月末评选
const leaderboard = generateKnowDoStarLeaderboard(posts, comments, 'monthly')

// 4. 用户A因为回复过多的求指导帖
// 和高互动率（跨年级权重）获得金星
leaderboard.goldStars[0]
// {
//   userName: '学长',
//   score: 125,
//   tier: 'gold',
//   badges: ['bridge_builder', 'helper', 'wisdom_sharer'],
//   crossGradeResponseCount: 12,
//   certificateText: '...'
// }

// 5. 展示证书
<UserAchievementCertificate :user-star="leaderboard.goldStars[0]" />
```

## 🚀 性能优化

- 评选逻辑可在后台定时任务中运行（每天/周）
- 排行榜结果可缓存，减少重复计算
- 建议评选时使用异步处理，避免阻塞主线程

```javascript
// 后台定时任务（伪代码）
setInterval(async () => {
  const leaderboard = await computeKnowDoStarLeaderboard()
  await saveLeaderboardToCache()
  notifyWinners(leaderboard)
}, 24 * 60 * 60 * 1000)  // 每天一次
```

## 📚 API 参考

详见各模块的 JSDoc 注释：
- `src/constants/gradeSystem.js`
- `src/utils/recommendationEngine.js`
- `src/utils/knowDoStarSystem.js`
