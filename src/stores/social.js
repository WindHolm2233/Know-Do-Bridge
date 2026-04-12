import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  addComment,
  createPost,
  deletePost,
  fetchPosts,
  getDataMode,
  subscribeToPosts,
  togglePostLike
} from '@/services/socialApi'
import { translateError } from '@/utils/appError'

const POSTS_CACHE_MS = 30 * 1000
const withErrorDetail = (err, fallbackCode) => {
  const base = translateError(err, fallbackCode)
  const detail = err instanceof Error ? String(err.message || '').trim() : ''

  if (!detail || base.includes(detail)) {
    return base
  }

  return `${base} (${detail})`
}

export const useSocialStore = defineStore('social', () => {
  const posts = ref([])
  const loading = ref(false)
  const publishing = ref(false)
  const commenting = ref(false)
  const deletingPostId = ref('')
  const error = ref('')
  const realtimeStop = ref(null)
  const loadedAt = ref(0)
  let loadPromise = null

  const usingSupabase = computed(() => getDataMode() === 'supabase')
  const isRealtimeActive = computed(() => Boolean(realtimeStop.value))

  const upsertPost = (nextPost) => {
    const existingIndex = posts.value.findIndex((post) => post.id === nextPost.id)
    const nextPosts = [...posts.value]

    if (existingIndex >= 0) {
      nextPosts.splice(existingIndex, 1, nextPost)
    } else {
      nextPosts.unshift(nextPost)
    }

    posts.value = nextPosts.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
  }

  const loadInitialPosts = async ({ force = false } = {}) => {
    if (!force && loadPromise) {
      return loadPromise
    }

    if (!force && loadedAt.value && Date.now() - loadedAt.value < POSTS_CACHE_MS) {
      return posts.value
    }

    loading.value = true
    error.value = ''

    loadPromise = (async () => {
      try {
        posts.value = await fetchPosts()
        loadedAt.value = Date.now()
        return posts.value
    } catch (err) {
      error.value = withErrorDetail(err, 'socialLoadPosts')
      return posts.value
    } finally {
        loading.value = false
        loadPromise = null
      }
    })()

    return loadPromise
  }

  const startRealtime = () => {
    if (isRealtimeActive.value) {
      return
    }

    stopRealtime()
    realtimeStop.value = subscribeToPosts((nextPosts) => {
      posts.value = nextPosts
      loadedAt.value = Date.now()
    })
  }

  const stopRealtime = () => {
    if (typeof realtimeStop.value === 'function') {
      realtimeStop.value()
    }

    realtimeStop.value = null
  }

  const publishPost = async (payload) => {
    publishing.value = true
    error.value = ''

    try {
      const createdPost = await createPost(payload)
      loadedAt.value = Date.now()
      upsertPost(createdPost)
    } catch (err) {
      error.value = withErrorDetail(err, 'socialCreatePost')
    } finally {
      publishing.value = false
    }
  }

  const likePost = async (postId) => {
    const target = posts.value.find((post) => post.id === postId)

    if (!target) {
      return
    }

    error.value = ''
    const previousLiked = target.liked
    const previousLikes = target.likes

    target.liked = !target.liked
    target.likes += target.liked ? 1 : -1

    try {
      await togglePostLike(postId, target.liked)
    } catch (err) {
      target.liked = previousLiked
      target.likes = previousLikes
      error.value = withErrorDetail(err, 'socialUpdateLike')
    }
  }

  const commentOnPost = async (postId, payload) => {
    commenting.value = true
    error.value = ''

    try {
      const comment = await addComment(postId, payload)
      loadedAt.value = Date.now()
      posts.value = posts.value.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [...post.comments, comment],
              commentsCount: post.commentsCount + 1
            }
          : post
      )
    } catch (err) {
      error.value = withErrorDetail(err, 'socialCreateComment')
    } finally {
      commenting.value = false
    }
  }

  const removePost = async (postId, actorId = '') => {
    const target = posts.value.find((post) => post.id === postId)

    if (!target || deletingPostId.value) {
      return
    }

    deletingPostId.value = postId
    error.value = ''

    try {
      await deletePost(postId, actorId)
      loadedAt.value = Date.now()
      posts.value = posts.value.filter((post) => post.id !== postId)
    } catch (err) {
      error.value = withErrorDetail(err, 'socialDeletePost')
    } finally {
      deletingPostId.value = ''
    }
  }

  return {
    commentOnPost,
    commenting,
    deletingPostId,
    error,
    isRealtimeActive,
    likePost,
    loadInitialPosts,
    loading,
    posts,
    publishPost,
    publishing,
    removePost,
    startRealtime,
    stopRealtime,
    usingSupabase
  }
})
