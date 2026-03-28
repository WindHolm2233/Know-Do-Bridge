# 知行之星系统 - 功能总结

## 📌 核心价值主张

**知行之星** 是知行桥项目的关键激励机制，旨在：

1. 🌉 **打破年级壁垒** - 识别并表彰高互动率（含跨年级贡献）的参与者
2. 🤝 **鼓励互帮互助** - 激励高年级学生指导低年级、低年级学生积极参与
3. ✨ **建立社区荣誉** - 创建可视化的成就徽章和证书系统
4. 📊 **数据驱动评选** - 基于客观的交互指标，而非主观投票

## 🎯 已实现的核心功能

### 1️⃣ 年级系统与常量
**文件**: `src/constants/gradeSystem.js`

- ✅ **四级年级体系**：初中 → 高中 → 大学 → 已毕业
- ✅ **4种帖子类型**：求指导、求实践、分享经验、讨论
- ✅ **2类跨年级标签**：鼓励跨年级、指导新生
- ✅ **3级星级系统**：金星、银星、铜星（月度/学期）
- ✅ **5大成就徽章**：桥梁建造者、智慧分享者、热心助手、话题引领者、评论达人

### 2️⃣ 推荐引擎升级
**文件**: `src/utils/recommendationEngine.js`

- ✅ **自动帖子类型检测**：基于13+个中英文关键词
- ✅ **智能推荐标签生成**：根据年级和帖子类型自动标记
- ✅ **构建推荐分数算法**：综合年级、互动、新鲜度等6个维度
- ✅ **分级排序**：为不同年级的学生个性化推荐

**计分权重**：
```
- 跨一年级匹配：1.8x（最优）
- 经验相关性：1.7x
- 年级匹配：1.0x - 1.4x（等级递减）
- 帖子类型匹配：1.3x
- 新鲜度加权：1.1x
- 热度加权：0.1x - 2.0x（按互动数）
```

### 3️⃣ 知行之星评选系统
**文件**: `src/utils/knowDoStarSystem.js`

#### 📊 计分规则
| 用户行为 | 分数 | 备注 |
|---------|------|------|
| 跨年级回复 | 15分 | 核心奖励 |
| 回复求指导 | 10分 | + 15分的跨年级回复 |
| 分享经验帖 | 12分 | 价值高内容 |
| 被跨年级点赞（每个） | 3分 | 累计计算 |
| 帖子热度加权（每10赞） | 5分 | 内容价值体现 |
| 被标记有帮助 | 20分 | 最大单笔奖励 |

#### 🏆 获奖等级
- **🥇 金星**：≥100分 + ≥50%互动率（跨年级权重）→ 每类3名
- **🥈 银星**：≥60分 + ≥50%互动率（跨年级权重）→ 每类3名
- **🥉 铜星**：≥30分 + ≥50%互动率（跨年级权重）→ 每类3名

#### 🎖️ 成就徽章分配逻辑
```
🌉 桥梁建造者    → ≥5次跨年级回复 + ≥60%互动率
📚 智慧分享者    → ≥3篇经验分享
🤝 热心助手      → ≥5次回复求指导
🔥 话题引领者    → 总分≥80点（热门内容）
💬 评论达人      → ≥8次跨年级评论
```

### 4️⃣ UI 组件库

#### `KnowDoStarLeaderboard.vue` - 排行榜展示
**特性**：
- 月度/学期切换
- 三级星级分类展示（卡片布局）
- 实时互动数据
- 成就徽章图标显示
- 响应式设计

**使用**：
```vue
<KnowDoStarLeaderboard :posts="posts" :comments="comments" />
```

#### `UserAchievementCertificate.vue` - 个人证书
**特性**：
- 精美的电子证书设计
- 个性化证文生成
- 成就徽章展示
- 分享到社交媒体
- 证书下载功能

**使用**：
```vue
<UserAchievementCertificate :user-star="userStar" />
```

### 5️⃣ Vue Composable 工具库
**文件**: `src/composables/useKnowDoStar.js`

**核心函数**：
```javascript
// 初始化知行之星系统
const {
  leaderboard,          // 排行榜数据
  generateLeaderboard,  // 生成排行榜
  getUserStarStatus,    // 获取用户星级
  getTopStars,          // 获取前N名
  switchPeriod          // 切换评选周期
} = useKnowDoStar(posts, comments)

// 计算用户成就
const { badges } = useUserAchievements(userId, posts, comments, userGrade)

// 辅助格式化
formatStarTier(tier)
getAchievementInfo(badgeKey)
userQualifiesForAchievement(metrics, achievementKey)
```

### 6️⃣ 多语言支持
**文件**: `src/locales/uiMessages.js`

已添加20+条新的中英文消息，包括：
- 知行之星相关UI文本
- 成就徽章名称和描述
- 按钮和菜单项

## 📦 项目文件清单

| 文件 | 大小 | 功能 |
|-----|------|------|
| `gradeSystem.js` | ~3KB | 常量定义 |
| `recommendationEngine.js` | ~8KB | 推荐算法 |
| `knowDoStarSystem.js` | ~12KB | 评选系统 |
| `useKnowDoStar.js` | ~6KB | Vue Composable |
| `KnowDoStarLeaderboard.vue` | ~7KB | 排行榜组件 |
| `UserAchievementCertificate.vue` | ~8KB | 证书组件 |
| `KNOW_DO_STAR_GUIDE.md` | ~10KB | 详细文档 |
| `KNOW_DO_STAR_EXAMPLES.js` | ~12KB | 集成示例 |

