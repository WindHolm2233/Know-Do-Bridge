import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchDirectMessages,
  fetchDirectMessageReads,
  getCachedDirectMessages,
  sendDirectMessage,
  subscribeToDirectMessages,
  upsertDirectMessageRead
} from '@/services/messageApi'
import { translateError } from '@/utils/appError'

const buildThreadKey = (userA, userB) => [userA, userB].sort().join(':')
const getPeerIdFromThreadKey = (threadId, currentUserId) => {
  const [left, right] = `${threadId || ''}`.split(':')

  if (!left || !right) {
    return ''
  }

  if (left === currentUserId) {
    return right
  }

  if (right === currentUserId) {
    return left
  }

  return ''
}
const sortMessages = (messages) =>
  [...messages].sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
const MESSAGES_CACHE_MS = 30 * 1000
const THREAD_STATE_STORAGE_KEY = 'campus-link-message-thread-state'

const readThreadState = () => {
  if (typeof localStorage === 'undefined') {
    return {}
  }

  try {
    const saved = localStorage.getItem(THREAD_STATE_STORAGE_KEY)

    if (!saved) {
      return {}
    }

    const parsed = JSON.parse(saved)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    console.warn('Unable to restore message thread state.', error)
    return {}
  }
}

const writeThreadState = (value) => {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.setItem(THREAD_STATE_STORAGE_KEY, JSON.stringify(value))
  } catch (error) {
    console.warn('Unable to persist message thread state.', error)
  }
}

