# 知行之星系统 - 集成清单

> 使用此清单确保所有组件正确集成到你的项目中

## ✅ 核心文件验证

### 常量和工具文件
- [x] `src/constants/gradeSystem.js` - 已创建（53KB）
  - 包含：GRADE_LEVELS, POST_TYPES, CROSS_GRADE_TAGS, KNOW_DO_STAR_CONFIG
  - 验证方法：`import { GRADE_LEVELS } from '@/constants/gradeSystem'`

- [x] `src/utils/recommendationEngine.js` - 已创建（12KB）
  - 核心函数：detectPostType, getRecommendationTags, calculateRecommendationScore
  - 验证方法：运行 `detectPostType('求助！如何选择专业？', '大学专业选择')`

- [x] `src/utils/knowDoStarSystem.js` - 已创建（15KB）
  - 核心函数：calculateUserKnowDoScore, selectKnowDoStars, generateKnowDoStarLeaderboard
  - 验证方法：运行 `generateKnowDoStarLeaderboard([], [], 'monthly')`

### Vue 组件
- [x] `src/components/KnowDoStarLeaderboard.vue` - 已创建（7KB）
  - 功能：展示月度/学期排行榜，支持三级星级
  - 测试：在页面中渲染 `<KnowDoStarLeaderboard :posts="posts" :comments="comments" />`

- [x] `src/components/UserAchievementCertificate.vue` - 已创建（8KB）
  - 功能：显示个人成就证书和徽章
  - 测试：在用户页面中渲染 `<UserAchievementCertificate :user-star="userStar" />`

### Composable
- [x] `src/composables/useKnowDoStar.js` - 已创建（6KB）
  - 导出：useKnowDoStar, computedUserStar, useUserAchievements, 3个辅助函数
  - 测试：在组件中使用 `const { leaderboard } = useKnowDoStar(posts, comments)`

## 📝 文本/文档更新

- [x] `src/locales/uiMessages.js` - 已添加20+新消息
  - 中文：knowDoStarTitle, knowDoStarSubtitle, 成就名称等
  - 英文：对应的英文翻译
  - 验证：`uiStore.t('knowDoStarTitle')` 应返回 "知行之星" 或 "Know-Do Stars"

- [x] `KNOW_DO_STAR_GUIDE.md` - 详细实现指南
- [x] `KNOW_DO_STAR_EXAMPLES.js` - 7个集成示例
- [x] `KNOW_DO_STAR_SUMMARY.md` - 功能总结和预览
- [x] `KNOW_DO_STAR_INTEGRATION_CHECKLIST.md` - 此文件

## 🔄 集成步骤

### Step 1: 验证导入 (5分钟)
```javascript
// 在浏览器控制台测试
import { POST_TYPES } from '@/constants/gradeSystem'
import { detectPostType } from '@/utils/recommendationEngine'
import { generateKnowDoStarLeaderboard } from '@/utils/knowDoStarSystem'

console.log('POST_TYPES:', POST_TYPES)
console.log('Post type:', detectPostType('我实习面试经验分享'))
// 应该输出合理的数据，无错误
```

### Step 2: 在 Store 中添加排行榜管理 (10分钟)
编辑 `src/stores/social.js`：

```javascript
// 添加导入
import { generateKnowDoStarLeaderboard } from '@/utils/knowDoStarSystem'

// 在 useSocialStore 中添加
const knowDoStarLeaderboard = ref(null)
const lastStarUpdateTime = ref(0)

const updateKnowDoStarLeaderboard = () => {
  const now = Date.now()
  if (lastStarUpdateTime.value && now - lastStarUpdateTime.value < 24 * 60 * 60 * 1000) {
    return knowDoStarLeaderboard.value
  }
  
  if (posts.value.length === 0) return null
  
  try {
    knowDoStarLeaderboard.value = generateKnowDoStarLeaderboard(
      posts.value,
      [],  // 暂时用空数组，之后添加comments
      'monthly'
    )
    lastStarUpdateTime.value = now
    return knowDoStarLeaderboard.value
  } catch (error) {
    console.error('Failed to generate Know-Do Star leaderboard:', error)
    return null
  }
}

return {
  // ... 现有exports ...
  knowDoStarLeaderboard,
  updateKnowDoStarLeaderboard
}
```

### Step 3: 创建或更新页面 (15分钟)
创建或编辑 `src/views/KnowDoStarView.vue`：

```vue
<template>
  <AppShellLayout :current-user="authStore.currentUser">
    <AppHeader
      :title="uiStore.t('knowDoStarTitle')"
      :subtitle="uiStore.t('knowDoStarSubtitle')"
    />

    <KnowDoStarLeaderboard
      :posts="socialStore.posts"
      :comments="[]"
    />
  </AppShellLayout>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useSocialStore } from '@/stores/social'
import { useUiStore } from '@/stores/ui'
import KnowDoStarLeaderboard from '@/components/KnowDoStarLeaderboard.vue'
import AppHeader from '@/views/AppHeader.vue'
import AppShellLayout from '@/views/AppShellLayout.vue'

const authStore = useAuthStore()
const socialStore = useSocialStore()
const uiStore = useUiStore()
</script>
```

### Step 4: 添加路由 (5分钟)
编辑 `src/router/index.js`：

