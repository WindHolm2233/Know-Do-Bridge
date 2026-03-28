/**
 * 知行之星系统 - 快速集成示例
 * Quick Integration Examples
 */

// ==========================================
// 示例 1: 在 ExploreView 中添加排行榜
// ==========================================

/**
 * 文件: src/views/ExploreView.vue
 */
// <template>
//   <AppShellLayout :current-user="authStore.currentUser">
//     <AppHeader
//       :title="uiStore.t('knowDoStarTitle')"
//       :subtitle="uiStore.t('knowDoStarSubtitle')"
//     />
//
//     <!-- 知行之星排行榜 -->
//     <KnowDoStarLeaderboard
//       :posts="enrichedPosts"
//       :comments="socialStore.comments || []"
//     />
//
//     <!-- 其他内容 -->
//     <div class="explore-content">
//       <PostFeed :posts="recommendedPosts" />
//     </div>
//   </AppShellLayout>
// </template>
//
// <script setup>
// import { computed } from 'vue'
// import { useAuthStore } from '@/stores/auth'
// import { useSocialStore } from '@/stores/social'
// import { useUiStore } from '@/stores/ui'
// import KnowDoStarLeaderboard from '@/components/KnowDoStarLeaderboard.vue'
// import PostFeed from '@/components/PostFeed.vue'
// import AppHeader from '@/views/AppHeader.vue'
// import AppShellLayout from '@/views/AppShellLayout.vue'
// import { enrichPostWithRecommendationData } from '@/utils/recommendationEngine'
// import { roleToGradeKey } from '@/constants/gradeSystem'
//
// const authStore = useAuthStore()
// const socialStore = useSocialStore()
// const uiStore = useUiStore()
//
// // 为所有帖子添加推荐数据
// const enrichedPosts = computed(() =>
//   socialStore.posts.map(enrichPostWithRecommendationData)
// )
//
// // 用户年级
// const userGrade = computed(
//   () => roleToGradeKey[authStore.currentUser?.role] || 'college'
// )
// </script>

// ==========================================
// 示例 2: 在用户个人主页添加成就证书
// ==========================================

/**
 * 文件: src/views/ProfileView.vue
 */
// <template>
//   <AppShellLayout :current-user="authStore.currentUser">
//     <AppHeader :title="uiStore.t('profileTitle')" />
//
//     <!-- 个人信息 -->
//     <div class="profile-header">
//       <!-- ... 现有代码 ... -->
//     </div>
//
//     <!-- 知行之星成就（新增） -->
//     <section v-if="currentUser" class="achievement-section">
//       <UserAchievementCertificate
//         :user-id="currentUser.id"
//         :user-star="userStarStatus"
//         @share="handleShare"
//         @download="handleDownloadCertificate"
//       />
//     </section>
//
//     <!-- 用户帖子列表 -->
//     <PostFeed :posts="userPosts" />
//   </AppShellLayout>
// </template>
//
// <script setup>
// import { computed } from 'vue'
// import { useAuthStore } from '@/stores/auth'
// import { useSocialStore } from '@/stores/social'
// import { useUiStore } from '@/stores/ui'
// import { useKnowDoStar } from '@/composables/useKnowDoStar'
// import UserAchievementCertificate from '@/components/UserAchievementCertificate.vue'
//
// const authStore = useAuthStore()
// const socialStore = useSocialStore()
// const uiStore = useUiStore()
// const { getUserStarStatus } = useKnowDoStar(socialStore.posts, socialStore.comments)
//
// const currentUser = computed(() => authStore.currentUser)
// const userStarStatus = computed(() =>
//   currentUser.value ? getUserStarStatus(currentUser.value.id) : null
// )
// </script>

// ==========================================
// 示例 3: 在 PostBox 中显示帖子类型检测
// ==========================================

/**
 * 文件: src/views/PostBox.vue (修改部分)
 */
// <script setup>
// import { detectPostType } from '@/utils/recommendationEngine'
//
// const form = reactive({
//   content: '',
//   title: '',
//   topic: '',
//   detectedType: null
// })
//
// // 监听内容变化，自动检测帖子类型
// watch(
//   () => form.content,
//   (newContent) => {
//     form.detectedType = detectPostType(newContent, form.title)
//   }
// )
//
// const handlePublish = async () => {
//   // 自动检测帖子类型
//   const postPayload = {
//     ...form,
//     postType: form.detectedType
//   }
//   // ... 发布逻辑 ...
// }
// </script>
//
// <template>
//   <div class="post-box">
//     <input v-model="form.title" placeholder="标题（可选）" />
//     <textarea v-model="form.content" placeholder="分享..." />
//
//     <!-- 自动检测的帖子类型提示 -->
//     <div v-if="form.detectedType" class="type-hint">
//       <span>📌 系统检测：{{ form.detectedType }}</span>
//     </div>
//
//     <button @click="handlePublish">发布</button>
//   </div>
// </template>

// ==========================================
// 示例 4: 在 Store 中集成评选逻辑
// ==========================================

/**
 * 文件: src/stores/social.js (修改部分)
 */
