import {
  canUseSupabase,
  ensureSupabaseClient,
  getSupabaseClient,
  getSupabaseConfig
} from '@/services/supabaseBridge'
import { createAppError } from '@/utils/appError'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`

const normalizeComment = (record) => ({
  id: record.id || createId(),
  postId: record.postId || record.post_id || '',
  authorId: record.authorId || record.author_id || '',
  author: record.author || record.author_name || '匿名用户',
  role: record.role || record.author_role || '大学生',
  content: record.content || '',
  createdAt: record.createdAt || record.created_at || new Date().toISOString()
})

const normalizePost = (record) => {
  const comments = Array.isArray(record.comments)
    ? record.comments.map(normalizeComment)
    : []

  return {
    id: record.id || createId(),
    authorId: record.authorId || record.author_id || '',
    author: record.author || record.author_name || '匿名用户',
    role: record.role || record.author_role || '大学生',
    topic: record.topic || '成长交流',
    content: record.content || '',
    likes: Number(record.likes ?? record.likes_count ?? 0),
    commentsCount: Number(record.commentsCount ?? record.comment_count ?? comments.length ?? 0),
    comments,
    liked: Boolean(record.liked),
    createdAt: record.createdAt || record.created_at || new Date().toISOString()
  }
}

const clonePosts = (posts) =>
  posts.map((post) => ({
    ...post,
    comments: post.comments.map((comment) => ({ ...comment }))
  }))

let localPosts = [
  normalizePost({
    id: 'demo-1',
    author_id: 'local-graduate-1',
    author: '周学长',
    role: '已升学',
    topic: '经验分享',
    content:
      '最近不少同学在问：高中和大学阶段该怎样更高效地安排目标与节奏？欢迎大家分享自己试过有效的方法，也可以讲讲踩过的坑。',
    likes: 18,
    liked: false,
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    comments: [
      {
        id: 'comment-1',
        post_id: 'demo-1',
        author_id: 'local-high-1',
        author_name: '小林',
        author_role: '高中生',
        content: '如果现在方向还不明确，应该先把成绩稳住，还是先多了解不同选择？',
        created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString()
      }
    ]
  }),
  normalizePost({
    id: 'demo-2',
    author_id: 'local-college-1',
    author: '阿宁',
    role: '大学生',
    topic: '成长规划',
    content:
      '从中学到大学，大家会遇到完全不同的压力和选择。我想做一个帖子，收集大家在不同阶段最常见的困惑，互相给彼此一点参考。',
    likes: 9,
    liked: true,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    comments: [
      {
        id: 'comment-2',
        post_id: 'demo-2',
        author_id: 'local-middle-1',
        author_name: '小周',
        author_role: '初中生',
        content: '我现在最大的困惑是学习节奏总会被周围人影响，想知道大家是怎么调整心态的。',
        created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString()
      }
    ]
  })
]

localPosts = localPosts.map((post) => ({
  ...post,
  commentsCount: post.comments.length
}))

const localListeners = new Set()

const notifyLocalSubscribers = () => {
  const snapshot = clonePosts(localPosts)
  localListeners.forEach((listener) => listener(snapshot))
}

const getSupabaseAuthUser = async () => {
  const client = await ensureSupabaseClient()
  const {
    data: { user },
    error
  } = await client.auth.getUser()

  if (error) {
    throw createAppError('socialReadCurrentUser', error.message)
  }

  return user
}

const getSupabaseProfile = async (userId) => {
  const client = await ensureSupabaseClient()
  const config = getSupabaseConfig()
  const { data, error } = await client
    .from(config.profilesTable)
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw createAppError('socialLoadCurrentProfile', error.message)
  }

  return data
}

const resolveAuthorName = (user, profile, fallback = '') =>
  profile?.full_name ||
  fallback ||
  user?.user_metadata?.full_name ||
  user?.email?.split('@')?.[0] ||
  'User'

const resolveAuthorRole = (user, profile, fallback = '') =>
  profile?.headline || fallback || user?.user_metadata?.headline || ''

const loadProfileSafely = async (userId) => {
  try {
    return await getSupabaseProfile(userId)
  } catch {
    return null
  }
}

const isMissingColumnError = (error) =>
  error?.code === '42703' || /column .* does not exist/i.test(String(error?.message || ''))

const fetchSupabaseCommentsByPost = async (postIds) => {
  if (!postIds.length) {
    return new Map()
  }

  const client = await ensureSupabaseClient()
  const config = getSupabaseConfig()
  const { data, error } = await client
    .from(config.commentsTable)
    .select('*')
    .in('post_id', postIds)
    .order('created_at', { ascending: true })

  if (error) {
    throw createAppError('socialLoadComments', error.message)
  }

  const commentsMap = new Map()
  data.map(normalizeComment).forEach((comment) => {
    const list = commentsMap.get(comment.postId) || []
    list.push(comment)
    commentsMap.set(comment.postId, list)
  })

  return commentsMap
}

const fetchSupabaseLikesByPost = async (postIds) => {
  if (!postIds.length) {
    return []
  }

  const client = await ensureSupabaseClient()
  const config = getSupabaseConfig()
  const { data, error } = await client
    .from('post_likes')
    .select('post_id,user_id')
    .in('post_id', postIds)

  if (error) {
    throw createAppError('socialLoadLikes', error.message)
  }

  return data
}

const fetchSupabasePosts = async () => {
  const client = await ensureSupabaseClient()
  const config = getSupabaseConfig()
  const currentUser = await getSupabaseAuthUser().catch(() => null)
  const { data, error } = await client
    .from(config.postsTable)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw createAppError('socialQueryPosts', error.message)
  }

  const postIds = data.map((item) => item.id)
  const [commentsMap, likes] = await Promise.all([
    fetchSupabaseCommentsByPost(postIds),
    fetchSupabaseLikesByPost(postIds)
  ])

  const likedPostIds = new Set(
    likes.filter((like) => like.user_id === currentUser?.id).map((like) => like.post_id)
  )

  return data.map((item) =>
    normalizePost({
      ...item,
      comments: commentsMap.get(item.id) || [],
      liked: likedPostIds.has(item.id)
    })
  )
}

export const getDataMode = () => (canUseSupabase() ? 'supabase' : 'mock')

export const fetchPosts = async () => {
  if (canUseSupabase()) {
    return fetchSupabasePosts()
  }

  await wait(150)
  return clonePosts(localPosts)
}

export const createPost = async (payload) => {
  if (canUseSupabase()) {
    const client = await ensureSupabaseClient()
    const config = getSupabaseConfig()
    const user = await getSupabaseAuthUser()

    if (!user) {
      throw createAppError('socialRequireSignInPost')
    }

    const profile = await loadProfileSafely(user.id)
    const basePayload = {
      author_id: user.id,
      topic: payload.topic,
      content: payload.content
    }
    let insertPayload = {
      ...basePayload,
      author_name: resolveAuthorName(user, profile, payload.author),
      author_role: resolveAuthorRole(user, profile, payload.role)
    }

    let { data, error } = await client.from(config.postsTable).insert(insertPayload).select().single()

    if (error && isMissingColumnError(error)) {
      insertPayload = {
        ...basePayload,
        author: resolveAuthorName(user, profile, payload.author),
        role: resolveAuthorRole(user, profile, payload.role)
      }
      ;({ data, error } = await client.from(config.postsTable).insert(insertPayload).select().single())
    }

    if (error) {
      throw createAppError('socialCreatePost', error.message)
    }

    return normalizePost({
      ...data,
      comments: [],
      liked: false
    })
  }

  await wait(100)

  const newPost = normalizePost({
    ...payload,
    id: createId(),
    likes: 0,
    commentsCount: 0,
    comments: [],
    liked: false,
    createdAt: new Date().toISOString()
  })

  localPosts = [newPost, ...localPosts]
  notifyLocalSubscribers()
  return normalizePost(newPost)
}

export const togglePostLike = async (postId, nextLiked) => {
  if (canUseSupabase()) {
    const client = await ensureSupabaseClient()
    const user = await getSupabaseAuthUser()

    if (!user) {
      throw createAppError('socialRequireSignInLike')
    }

    if (nextLiked) {
      const { error } = await client.from('post_likes').insert({
        post_id: postId,
        user_id: user.id
      })

      if (error && !error.message.toLowerCase().includes('duplicate')) {
        throw createAppError('socialLikePost', error.message)
      }
    } else {
      const { error } = await client
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      if (error) {
        throw createAppError('socialUnlikePost', error.message)
      }
    }

    return
  }

  await wait(80)

  localPosts = localPosts.map((post) =>
    post.id === postId
      ? {
          ...post,
          liked: nextLiked,
          likes: Math.max(0, post.likes + (nextLiked ? 1 : -1))
        }
      : post
  )

  notifyLocalSubscribers()
}

export const addComment = async (postId, payload) => {
  if (canUseSupabase()) {
    const client = await ensureSupabaseClient()
    const config = getSupabaseConfig()
    const user = await getSupabaseAuthUser()

    if (!user) {
      throw createAppError('socialRequireSignInComment')
    }

    const profile = await loadProfileSafely(user.id)
    const basePayload = {
      post_id: postId,
      author_id: user.id,
      content: payload.content
    }
    let insertPayload = {
      ...basePayload,
      author_name: resolveAuthorName(user, profile, payload.author),
      author_role: resolveAuthorRole(user, profile, payload.role)
    }

    let { data, error } = await client.from(config.commentsTable).insert(insertPayload).select().single()

    if (error && isMissingColumnError(error)) {
      insertPayload = {
        ...basePayload,
        author: resolveAuthorName(user, profile, payload.author),
        role: resolveAuthorRole(user, profile, payload.role)
      }
      ;({ data, error } = await client.from(config.commentsTable).insert(insertPayload).select().single())
    }

    if (error) {
      throw createAppError('socialCreateComment', error.message)
    }

    return normalizeComment(data)
  }

  await wait(80)

  const comment = normalizeComment({
    id: createId(),
    postId,
    authorId: payload.authorId,
    author: payload.author,
    role: payload.role,
    content: payload.content,
    createdAt: new Date().toISOString()
  })

  localPosts = localPosts.map((post) =>
    post.id === postId
      ? {
          ...post,
          comments: [...post.comments, comment],
          commentsCount: post.commentsCount + 1
        }
      : post
  )

  notifyLocalSubscribers()
  return comment
}

export const deletePost = async (postId, actorId = '') => {
  if (canUseSupabase()) {
    const client = await ensureSupabaseClient()
    const config = getSupabaseConfig()
    const user = await getSupabaseAuthUser()

    if (!user) {
      throw createAppError('socialRequireSignInDelete')
    }

    const { data, error: postError } = await client
      .from(config.postsTable)
      .delete()
      .eq('id', postId)
      .eq('author_id', user.id)
      .select('id')
      .maybeSingle()

    if (postError) {
      throw createAppError('socialDeletePost', postError.message)
    }

    if (!data) {
      throw createAppError('socialDeletePostForbidden')
    }

    return
  }

  await wait(80)

  const matchedPost = localPosts.find((post) => post.id === postId)

  if (!matchedPost) {
    throw createAppError('socialDeletePost')
  }

  if (!actorId) {
    throw createAppError('socialRequireSignInDelete')
  }

  if (matchedPost.authorId !== actorId) {
    throw createAppError('socialDeletePostForbidden')
  }

  localPosts = localPosts.filter((post) => post.id !== postId)
  notifyLocalSubscribers()
}

export const subscribeToPosts = (callback) => {
  const client = getSupabaseClient()

  if (canUseSupabase() && client) {
    const config = getSupabaseConfig()
    let refreshPromise = null
    let shouldRefreshAgain = false

    const refreshPosts = async () => {
      if (refreshPromise) {
        shouldRefreshAgain = true
        return refreshPromise
      }

      refreshPromise = (async () => {
        do {
          shouldRefreshAgain = false
          callback(await fetchSupabasePosts())
        } while (shouldRefreshAgain)
      })().finally(() => {
        refreshPromise = null
      })

      return refreshPromise
    }

    const channel = client
      .channel(config.realtimeChannel)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: config.postsTable },
        refreshPosts
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: config.commentsTable },
        refreshPosts
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_likes' },
        refreshPosts
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }

  localListeners.add(callback)
  callback(clonePosts(localPosts))

  return () => {
    localListeners.delete(callback)
  }
}