```javascript
// 添加到路由数组
{
  path: '/know-do-stars',
  name: 'KnowDoStars',
  component: () => import('@/views/KnowDoStarView.vue')
}
```

### Step 5: 更新导航菜单 (5分钟)
编辑 `src/views/AppShellLayout.vue` 中的 `navItems`：

```javascript
const navItems = computed(() => [
  { to: '/', label: uiStore.t('navHome') },
  { to: '/explore', label: uiStore.t('navExplore') },
  { to: '/know-do-stars', label: uiStore.t('knowDoStarTitle') },  // 新增
  { to: '/notifications', label: uiStore.t('navNotifications') },
  {
    to: '/messages',
    label: uiStore.t('navMessages'),
    badge: messagesStore.getUnreadThreadCount(authStore.currentUser?.id)
  },
  { to: '/profile', label: uiStore.t('navProfile') }
])
```

### Step 6: 在用户页面添加成就证书 (10分钟)
编辑 `src/views/ProfileView.vue`：

```vue
<script setup>
// 添加导入
import { useKnowDoStar } from '@/composables/useKnowDoStar'
import UserAchievementCertificate from '@/components/UserAchievementCertificate.vue'

// 添加逻辑
const { getUserStarStatus } = useKnowDoStar(socialStore.posts, [])

const userStarStatus = computed(() => {
  if (!currentUser.value) return null
  return getUserStarStatus(currentUser.value.id)
})
</script>

<!-- 在模板中添加 -->
<template>
  <AppShellLayout :current-user="authStore.currentUser">
    <!-- ... 现有内容 ... -->

    <!-- 知行之星成就（新增） -->
    <section v-if="currentUser" class="achievement-section">
      <UserAchievementCertificate
        :user-id="currentUser.id"
        :user-star="userStarStatus"
      />
    </section>

    <!-- ... 其他内容 ... -->
  </AppShellLayout>
</template>
```

## 🧪 功能测试清单

- [ ] 能成功导入所有模块，无错误
- [ ] `detectPostType()` 正确识别帖子类型
- [ ] `generateKnowDoStarLeaderboard()` 返回合理的排行榜
- [ ] KnowDoStarLeaderboard 组件正确渲染
- [ ] UserAchievementCertificate 组件正确渲染
- [ ] 路由能正确导航到知行之星页面
- [ ] 导航菜单显示知行之星链接
- [ ] 用户页面显示成就证书（如果获奖）
- [ ] UI 文本正确展示（中英文切换）
- [ ] 响应式设计在移动端工作正常

## 🐛 常见问题排查

### 问题：导入错误 "Cannot find module..."
**解决**: 检查文件路径是否正确，使用 `@/` 别名而不是相对路径

### 问题：排行榜为空
**解决**: 确保有足够的测试数据，检查 `MIN_SCORE_BRONZE` 阈值是否设置过高

### 问题：组件不显示
**解决**: 
1. 检查是否正确引入组件
2. 检查 props 是否正确传入
3. 在浏览器开发者工具中检查错误

### 问题：样式不生效
**解决**: 确保 CSS 变量在 `src/assets/base.css` 中定义，检查 `--app-primary` 等变量

### 问题：UI 文本显示不出来
**解决**: 检查 `uiMessages.js` 是否正确添加，验证关键名称拼写

## 📊 数据集成（可选，后续）

如果使用 Supabase，在 `schema.sql` 中添加：

```sql
CREATE TABLE IF NOT EXISTS public.know_do_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period TEXT NOT NULL,           -- 'monthly' or 'semester'
  tier TEXT NOT NULL,              -- 'gold', 'silver', 'bronze'
  score INTEGER NOT NULL,
  achievement_badges JSONB,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period)
);

CREATE INDEX idx_know_do_stars_period ON public.know_do_stars(period);
CREATE INDEX idx_know_do_stars_user ON public.know_do_stars(user_id);
```

## 📈 后续增强建议

### 优先级高
- [ ] 添加推送通知（用户获奖时）
- [ ] 实现证书下载功能
- [ ] 添加数据库持久化
- [ ] 实现后端定时评选任务

### 优先级中
- [ ] 成就徽章收集系统
- [ ] 用户互动历史记录
- [ ] 管理后台调整评选规则
- [ ] 排行榜分享功能

### 优先级低
- [ ] 3D证书预览
- [ ] 成就统计图表
- [ ] 用户排名趋势分析
- [ ] AR/VR成就展示

## ✨ 部署前检查

- [ ] 所有文件已创建且无语法错误
- [ ] 所有导入路径正确
- [ ] 所有必要的依赖已安装
- [ ] UI 在桌面和移动设备上测试过
- [ ] 中文和英文 UI 都已测试
- [ ] 控制台无警告和错误
- [ ] 性能测试通过（排行榜生成 <1s）

## 📞 支持

如遇到问题：
1. 查看 `KNOW_DO_STAR_GUIDE.md` 详细指南
2. 参考 `KNOW_DO_STAR_EXAMPLES.js` 中的示例代码
3. 检查浏览器控制台的错误信息
4. 验证所有文件是否正确创建

---

**清单版本**: 1.0  
**最后更新**: 2026年3月28日  
**状态**: ✅ 所有文件已创建，可开始集成
