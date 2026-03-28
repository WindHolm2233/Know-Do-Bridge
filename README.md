# 知行桥 (Know-Do Bridge)

连接学生想法与行动的成长交流平台 | A growth exchange platform connecting students' ideas and actions.

当前项目使用 `Vue 3 + Vite + Pinia + Vue Router` 构建，支持本地 mock 数据运行，也支持接入 `Supabase` 进行账号认证、数据持久化和实时同步。

## 项目定位

"知行桥"连接学生的想法与行动，是一个让学生彼此交流、分享经验、提出问题、获得建议的成长交流平台。

用户可以在平台中：

- 发布成长相关动态
- 点赞和评论他人的内容
- 查看提醒与互动通知
- 进入私聊继续深入交流
- 查看个人主页与公开内容

## 当前功能

- 账号注册、登录、退出
- 中英文界面切换
- 发帖、点赞、评论
- 私聊会话、未读状态、搜索、草稿记忆
- 通知提醒页
- 个人主页
- 删帖功能
- 本地 mock 模式
- Supabase 实时数据模式

## 技术栈

- `Vue 3`
- `Vite`
- `Pinia`
- `Vue Router`
- `@supabase/supabase-js`
- `ESLint`
- `Prettier`

## 本地运行

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

生产构建：

```bash
npm run build
```

本地预览构建结果：

```bash
npm run preview
```

## 环境要求

- `Node.js 20.19+` 或 `22.12+`
- `npm`

## 环境变量

项目根目录提供了 `.env.example`，如需启用 Supabase，请复制为 `.env` 并填写：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_POSTS_TABLE=posts
VITE_SUPABASE_COMMENTS_TABLE=comments
VITE_SUPABASE_PROFILES_TABLE=profiles
VITE_SUPABASE_DIRECT_MESSAGES_TABLE=direct_messages
VITE_SUPABASE_DIRECT_MESSAGE_READS_TABLE=direct_message_reads
VITE_SUPABASE_CHANNEL=realtime:campus-connect
VITE_SUPABASE_DM_CHANNEL=realtime:campus-direct-messages
```

未配置 Supabase 时，项目默认使用本地 mock 数据运行。

## 目录说明

## 算法文档

- 核心算法说明：`READ.md`
- 覆盖推荐算法、知行之星评选算法、私聊已读同步算法

### 核心页面

- `src/views/HomeView.vue`：首页内容流
- `src/views/ExploreView.vue`：发现页
- `src/views/NotificationsView.vue`：通知页
- `src/views/MessagesView.vue`：私聊页
- `src/views/ProfileView.vue`：个人主页

### 关键组件

- `src/views/PostBox.vue`：发帖框
- `src/views/PostFeed.vue`：帖子列表
- `src/views/AuthPanel.vue`：登录注册面板
- `src/views/AppShellLayout.vue`：整体布局
- `src/views/BottomNav.vue`：底部导航

### 状态管理

- `src/stores/auth.js`：账号状态
- `src/stores/social.js`：帖子、评论、点赞、删帖
- `src/stores/messages.js`：私聊线程、消息、未读状态
- `src/stores/ui.js`：语言与界面文案

### 服务层

- `src/services/authApi.js`：认证相关接口
- `src/services/socialApi.js`：帖子、评论、点赞、删帖接口
- `src/services/messageApi.js`：私聊接口
- `src/services/supabaseBridge.js`：Supabase client 注册与读取

## 数据模式说明

### Mock 模式

- 不依赖后端即可运行
- 适合本地开发和界面演示
- 支持帖子、评论、点赞、删帖、私聊等基础交互

### Supabase 模式

- 支持真实账号登录
- 支持帖子和评论持久化
- 支持私聊数据持久化
- 支持实时同步能力

## 部署说明

项目当前基于 Vite 配置了域名相关设置：

- `https://campuslink.dpdns.org`

`vite.config.js` 中已经配置了开发和预览所需的 `origin` / `allowedHosts`。

如果你要正式部署，常见方式包括：

- Vercel
- Netlify
- 自建 Nginx 反向代理
- 其他支持静态站点托管的平台

## 品牌信息

- 网站标签名：`途择`
- favicon：`public/favicon.svg`

## 常用文件

- `index.html`：站点标题与 favicon
- `vite.config.js`：Vite 配置、域名配置
- `src/locales/uiMessages.js`：界面文案
- `src/locales/errorMessages.js`：错误提示
- `src/constants/userRoles.js`：角色阶段定义

## 后续可扩展方向

- 编辑帖子
- 删除评论
- 图片消息或图片帖子
- 更完整的搜索与筛选
- 举报与内容审核
- 管理员后台

## 仓库说明

当前远程仓库：

- `https://github.com/WindHolm2233/CampusLink`

## 低内存部署说明

如果你的服务器只有 1G 内存，正式环境就别直接跑 `vite` 或 `vite preview` 了，不然很容易吃不消。

比较稳一点的流程是：

```bash
npm install
npm run build:low-memory
```

打包完以后，直接把生成出来的 `dist/` 用 Nginx 这种静态服务器托管就行。

- Nginx 示例配置：`deploy/nginx.campuslink.conf`
- 建议站点目录：`/var/www/campuslink/dist`
- 单页应用要记得配回退：`try_files $uri $uri/ /index.html;`

## 版本更新日志

当前仓库还没有打 Git tag，所以下面先按真实提交历史整理成阶段版本，后面继续更新也比较方便。

### 2026-03-25 | 第 6 阶段 | 低内存部署优化

- 这次主要是为了让 1G 服务器也能带得动
- 新增 `build:low-memory` 构建命令，低配机器打包更稳一点
- 生产环境不再带开发调试插件，少占一点资源
- 把页面和依赖拆开加载，首页压力没那么大
- 补了一份 Nginx 静态部署配置，部署时更省事

### 2026-03-25 | 第 5 阶段 | 动态更新修复

- 把帖子和私聊的实时更新问题修了
- 同步状态比之前稳定，不容易乱
- 交互的时候数据对不上的情况少了一些

### 2026-03-25 | 第 4 阶段 | 文档和社区体验更新

- 把文档补得更完整了一点
- 社区内容流和交互体验做了一轮优化
- 项目结构说明和使用方式写得更清楚了

### 2026-03-25 | 第 3 阶段 | 私聊体验升级

- 私聊界面和交互流程顺了一遍
- 会话切换和看消息的时候比原来更顺手
- 桌面端和移动端聊天都补了一些体验细节

### 2026-03-24 | 第 2 阶段 | 本地 Web 应用重构

- 用现在这一版本地 Web 应用结构替掉了前面的早期脚手架
- 确定了当前的 `Vue 3 + Vite + Pinia + Vue Router` 架构
- 页面、状态管理和服务层的组织方式基本成型

### 2026-03-23 | 第 1.1 阶段 | 认证和响应式修复

- 修了验证邮件重发这块的问题
- 移动端响应式布局做得更正常了一点
- 早期认证流程里的小问题顺手稳定了一下

### 2026-03-23 | 第 1.0 阶段 | 初始脚手架

- 项目仓库正式初始化
- 先把第一版前端和 Supabase 项目骨架搭起来
- 给后面继续加功能和改结构打了个底
