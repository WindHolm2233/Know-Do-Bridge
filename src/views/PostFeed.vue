<template>
  <section class="post-feed" @click="closeProfileCard">
    <div v-if="loading" class="feed-empty">
      {{ uiStore.t('loadingPosts') }}
    </div>

    <div v-else-if="!posts.length" class="feed-empty">
      {{ uiStore.t('noPosts') }}
    </div>

    <article v-for="post in posts" :key="post.id" class="post-card">
      <div class="post-card__row">
        <div class="post-card__avatar-wrap">
          <button
            class="post-card__avatar"
            type="button"
            @click.stop="toggleProfileCard(getPostProfile(post))"
          >
            {{ post.author.slice(0, 1) }}
          </button>

          <div
            v-if="activeProfileKey === getPostProfile(post).key"
            class="mini-profile-card"
            @click.stop
          >
            <div class="mini-profile-card__head">
              <div class="mini-profile-card__avatar">{{ getPostProfile(post).avatar }}</div>
              <div>
                <strong>{{ getPostProfile(post).name }}</strong>
                <small>{{ getPostProfile(post).role }}</small>
              </div>
            </div>

            <p class="mini-profile-card__text">
              {{ uiStore.t('miniProfileText') }}
            </p>

            <button
              v-if="canMessageUser(getPostProfile(post))"
              class="mini-profile-card__btn"
              type="button"
              @click="startChat(getPostProfile(post))"
            >
              {{ uiStore.t('miniProfileButton') }}
            </button>
            <button
              class="mini-profile-card__btn mini-profile-card__btn--ghost"
              type="button"
              @click="viewProfile(getPostProfile(post))"
            >
              {{ uiStore.t('miniProfileViewButton') }}
            </button>
          </div>
        </div>

        <div class="post-card__main">
          <div class="post-card__top">
            <div class="post-card__identity">
              <h4>{{ post.author }}</h4>
              <span>{{ post.role }}</span>
              <span class="dot">-</span>
              <span>{{ formatTime(post.createdAt) }}</span>
            </div>
            <div class="post-card__meta-actions">
              <span class="post-tag">{{ post.topic }}</span>
              <button
                v-if="canDeletePost(post)"
                class="post-card__delete"
                type="button"
                :disabled="deletingPostId === post.id"
                @click="handleDeletePost(post)"
              >
                {{ deletingPostId === post.id ? uiStore.t('deleting') : uiStore.t('deletePost') }}
              </button>
            </div>
          </div>

          <p class="post-card__content">{{ post.content }}</p>

          <div class="post-card__footer">
            <button
              :class="['action-btn', { 'action-btn--active': post.liked }]"
              @click="$emit('toggle-like', post.id)"
            >
              <span>{{ uiStore.t('postLikeLabel') }}</span>
              <small>{{ post.likes }}</small>
            </button>
            <div class="action-meta">
              <span>{{ uiStore.t('postCommentsLabel') }}</span>
              <small>{{ post.commentsCount }}</small>
            </div>
          </div>

          <div class="comments-panel">
            <div v-if="post.comments.length" class="comment-list">
              <div v-for="comment in post.comments" :key="comment.id" class="comment-item">
                <div class="comment-item__avatar-wrap">
                  <button
                    class="comment-item__avatar"
                    type="button"
                    @click.stop="toggleProfileCard(getCommentProfile(comment))"
                  >
                    {{ comment.author.slice(0, 1) }}
                  </button>

                  <div
                    v-if="activeProfileKey === getCommentProfile(comment).key"
                    class="mini-profile-card mini-profile-card--comment"
                    @click.stop
                  >
                    <div class="mini-profile-card__head">
                      <div class="mini-profile-card__avatar">{{ getCommentProfile(comment).avatar }}</div>
                      <div>
                        <strong>{{ getCommentProfile(comment).name }}</strong>
                        <small>{{ getCommentProfile(comment).role }}</small>
                      </div>
                    </div>

                    <p class="mini-profile-card__text">
                      {{ uiStore.t('miniProfileText') }}
                    </p>

                    <button
                      v-if="canMessageUser(getCommentProfile(comment))"
                      class="mini-profile-card__btn"
                      type="button"
                      @click="startChat(getCommentProfile(comment))"
                    >
                      {{ uiStore.t('miniProfileButton') }}
                    </button>
                    <button
                      class="mini-profile-card__btn mini-profile-card__btn--ghost"
                      type="button"
                      @click="viewProfile(getCommentProfile(comment))"
                    >
                      {{ uiStore.t('miniProfileViewButton') }}
                    </button>
                  </div>
                </div>
                <div class="comment-item__body">
                  <p>
                    <strong>{{ comment.author }}</strong>
                    <span>{{ comment.role }} - {{ formatTime(comment.createdAt) }}</span>
                  </p>
                  <div>{{ comment.content }}</div>
                </div>
              </div>
            </div>

            <div class="comment-form">
              <input
                v-model="commentDrafts[post.id]"
                type="text"
                :disabled="!currentUser || commenting"
                :placeholder="uiStore.t('replyPlaceholder')"
                @keyup.enter="submitComment(post.id)"
              />
              <button
                :disabled="!currentUser || commenting || !commentDrafts[post.id]?.trim()"
                @click="submitComment(post.id)"
              >
                {{ commenting ? uiStore.t('sending') : uiStore.t('reply') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'

const props = defineProps({
  posts: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  commenting: {
    type: Boolean,
    default: false
  },
  deletingPostId: {
    type: String,
    default: ''
  },
  currentUser: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['toggle-like', 'add-comment', 'delete-post'])
const commentDrafts = reactive({})
const activeProfileKey = ref('')
const uiStore = useUiStore()
const router = useRouter()

const submitComment = (postId) => {
  const content = commentDrafts[postId]?.trim()

  if (!content || !props.currentUser) {
    return
  }

  emit('add-comment', postId, {
    authorId: props.currentUser.id,
    author: props.currentUser.name,
    role: props.currentUser.role,
    content
  })

  commentDrafts[postId] = ''
}

const buildProfileCard = ({ id, name, role, avatar, key }) => ({
  id,
  name,
  role,
  avatar: avatar || (name || 'U').slice(0, 1).toUpperCase(),
  key
})

const getPostProfile = (post) =>
  buildProfileCard({
    id: post.authorId,
    name: post.author,
    role: post.role,
    avatar: (post.author || 'U').slice(0, 1).toUpperCase(),
    key: `post:${post.id}`
  })

const getCommentProfile = (comment) =>
  buildProfileCard({
    id: comment.authorId,
    name: comment.author,
    role: comment.role,
    avatar: (comment.author || 'U').slice(0, 1).toUpperCase(),
    key: `comment:${comment.id}`
  })

const canMessageUser = (profile) => Boolean(profile.id && profile.id !== props.currentUser?.id)
const canDeletePost = (post) => Boolean(props.currentUser?.id && post.authorId === props.currentUser.id)

const toggleProfileCard = (profile) => {
  activeProfileKey.value = activeProfileKey.value === profile.key ? '' : profile.key
}

const closeProfileCard = () => {
  activeProfileKey.value = ''
}

const startChat = (profile) => {
  if (!canMessageUser(profile)) {
    return
  }

  router.push({
    path: '/messages',
    query: {
      userId: profile.id,
      name: profile.name,
      role: profile.role,
      avatar: profile.avatar
    }
  })
}

const viewProfile = (profile) => {
  router.push({
    path: profile.id ? `/profile/${profile.id}` : '/profile',
    query: {
      name: profile.name,
      role: profile.role,
      avatar: profile.avatar
    }
  })
}

const handleDeletePost = (post) => {
  if (!canDeletePost(post)) {
    return
  }

  if (typeof window !== 'undefined') {
    const confirmed = window.confirm(uiStore.t('deletePostConfirm'))

    if (!confirmed) {
      return
    }
  }

  emit('delete-post', post.id)
}

const formatTime = (value) => {
  const time = new Date(value)
  const delta = Date.now() - time.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (delta < minute) {
    return uiStore.t('now')
  }

  if (delta < hour) {
    return `${Math.floor(delta / minute)}m`
  }

  if (delta < day) {
    return `${Math.floor(delta / hour)}h`
  }

  return time.toLocaleDateString(uiStore.locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.feed-empty {
  padding: 1.4rem 1rem;
  border-bottom: 1px solid var(--app-border);
  color: var(--app-text-soft);
  text-align: center;
}

.post-card {
  padding: 1rem 1.1rem 0.9rem;
  border-bottom: 1px solid var(--app-border);
}

.post-card__row {
  display: flex;
  gap: 0.9rem;
}

.post-card__avatar-wrap {
  position: relative;
}

.post-card__avatar,
.comment-item__avatar,
.mini-profile-card__avatar {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #8ba6ff, #6bc9ff);
  color: white;
  font-weight: 700;
}

.post-card__avatar {
  cursor: pointer;
}

.comment-item__avatar {
  width: 2rem;
  height: 2rem;
}

.mini-profile-card {
  position: absolute;
  top: 3rem;
  left: 0;
  z-index: 4;
  width: 15rem;
  padding: 0.9rem;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: white;
  box-shadow: 0 20px 40px rgba(79, 105, 158, 0.18);
}

.mini-profile-card__head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mini-profile-card__head strong,
.mini-profile-card__text,
.post-card__content,
.comment-item__body div {
  color: var(--app-heading);
}

.mini-profile-card__head small,
.comment-item__body p,
.post-card__identity span {
  color: var(--app-text-soft);
}

.mini-profile-card__text {
  margin-top: 0.75rem;
  line-height: 1.5;
}

.mini-profile-card__btn {
  width: 100%;
  margin-top: 0.85rem;
  padding: 0.72rem 0.9rem;
  border: none;
  border-radius: 999px;
  background: var(--app-accent);
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.mini-profile-card__btn--ghost {
  margin-top: 0.55rem;
  border: 1px solid var(--app-border);
  background: white;
  color: var(--app-heading);
}

.post-card__main {
  flex: 1;
  min-width: 0;
}

.post-card__top {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 0.7rem;
}

.post-card__meta-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.55rem;
}

.post-card__identity {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.post-card__identity h4 {
  color: var(--app-heading);
  font-size: 0.98rem;
  font-weight: 700;
}

.post-tag {
  color: var(--app-accent);
  font-size: 0.88rem;
}

.post-card__delete {
  padding: 0.42rem 0.72rem;
  border: 1px solid rgba(216, 91, 115, 0.18);
  border-radius: 999px;
  background: rgba(216, 91, 115, 0.08);
  color: #c04d66;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.post-card__delete:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.post-card__content {
  margin-top: 0.2rem;
  line-height: 1.65;
  white-space: pre-wrap;
}

.post-card__footer {
  display: flex;
  align-items: center;
  gap: 1.4rem;
  margin-top: 0.7rem;
}

.action-btn,
.action-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  border: none;
  background: transparent;
  color: var(--app-text-soft);
}

.action-btn {
  cursor: pointer;
}

.action-btn--active {
  color: #d85b73;
}

.comments-panel {
  margin-top: 0.8rem;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
}

.comment-item {
  display: flex;
  gap: 0.65rem;
}

.comment-item__avatar-wrap {
  position: relative;
}

.comment-item__avatar {
  cursor: pointer;
}

.comment-item__body p strong {
  color: var(--app-heading);
  margin-right: 0.35rem;
}

.mini-profile-card--comment {
  top: 2.6rem;
}

.comment-form {
  display: flex;
  gap: 0.6rem;
}

.comment-form input {
  flex: 1;
  min-width: 0;
  padding: 0.72rem 0.9rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.74);
  color: var(--app-heading);
  outline: none;
}

.comment-form button {
  padding: 0.7rem 1rem;
  border: none;
  border-radius: 999px;
  background: var(--app-accent);
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.comment-form button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 680px) {
  .post-card {
    padding: 0.9rem 0.85rem 0.85rem;
  }

  .post-card__row {
    gap: 0.7rem;
  }

  .post-card__top,
  .comment-form {
    flex-direction: column;
    align-items: stretch;
  }

  .post-card__meta-actions {
    justify-content: flex-start;
  }

  .post-card__footer {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .comment-item__body p span {
    display: block;
  }

  .mini-profile-card {
    left: -0.2rem;
    width: min(15rem, calc(100vw - 4rem));
  }
}
</style>