// import { generateKnowDoStarLeaderboard } from '@/utils/knowDoStarSystem'
//
// export const useSocialStore = defineStore('social', () => {
//   // ... 现有代码 ...
//
//   const knowDoStarLeaderboard = ref(null)
//   const lastStarUpdateTime = ref(0)
//
//   /**
//    * 更新知行之星排行榜（缓存24小时）
//    */
//   const updateKnowDoStarLeaderboard = () => {
//     const now = Date.now()
//
//     // 缓存24小时内的结果
//     if (lastStarUpdateTime.value && now - lastStarUpdateTime.value < 24 * 60 * 60 * 1000) {
//       return knowDoStarLeaderboard.value
//     }
//
//     if (posts.value.length === 0) return null
//
//     try {
//       knowDoStarLeaderboard.value = generateKnowDoStarLeaderboard(
//         posts.value,
//         comments.value,
//         'monthly'
//       )
//       lastStarUpdateTime.value = now
//       return knowDoStarLeaderboard.value
//     } catch (error) {
//       console.error('Failed to generate Know-Do Star leaderboard:', error)
//       return null
//     }
//   }
//
//   /**
//    * 在加载初始帖子后更新排行榜
//    */
//   const loadInitialPosts = async ({ force = false } = {}) => {
//     // ... 现有逻辑 ...
//
//     try {
//       posts.value = await fetchPosts()
//       loadedAt.value = Date.now()
//
//       // 新增：更新知行之星排行榜
//       updateKnowDoStarLeaderboard()
//
//       return posts.value
//     } catch (err) {
//       error.value = translateError(err, 'socialLoadPosts')
//       return posts.value
//     } finally {
//       loading.value = false
//       loadPromise = null
//     }
//   }
//
//   return {
//     // ... 现有exports ...
//     knowDoStarLeaderboard,
//     updateKnowDoStarLeaderboard
//   }
// })

// ==========================================
// 示例 5: 在顶部导航添加知行之星链接
// ==========================================

/**
 * 文件: src/views/AppShellLayout.vue (修改 navItems)
 */
// const navItems = computed(() => [
//   { to: '/', label: uiStore.t('navHome') },
//   { to: '/explore', label: uiStore.t('navExplore') },
//   { to: '/know-do-stars', label: uiStore.t('knowDoStarTitle'), icon: '⭐' }, // 新增
//   { to: '/notifications', label: uiStore.t('navNotifications') },
//   { to: '/messages', label: uiStore.t('navMessages'), badge: unreadCount },
//   { to: '/profile', label: uiStore.t('navProfile') }
// ])

// ==========================================
// 示例 6: 后端定时任务（Node.js）
// ==========================================

/**
 * 文件: server/tasks/knowDoStarSelection.js (示例)
 */
// const cron = require('node-cron')
// const { generateKnowDoStarLeaderboard } = require('./utils/knowDoStarSystem')
// const db = require('./db')
//
// // 每周一早上8点运行月度评选
// cron.schedule('0 8 * * 1', async () => {
//   console.log('🌟 运行知行之星月度评选...')
//
//   try {
//     // 获取所有帖子和评论
//     const [posts, comments] = await Promise.all([
//       db.query('SELECT * FROM posts'),
//       db.query('SELECT * FROM comments')
//     ])
//
//     // 生成排行榜
//     const leaderboard = generateKnowDoStarLeaderboard(posts, comments, 'monthly')
//
//     // 保存到数据库
//     for (const tier of ['goldStars', 'silverStars', 'bronzeStars']) {
//       for (const star of leaderboard[tier]) {
//         await db.query(`
//           INSERT INTO know_do_stars (user_id, period, tier, score, achievement_badges)
//           VALUES ($1, $2, $3, $4, $5)
//           ON CONFLICT (user_id, period) DO UPDATE SET
//             tier = $3, score = $4, achievement_badges = $5
//         `, [
//           star.userId,
//           'monthly',
//           tier.replace('Stars', ''),
//           star.score,
//           JSON.stringify(star.badges)
//         ])
//       }
//     }
//
//     // 发送通知给获奖者
//     for (const star of [...leaderboard.goldStars, ...leaderboard.silverStars, ...leaderboard.bronzeStars]) {
//       await notifyUser(star.userId, {
//         title: '🌟 恭喜！您入选了知行之星',
//         body: `您获得了本月${star.tierLabel}，快去查看您的证书吧！`
//       })
//     }
//
//     console.log('✅ 知行之星评选完成')
//   } catch (error) {
//     console.error('❌ 知行之星评选失败:', error)
//   }
// })

// ==========================================
// 示例 7: 手动触发评选（管理员功能）
// ==========================================

/**
 * API 端点: POST /api/admin/trigger-know-do-stars
 */
// router.post('/api/admin/trigger-know-do-stars', async (req, res) => {
//   const { period = 'monthly' } = req.body
//
//   try {
//     // 验证管理员权限
//     if (!isAdmin(req.user)) {
//       return res.status(403).json({ error: 'Unauthorized' })
//     }
//
//     // 获取数据
//     const posts = await Post.find()
//     const comments = await Comment.find()
//
//     // 生成排行榜
//     const leaderboard = generateKnowDoStarLeaderboard(posts, comments, period)
//
//     // 保存结果
//     await KnowDoStar.saveLeaderboard(period, leaderboard)
//
//     // 发送通知
//     await notifyAllWinners(leaderboard)
//
//     res.json({ success: true, leaderboard })
//   } catch (error) {
//     res.status(500).json({ error: error.message })
//   }
// })

// ==========================================
// 使用提示
// ==========================================

/**
 * 1. 复制上面的示例代码到相应文件
 * 2. 调整导入路径和变量名以匹配您的项目结构
 * 3. 确保已安装所有依赖
 * 4. 在浏览器控制台测试各个函数
 *
 * 常见问题：
 * Q: 为什么评选结果为空？
 * A: 检查是否有足够的互动数据，确保用户互动率不低于50%跨年级
 *
 * Q: 如何自定义计分规则？
 * A: 编辑 src/constants/gradeSystem.js 中的 KNOW_DO_STAR_CONFIG.SCORING_RULES
 *
 * Q: 如何手动刷新排行榜？
 * A: 调用 socialStore.updateKnowDoStarLeaderboard()
 */