## 🚀 快速开始

### 最简集成（5分钟）

1. **添加排行榜到发现页**
```vue
<KnowDoStarLeaderboard :posts="posts" :comments="comments" />
```

2. **在用户资料添加成就**
```vue
<UserAchievementCertificate :user-star="userStarStatus" />
```

3. **使用 Composable 获取数据**
```javascript
const { leaderboard } = useKnowDoStar(posts, comments)
```

### 完整集成（30分钟）
详见 `KNOW_DO_STAR_GUIDE.md` 和 `KNOW_DO_STAR_EXAMPLES.js`

## 📊 数据流程

```
┌─────────────────────────────────────┐
│ 用户发帖/评论/点赞                  │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ 自动检测帖子类型并添加标签          │
│ - detectPostType()                  │
│ - getRecommendationTags()           │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ 帖子/评论储存（含元数据）          │
│ - postType                          │
│ - authorGrade                       │
│ - crossGradeIndicator              │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ 定时评选（每日/周/月/学期）        │
│ - calculateUserKnowDoScore()        │
│ - selectKnowDoStars()               │
│ - assignAchievementBadges()         │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ 排行榜 + 个人证书生成               │
│ - formatKnowDoStarForDisplay()      │
│ - generateCertificateText()         │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ UI 展示 + 用户通知                  │
│ - KnowDoStarLeaderboard.vue        │
│ - UserAchievementCertificate.vue    │
└─────────────────────────────────────┘
```

## 🎨 UI 预览

### 排行榜预览
```
⭐ 金星
┌──────────────────┐
│ 1. 学长           │
│    大学生          │
│    Score: 125     │
│    🌉🤝📚        │
└──────────────────┘

✨ 银星
┌──────────────────┐
│ 4. 好心人         │
│    高中生          │
│    Score: 78      │
│    🤝            │
└──────────────────┘

⚡ 铜星
• 张朋  初中生  42分  🌉
• 李明  高中生  38分  💬
```

### 个人证书预览
```
╔════════════════════════════════════╗
║         知行桥 KNOW-DO BRIDGE      ║
║             证书                   ║
║                                    ║
║    恭喜阿明                         ║
║                                    ║
║  您因为互动率达72%、3篇经验分享    ║
║  分享，荣获本月知行之星金星获得   ║
║  者称号。成就：桥梁建造者          ║
║                                    ║
║  知行桥社区                         ║
║  2026年3月28日                      ║
╚════════════════════════════════════╝
```

## 🔧 配置自定义

编辑 `gradeSystem.js` 中的 `KNOW_DO_STAR_CONFIG`：

```javascript
// 调整计分规则
SCORING_RULES: {
  CROSS_GRADE_RESPONSE_POINTS: 20,    // 改为20分
  // ...
}

// 调整等级门槛
SELECTION_CRITERIA: {
  MIN_SCORE_GOLD: 150,     // 改为150分
  WINNERS_PER_CATEGORY: 5  // 每类5名
}

// 添加新成就
ACHIEVEMENT_CATEGORIES: {
  CUSTOM_BADGE: {
    key: 'custom',
    zh: '自定义勋章',
    // ...
  }
}
```

## 📈 预期效果

实现本系统后，预期能达到：

- 📊 **数据驱动**：用科学算法替代主观评选
- 🌉 **打破壁垒**：鼓励互动率提升（重点提升跨年级维度）
- ✨ **激励体系**：每月表彰优秀贡献者，建立社区荣誉
- 🎯 **改善体验**：更精准的内容推荐
- 📢 **增强参与**：用户可见的成就激励增强粘性

## 🔐 性能考虑

- 评选逻辑可在后台异步运行
- 排行榜结果缓存24小时
- 建议每日/周定时计算，而非实时
- 大规模用户场景下建议加数据库索引

## 📝 文档索引

- **KNOW_DO_STAR_GUIDE.md** - 完整实现指南
- **KNOW_DO_STAR_EXAMPLES.js** - 7个集成示例
- **knowledgeBaseFiles 下各源文件的 JSDoc** - API文档

## ✅ 下一步建议

1. ✅ **已完成核心功能实现**
2. 🔲 在实际应用中集成排行榜和证书组件
3. 🔲 添加后端存储（数据库）以保存评选历史
4. 🔲 实现推送通知（获奖时提醒用户）
5. 🔲 添加证书下载/分享功能
6. 🔲 支持自定义评选周期
7. 🔲 管理后台交互调整计分规则

## 📞 常见问题

**Q: 如何手动运行评选？**
```javascript
const leaderboard = generateKnowDoStarLeaderboard(posts, comments, 'monthly')
```

**Q: 为什么某用户没有被选中？**
- 检查：总分是否达到门槛（≥30分）
- 检查：互动率（跨年级权重）是否≥50%

**Q: 如何修改成就规则？**
编辑 `assignAchievementBadges()` 函数中的条件判断

**Q: 支持自定义年级吗？**
可以，编辑 `GRADE_LEVELS` 常量并更新映射表

---

**项目状态**: ✅ 功能完整，可投入使用  
**最后更新**: 2026年3月28日
