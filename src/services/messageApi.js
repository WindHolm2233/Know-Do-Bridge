import {
  canUseSupabase,
  ensureSupabaseClient,
  getSupabaseClient,
  getSupabaseConfig
} from '@/services/supabaseBridge'
import { createAppError } from '@/utils/appError'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const LOCAL_MESSAGES_STORAGE_KEY = 'campus-link-direct-messages'
const LOCAL_MESSAGE_READS_STORAGE_KEY = 'campus-link-direct-message-reads'
const STORAGE_WRITE_DEBOUNCE_MS = 240
const MAX_LOCAL_MESSAGES = 1200
const MAX_LOCAL_READ_STATES = 1200

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `dm-${Date.now()}-${Math.random().toString(16).slice(2)}`

const normalizeMessage = (record) => ({
  id: record.id || createId(),
  senderId: record.senderId || record.sender_id || '',
  senderName: record.senderName || record.sender_name || '未知用户',
  senderRole: record.senderRole || record.sender_role || '大学生',
  recipientId: record.recipientId || record.recipient_id || '',
  recipientName: record.recipientName || record.recipient_name || '未知用户',
  recipientRole: record.recipientRole || record.recipient_role || '大学生',
  content: record.content || '',
  createdAt: record.createdAt || record.created_at || new Date().toISOString()
})

const normalizeReadState = (record) => ({
  id: record.id || '',
  userId: record.userId || record.user_id || '',
  peerId: record.peerId || record.peer_id || '',
  lastReadAt: record.lastReadAt || record.last_read_at || new Date().toISOString(),
  createdAt: record.createdAt || record.created_at || new Date().toISOString(),
  updatedAt: record.updatedAt || record.updated_at || new Date().toISOString()
})

const cloneMessages = (messages) => messages.map((message) => ({ ...message }))
const sortMessages = (messages) =>
  [...messages].sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
const trimMessages = (messages) =>
  messages.length > MAX_LOCAL_MESSAGES ? messages.slice(messages.length - MAX_LOCAL_MESSAGES) : messages
const mergeMessages = (...collections) => {
  const merged = new Map()

  collections.flat().forEach((message) => {
    const normalized = normalizeMessage(message)
    merged.set(normalized.id, normalized)
  })

  return trimMessages(sortMessages([...merged.values()]))
}

const filterMessagesForUser = (messages, currentUserId) =>
  cloneMessages(
    messages.filter(
      (message) => message.senderId === currentUserId || message.recipientId === currentUserId
    )
  )

const createLocalMessage = (payload) =>
  normalizeMessage({
    ...payload,
    id: createId(),
    created_at: new Date().toISOString()
  })

const mergeReadStates = (...collections) => {
  const merged = new Map()

  collections.flat().forEach((entry) => {
    const normalized = normalizeReadState(entry)

    if (!normalized.userId || !normalized.peerId) {
      return
    }

    const key = `${normalized.userId}:${normalized.peerId}`
    const previous = merged.get(key)

    if (
      !previous ||
      new Date(normalized.lastReadAt).getTime() >= new Date(previous.lastReadAt).getTime()
    ) {
      merged.set(key, normalized)
    }
  })

  return [...merged.values()]
    .sort(
      (left, right) =>
        new Date(right.updatedAt || right.lastReadAt).getTime() -
        new Date(left.updatedAt || left.lastReadAt).getTime()
    )
    .slice(0, MAX_LOCAL_READ_STATES)
}

const filterReadStatesForUser = (entries, currentUserId) =>
  entries.filter((entry) => entry.userId === currentUserId)

export const getCachedDirectMessages = (currentUserId) => {
  if (!currentUserId) {
    return []
  }

  ensureLocalCacheInitialized()
  return filterMessagesForUser(localMessages, currentUserId)
}