export const useMessagesStore = defineStore('messages', () => {
  const items = ref([])
  const loading = ref(false)
  const sending = ref(false)
  const error = ref('')
  const realtimeStop = ref(null)
  const loadedAt = ref(0)
  const loadedUserId = ref('')
  const realtimeUserId = ref('')
  const threadState = ref(readThreadState())
  let loadPromise = null
  let threadsCacheUserId = ''
  let threadsCacheSource = null
  let threadsCacheState = null
  let threadsCacheValue = []

  const isRealtimeActive = computed(() => Boolean(realtimeStop.value))

  const getUserThreadState = (currentUserId) => {
    if (!currentUserId) {
      return {
        lastActiveThreadId: '',
        threads: {}
      }
    }

    const saved = threadState.value[currentUserId]
    return {
      lastActiveThreadId:
        typeof saved?.lastActiveThreadId === 'string' ? saved.lastActiveThreadId : '',
      threads: saved?.threads && typeof saved.threads === 'object' ? saved.threads : {}
    }
  }

  const updateUserThreadState = (currentUserId, updater) => {
    if (!currentUserId) {
      return
    }

    const currentState = getUserThreadState(currentUserId)
    const nextState = updater(currentState)

    if (nextState === currentState) {
      return
    }

    threadState.value = {
      ...threadState.value,
      [currentUserId]: nextState
    }
    writeThreadState(threadState.value)
  }

  const mergeMessage = (nextMessage) => {
    const existingIndex = items.value.findIndex((message) => message.id === nextMessage.id)
    const nextItems = [...items.value]

    if (existingIndex >= 0) {
      nextItems.splice(existingIndex, 1, nextMessage)
    } else {
      nextItems.push(nextMessage)
    }

    items.value = sortMessages(nextItems)
  }

  const syncReadStatesFromRemote = async (currentUserId) => {
    const readStates = await fetchDirectMessageReads(currentUserId)

    if (!readStates.length) {
      return
    }

    updateUserThreadState(currentUserId, (currentState) => {
      const nextThreads = { ...currentState.threads }
      let hasChanged = false

      readStates.forEach((entry) => {
        const threadId = buildThreadKey(currentUserId, entry.peerId)
        const previousReadAt = nextThreads[threadId]?.lastReadAt

        if (
          previousReadAt &&
          new Date(previousReadAt).getTime() >= new Date(entry.lastReadAt).getTime()
        ) {
          return
        }

        hasChanged = true
        nextThreads[threadId] = {
          ...nextThreads[threadId],
          lastReadAt: entry.lastReadAt
        }
      })

      if (!hasChanged) {
        return currentState
      }

      return {
        ...currentState,
        threads: nextThreads
      }
    })
  }

  const persistThreadReadState = (currentUserId, threadId, readAt) => {
    const peerId = getPeerIdFromThreadKey(threadId, currentUserId)

    if (!currentUserId || !peerId || !readAt) {
      return
    }

    upsertDirectMessageRead({
      userId: currentUserId,
      peerId,
      lastReadAt: readAt
    }).catch((syncError) => {
      console.warn('[DM Read Sync] Failed to persist read-state:', syncError)
    })
  }

  const loadMessages = async (currentUserId) => {
    if (!currentUserId) {
      items.value = []
      loadedUserId.value = ''
      loadedAt.value = 0
      return
    }

    if (loadPromise && loadedUserId.value === currentUserId) {
      return loadPromise
    }

    if (
      loadedUserId.value === currentUserId &&
      loadedAt.value &&
      Date.now() - loadedAt.value < MESSAGES_CACHE_MS
    ) {
      return items.value
    }

    loading.value = true
    error.value = ''

    loadedUserId.value = currentUserId
    loadPromise = (async () => {
      try {
        items.value = sortMessages(await fetchDirectMessages(currentUserId))
        await syncReadStatesFromRemote(currentUserId)
        loadedAt.value = Date.now()
        return items.value
      } catch (err) {
        error.value = translateError(err, 'messagesLoad')
        return items.value
      } finally {
        loading.value = false
        loadPromise = null
      }
    })()

    return loadPromise
  }

  const hydrateMessages = (currentUserId) => {
    if (!currentUserId) {
      items.value = []
      loadedUserId.value = ''
      loadedAt.value = 0
      return items.value
    }

    items.value = sortMessages(getCachedDirectMessages(currentUserId))
    loadedUserId.value = currentUserId
    loadedAt.value = 0
    return items.value
  }

  const startRealtime = (currentUserId) => {
    if (!currentUserId) {
      return
    }

    if (isRealtimeActive.value && realtimeUserId.value === currentUserId) {
      return
    }

    stopRealtime()

    realtimeStop.value = subscribeToDirectMessages(currentUserId, (nextMessages) => {
      items.value = sortMessages(nextMessages)
      loadedUserId.value = currentUserId
      loadedAt.value = Date.now()
      syncReadStatesFromRemote(currentUserId).catch((syncError) => {
        console.warn('[DM Read Sync] Failed to refresh read-state:', syncError)
      })
    })
    realtimeUserId.value = currentUserId
  }

  const stopRealtime = () => {
    if (typeof realtimeStop.value === 'function') {
      realtimeStop.value()
    }

    realtimeStop.value = null
    realtimeUserId.value = ''
  }

  const sendMessage = async ({ sender, recipient, content }) => {
    sending.value = true
    error.value = ''

    try {
      const createdMessage = await sendDirectMessage({ sender, recipient, content })
      mergeMessage(createdMessage)
      loadedUserId.value = sender.id
      loadedAt.value = Date.now()
      const threadId = buildThreadKey(sender.id, recipient.id)
      setLastActiveThread(sender.id, threadId)
      markThreadRead(sender.id, threadId, createdMessage.createdAt)

      return createdMessage
    } catch (err) {
      error.value = translateError(err, 'messagesSend')
      return null
    } finally {
      sending.value = false
    }
  }

  const getThreadsForUser = (currentUserId) => {
    if (!currentUserId) {
      threadsCacheUserId = ''
      threadsCacheSource = null
      threadsCacheState = null
      threadsCacheValue = []
      return []
    }

    if (
      threadsCacheUserId === currentUserId &&
      threadsCacheSource === items.value &&
      threadsCacheState === threadState.value[currentUserId]
    ) {
      return threadsCacheValue
    }

    const grouped = new Map()
    const userThreadState = getUserThreadState(currentUserId)

    items.value.forEach((message) => {
      if (message.senderId !== currentUserId && message.recipientId !== currentUserId) {
        return
      }

      const counterpart =
        message.senderId === currentUserId
          ? {
              id: message.recipientId,
              name: message.recipientName,
              role: message.recipientRole,
              avatar: (message.recipientName || 'U').slice(0, 1).toUpperCase()
            }
          : {
              id: message.senderId,
              name: message.senderName,
              role: message.senderRole,
              avatar: (message.senderName || 'U').slice(0, 1).toUpperCase()
            }

      const threadKey = buildThreadKey(currentUserId, counterpart.id)
      const existing = grouped.get(threadKey) || {
        id: threadKey,
        counterpart,
        messages: [],
        participants: new Set()
      }

      existing.counterpart = counterpart
      existing.messages.push(message)
      existing.participants.add(message.senderId)
      grouped.set(threadKey, existing)
    })

    threadsCacheValue = [...grouped.values()]
      .map((thread) => ({
        ...(userThreadState.threads[thread.id] || {}),
        id: thread.id,
        counterpart: thread.counterpart,
        messages: thread.messages,
        latestMessage: thread.messages[thread.messages.length - 1],
        isActive: thread.participants.size > 1,
        unreadCount: thread.messages.filter((message) => {
          const lastReadAt = userThreadState.threads[thread.id]?.lastReadAt

          if (message.senderId === currentUserId) {
            return false
          }

          if (!lastReadAt) {
            return true
          }

          return new Date(message.createdAt).getTime() > new Date(lastReadAt).getTime()
        }).length
      }))
      .map((thread) => ({
        ...thread,
        hasUnread: thread.unreadCount > 0
      }))
      .sort(
        (a, b) =>
          new Date(b.latestMessage.createdAt).getTime() -
          new Date(a.latestMessage.createdAt).getTime()
      )

    threadsCacheUserId = currentUserId
    threadsCacheSource = items.value
    threadsCacheState = threadState.value[currentUserId]
    return threadsCacheValue
  }

  const markThreadRead = (currentUserId, threadId, readAt = '') => {
    if (!currentUserId || !threadId) {
      return
    }

    const nextReadAt =
      readAt ||
      getThreadsForUser(currentUserId).find((entry) => entry.id === threadId)?.latestMessage
        ?.createdAt

    if (!nextReadAt) {
      return
    }

    updateUserThreadState(currentUserId, (currentState) => {
      const previousReadAt = currentState.threads[threadId]?.lastReadAt

      if (
        previousReadAt &&
        new Date(previousReadAt).getTime() >= new Date(nextReadAt).getTime()
      ) {
        return currentState
      }

      return {
        ...currentState,
        threads: {
          ...currentState.threads,
          [threadId]: {
            ...currentState.threads[threadId],
            lastReadAt: nextReadAt
          }
        }
      }
    })

    persistThreadReadState(currentUserId, threadId, nextReadAt)
  }

  const markAllThreadsRead = (currentUserId) => {
    if (!currentUserId) {
      return
    }

    const threads = getThreadsForUser(currentUserId)
    const changedReads = []

    updateUserThreadState(currentUserId, (currentState) => {
      const nextThreads = { ...currentState.threads }
      let hasChanged = false

      threads.forEach((thread) => {
        const latestMessageCreatedAt = thread.latestMessage?.createdAt
        const previousReadAt = nextThreads[thread.id]?.lastReadAt

        if (!latestMessageCreatedAt) {
          return
        }

        if (
          previousReadAt &&
          new Date(previousReadAt).getTime() >= new Date(latestMessageCreatedAt).getTime()
        ) {
          return
        }

        hasChanged = true
        nextThreads[thread.id] = {
          ...nextThreads[thread.id],
          lastReadAt: latestMessageCreatedAt
        }
        changedReads.push({ threadId: thread.id, readAt: latestMessageCreatedAt })
      })

      if (!hasChanged) {
        return currentState
      }

      return {
        ...currentState,
        threads: nextThreads
      }
    })

    changedReads.forEach((entry) => {
      persistThreadReadState(currentUserId, entry.threadId, entry.readAt)
    })
  }

  const setLastActiveThread = (currentUserId, threadId) => {
    if (!currentUserId) {
      return
    }

    updateUserThreadState(currentUserId, (currentState) => {
      if (currentState.lastActiveThreadId === threadId) {
        return currentState
      }

      return {
        ...currentState,
        lastActiveThreadId: threadId || ''
      }
    })
  }

  const getLastActiveThreadId = (currentUserId) =>
    getUserThreadState(currentUserId).lastActiveThreadId || ''

  const getPendingReplyCount = (currentUserId) =>
    getThreadsForUser(currentUserId).filter(
      (thread) => thread.latestMessage.senderId !== currentUserId
    ).length

  const getUnreadThreadCount = (currentUserId) =>
    getThreadsForUser(currentUserId).filter((thread) => thread.hasUnread).length

  return {
    error,
    getLastActiveThreadId,
    getUnreadThreadCount,
    getThreadsForUser,
    hydrateMessages,
    getPendingReplyCount,
    isRealtimeActive,
    items,
    loadMessages,
    loading,
    markAllThreadsRead,
    markThreadRead,
    sendMessage,
    sending,
    setLastActiveThread,
    startRealtime,
    stopRealtime
  }
})