const defaultLocalMessages = [
  normalizeMessage({
    id: 'dm-seed-1',
    sender_id: 'local-student-1',
    sender_name: '小林',
    sender_role: '高中生',
    recipient_id: 'local-student-2',
    recipient_name: '周学长',
    recipient_role: '已升学',
    content: '学长你好，我最近有点迷茫，想请教一下高中阶段到底该怎么安排目标比较合适。',
    created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString()
  }),
  normalizeMessage({
    id: 'dm-seed-2',
    sender_id: 'local-student-2',
    sender_name: '周学长',
    sender_role: '已升学',
    recipient_id: 'local-student-1',
    recipient_name: '小林',
    recipient_role: '高中生',
    content: '可以先别急着和别人比进度，先把你的目标拆小，再看看自己最需要补的是方法、节奏还是信息。',
    created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString()
  })
]

const readStoredLocalMessages = () => {
  if (typeof localStorage === 'undefined') {
    return null
  }

  try {
    const saved = localStorage.getItem(LOCAL_MESSAGES_STORAGE_KEY)

    if (!saved) {
      return null
    }

    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? mergeMessages(parsed) : null
  } catch (error) {
    console.warn('Unable to restore local direct messages cache.', error)
    return null
  }
}

let writeLocalMessagesTimer = null
let writeLocalReadStatesTimer = null

const writeStoredLocalMessages = (messages) => {
  if (typeof localStorage === 'undefined') {
    return
  }

  if (writeLocalMessagesTimer) {
    clearTimeout(writeLocalMessagesTimer)
  }

  writeLocalMessagesTimer = setTimeout(() => {
    try {
      localStorage.setItem(LOCAL_MESSAGES_STORAGE_KEY, JSON.stringify(messages))
    } catch (error) {
      console.warn('Unable to persist local direct messages cache.', error)
    } finally {
      writeLocalMessagesTimer = null
    }
  }, STORAGE_WRITE_DEBOUNCE_MS)
}

const readStoredLocalReadStates = () => {
  if (typeof localStorage === 'undefined') {
    return null
  }

  try {
    const saved = localStorage.getItem(LOCAL_MESSAGE_READS_STORAGE_KEY)

    if (!saved) {
      return null
    }

    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? mergeReadStates(parsed) : null
  } catch (error) {
    console.warn('Unable to restore local direct message read-state cache.', error)
    return null
  }
}

const writeStoredLocalReadStates = (entries) => {
  if (typeof localStorage === 'undefined') {
    return
  }

  if (writeLocalReadStatesTimer) {
    clearTimeout(writeLocalReadStatesTimer)
  }

  writeLocalReadStatesTimer = setTimeout(() => {
    try {
      localStorage.setItem(LOCAL_MESSAGE_READS_STORAGE_KEY, JSON.stringify(entries))
    } catch (error) {
      console.warn('Unable to persist local direct message read-state cache.', error)
    } finally {
      writeLocalReadStatesTimer = null
    }
  }, STORAGE_WRITE_DEBOUNCE_MS)
}

let localMessages = []
let localReadStates = []
const localListeners = new Map()
let localStorageListenerInstalled = false
let localCacheInitialized = false

function notifyLocalSubscribers() {
  const snapshot = cloneMessages(localMessages)
  const snapshotsByUser = new Map()

  localListeners.forEach((userId, listener) => {
    if (!snapshotsByUser.has(userId)) {
      snapshotsByUser.set(userId, filterMessagesForUser(snapshot, userId))
    }

    listener(snapshotsByUser.get(userId))
  })
}

const setLocalMessages = (messages) => {
  ensureLocalCacheInitialized()
  localMessages = mergeMessages(messages)
  writeStoredLocalMessages(localMessages)
  notifyLocalSubscribers()
  return localMessages
}

const syncLocalMessages = (messages) => {
  ensureLocalCacheInitialized()
  localMessages = mergeMessages(localMessages, messages)
  writeStoredLocalMessages(localMessages)
  notifyLocalSubscribers()
  return localMessages
}

const syncLocalReadStates = (entries) => {
  ensureLocalCacheInitialized()
  localReadStates = mergeReadStates(localReadStates, entries)
  writeStoredLocalReadStates(localReadStates)
  return localReadStates
}

const ensureLocalStorageListener = () => {
  if (localStorageListenerInstalled || typeof window === 'undefined') {
    return
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== LOCAL_MESSAGES_STORAGE_KEY && event.key !== LOCAL_MESSAGE_READS_STORAGE_KEY) {
      return
    }

    const stored = readStoredLocalMessages()
    const storedReads = readStoredLocalReadStates()

    if (stored) {
      localMessages = mergeMessages(stored)
      notifyLocalSubscribers()
    }

    if (storedReads) {
      localReadStates = mergeReadStates(storedReads)
    }
  })

  localStorageListenerInstalled = true
}

const ensureLocalCacheInitialized = () => {
  if (localCacheInitialized) {
    return
  }

  const storedLocalMessages = readStoredLocalMessages()
  localMessages = storedLocalMessages === null ? mergeMessages(defaultLocalMessages) : storedLocalMessages

  if (storedLocalMessages === null) {
    writeStoredLocalMessages(localMessages)
  }

  const storedLocalReadStates = readStoredLocalReadStates()
  localReadStates = storedLocalReadStates === null ? [] : storedLocalReadStates
  ensureLocalStorageListener()
  localCacheInitialized = true
}

const fetchSupabaseMessages = async (currentUserId) => {
  const client = await ensureSupabaseClient()
  const config = getSupabaseConfig()
  const { data, error } = await client
    .from(config.directMessagesTable)
    .select('*')
    .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
    .order('created_at', { ascending: true })

  if (error) {
    throw createAppError('messagesLoad', error.message)
  }

  const messages = data.map(normalizeMessage)

  if (import.meta.env.DEV) {
    console.debug('[DM Fetch] Messages loaded from Supabase:', {
      userId: currentUserId,
      count: messages.length,
      latest: messages[messages.length - 1]?.createdAt,
      messages: messages.map(m => ({
        id: m.id.slice(0, 8),
        sender: m.senderId,
        recipient: m.recipientId,
        content: m.content.slice(0, 30) + '...'
      }))
    })
  }

  return syncLocalMessages(messages)
}

const fetchSupabaseDirectMessageReads = async (currentUserId) => {
  const client = await ensureSupabaseClient()
  const config = getSupabaseConfig()
  const { data, error } = await client
    .from(config.directMessageReadsTable)
    .select('*')
    .eq('user_id', currentUserId)

  if (error) {
    throw createAppError('messagesLoad', error.message)
  }

  const entries = data.map(normalizeReadState)
  syncLocalReadStates(entries)
  return entries
}

export const fetchDirectMessages = async (currentUserId) => {
  if (!currentUserId) {
    return []
  }

  ensureLocalCacheInitialized()

  if (canUseSupabase()) {
    try {
      return await fetchSupabaseMessages(currentUserId)
    } catch (error) {
      console.warn('Falling back to local direct messages storage.', error)
    }
  }

  await wait(80)
  return filterMessagesForUser(localMessages, currentUserId)
}

export const fetchDirectMessageReads = async (currentUserId) => {
  if (!currentUserId) {
    return []
  }

  ensureLocalCacheInitialized()

  if (canUseSupabase()) {
    try {
      return await fetchSupabaseDirectMessageReads(currentUserId)
    } catch (error) {
      console.warn('Falling back to local direct message read-state storage.', error)
    }
  }

  await wait(40)
  return filterReadStatesForUser(localReadStates, currentUserId)
}

export const sendDirectMessage = async ({ sender, recipient, content }) => {
  if (!sender?.id) {
    throw createAppError('messagesRequireSignIn')
  }

  if (!recipient?.id) {
    throw createAppError('messagesMissingTarget')
  }

  if (!content.trim()) {
    throw createAppError('messagesEmpty')
  }

  const payload = {
    sender_id: sender.id,
    sender_name: sender.name,
    sender_role: sender.role,
    recipient_id: recipient.id,
    recipient_name: recipient.name,
    recipient_role: recipient.role,
    content: content.trim()
  }

  ensureLocalCacheInitialized()

  if (canUseSupabase()) {
    try {
      const client = await ensureSupabaseClient()
      const config = getSupabaseConfig()
      const { data, error } = await client
        .from(config.directMessagesTable)
        .insert(payload)
        .select()
        .single()

      if (error) {
        throw createAppError('messagesSend', error.message)
      }

      const createdMessage = normalizeMessage(data)
      syncLocalMessages([createdMessage])

      if (import.meta.env.DEV) {
        console.debug('[DM Send] Message sent via Supabase:', {
          id: createdMessage.id,
          sender: createdMessage.senderId,
          recipient: createdMessage.recipientId,
          content: createdMessage.content.slice(0, 50) + '...',
          timestamp: createdMessage.createdAt
        })
      }

      return createdMessage
    } catch (error) {
      console.warn('Falling back to local direct messages storage.', error)
    }
  }

  await wait(60)
  const nextMessage = createLocalMessage(payload)
  syncLocalMessages([nextMessage])
  return nextMessage
}

export const upsertDirectMessageRead = async ({ userId, peerId, lastReadAt }) => {
  if (!userId || !peerId) {
    throw createAppError('messagesLoad', 'Missing userId or peerId for read-state sync.')
  }

  const payload = {
    user_id: userId,
    peer_id: peerId,
    last_read_at: lastReadAt || new Date().toISOString()
  }

  ensureLocalCacheInitialized()

  if (canUseSupabase()) {
    try {
      const client = await ensureSupabaseClient()
      const config = getSupabaseConfig()
      const { data, error } = await client
        .from(config.directMessageReadsTable)
        .upsert(payload, { onConflict: 'user_id,peer_id' })
        .select()
        .single()

      if (error) {
        throw createAppError('messagesLoad', error.message)
      }

      const normalized = normalizeReadState(data)
      syncLocalReadStates([normalized])
      return normalized
    } catch (error) {
      console.warn('Falling back to local direct message read-state storage.', error)
    }
  }

  await wait(30)
  const normalized = normalizeReadState(payload)
  syncLocalReadStates([normalized])
  return normalized
}

export const subscribeToDirectMessages = (currentUserId, callback) => {
  if (!currentUserId) {
    return () => {}
  }

  ensureLocalCacheInitialized()
  const client = getSupabaseClient()

  if (canUseSupabase() && client) {
    const config = getSupabaseConfig()
    let refreshPromise = null
    let shouldRefreshAgain = false

    const refreshMessages = async (payload) => {
      if (import.meta.env.DEV) {
        console.debug('[DM Realtime]', {
          event: payload?.eventType || 'unknown',
          table: payload?.table || 'unknown',
          sender: payload?.new?.sender_id || payload?.old?.sender_id,
          recipient: payload?.new?.recipient_id || payload?.old?.recipient_id,
          user: payload?.new?.user_id || payload?.old?.user_id,
          peer: payload?.new?.peer_id || payload?.old?.peer_id,
          content: payload?.new?.content?.slice(0, 50) + '...' || 'deleted',
          timestamp: new Date().toISOString()
        })
      }

      if (refreshPromise) {
        shouldRefreshAgain = true
        return refreshPromise
      }

      refreshPromise = (async () => {
        do {
          shouldRefreshAgain = false

          try {
            const messages = await fetchSupabaseMessages(currentUserId)
            callback(messages)
          } catch (error) {
            console.warn('[DM Realtime] Failed to refresh messages:', error)
          }
        } while (shouldRefreshAgain)
      })().finally(() => {
        refreshPromise = null
      })

      return refreshPromise
    }

    const channel = client
      .channel(config.directMessagesChannel)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: config.directMessagesTable },
        refreshMessages
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: config.directMessageReadsTable },
        refreshMessages
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.debug('[DM Realtime] Subscription status:', status)
        }
      })

    return () => {
      if (import.meta.env.DEV) {
        console.debug('[DM Realtime] Unsubscribing from channel')
      }
      client.removeChannel(channel)
    }
  }

  localListeners.set(callback, currentUserId)
  callback(filterMessagesForUser(localMessages, currentUserId))

  return () => {
    localListeners.delete(callback)
  }
}
