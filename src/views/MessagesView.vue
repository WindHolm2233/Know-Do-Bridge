<template>
  <AppShellLayout :current-user="authStore.currentUser">
    <AppHeader
      :title="uiStore.t('messagesTitle')"
      :subtitle="uiStore.t('messagesSubtitle')"
      :is-live="messagesStore.isRealtimeActive"
    />

    <section v-if="!authStore.currentUser" class="messages-auth-state">
      <div class="messages-auth-state__card">
        <h3>{{ uiStore.t('messagesSignInTitle') }}</h3>
        <p>{{ uiStore.t('messagesSignInText') }}</p>
      </div>
    </section>

    <p v-else-if="pageError" class="status-banner status-banner--error">
      {{ pageError }}
    </p>

    <section
      v-if="authStore.currentUser"
      :class="['qq-shell', { 'qq-shell--chat-open': mobilePane === 'chat' }]"
    >
      <aside class="qq-sidebar">
        <div class="qq-sidebar__top">
          <div class="qq-sidebar__identity">
            <div class="qq-sidebar__avatar">{{ currentUserAvatar }}</div>
            <div class="qq-sidebar__copy">
              <strong>{{ authStore.currentUser.name }}</strong>
              <small>{{ authStore.currentUser.role }}</small>
            </div>
          </div>
          <div v-if="unreadThreadCount" class="qq-sidebar__unread">
            {{ unreadThreadCount }}
          </div>
        </div>

        <div class="qq-sidebar__toolbar">
          <input
            v-model="threadSearch"
            class="qq-sidebar__search"
            type="search"
            :placeholder="uiStore.t('messagesSearchPlaceholder')"
          />
          <button
            type="button"
            class="qq-sidebar__action"
            :disabled="!unreadThreadCount"
            @click="handleMarkAllRead"
          >
            {{ uiStore.t('messagesMarkAllRead') }}
          </button>
        </div>

        <div class="qq-sidebar__summary">
          <span>{{ allChatsTitle }}</span>
          <strong>{{ threads.length }}</strong>
        </div>

        <div class="qq-sidebar__groups">
          <div v-if="flatThreads.length" class="qq-thread-stack">
            <button
              v-for="thread in flatThreads"
              :key="thread.id"
              :class="['qq-thread', { 'qq-thread--active': activeThreadId === thread.id }]"
              type="button"
              @click="selectThread(thread.id, { focusChat: true })"
            >
              <div class="qq-thread__avatar-wrapper">
                <div class="qq-thread__avatar">{{ thread.counterpart.avatar }}</div>
                <div
                  :class="['qq-thread__online', { 'qq-thread__online--active': getIsUserOnline(thread.counterpart.id) }]"
                />
              </div>
              <div class="qq-thread__body">
                <div class="qq-thread__meta">
                  <strong>{{ thread.counterpart.name }}</strong>
                  <small>{{ formatThreadTime(thread.latestMessage.createdAt) }}</small>
                </div>
                <div class="qq-thread__preview">
                  <p>{{ buildThreadPreview(thread) }}</p>
                  <span v-if="thread.unreadCount" class="qq-thread__badge">
                    {{ thread.unreadCount }}
                  </span>
                </div>
              </div>
            </button>
          </div>

          <p v-else-if="!normalizedThreadSearch" class="qq-group__empty">
            {{ uiStore.t('messagesNoChats') }}
          </p>

          <p v-else class="qq-search-empty">
            {{ uiStore.t('messagesSearchEmpty') }}
          </p>
        </div>
      </aside>

      <section class="qq-chat">
        <div v-if="chatTarget" class="qq-chat__header">
          <div class="qq-chat__identity">
            <button type="button" class="qq-chat__back" @click="showThreadsPane">
              {{ mobileThreadLabel }}
            </button>
            <div class="qq-chat__avatar-wrapper">
              <div class="qq-chat__avatar">{{ chatTarget.avatar }}</div>
              <div
                :class="['qq-chat__online', { 'qq-chat__online--active': getIsUserOnline(chatTarget.id) }]"
              />
            </div>
            <div class="qq-chat__copy">
              <strong>{{ chatTarget.name }}</strong>
              <small v-if="getIsUserOnline(chatTarget.id)" class="qq-chat__status-text">
                {{ uiStore.locale === 'zh' ? '在线' : 'Online' }}
              </small>
              <small v-else class="qq-chat__status-text">{{ chatTarget.role }}</small>
            </div>
          </div>

          <div class="qq-chat__meta">
            <small v-if="selectedThread?.latestMessage?.createdAt">
              {{ formatMessageTime(selectedThread.latestMessage.createdAt) }}
            </small>
          </div>
        </div>

        <div v-if="selectedThread" ref="chatHistoryRef" class="qq-chat__history">
          <template v-for="(group, groupIdx) in groupMessagesByDate(selectedThread.messages)" :key="`date-${groupIdx}`">
            <div class="qq-chat__date-divider">
              <span>{{ formatDateLabel(group.date) }}</span>
            </div>

            <template v-for="(message, msgIdx) in group.messages" :key="message.id">
              <div
                v-if="shouldShowUnreadDivider(message.id)"
                class="qq-chat__unread-divider"
              >
                <span>{{ uiStore.t('messagesUnreadDivider') }}</span>
              </div>

              <div
                :class="[
                  'qq-message-row',
                  { 'qq-message-row--mine': message.senderId === authStore.currentUser.id }
                ]"
              >
                <div
                  v-if="message.senderId !== authStore.currentUser.id"
                  class="qq-message-avatar"
                >
                  {{ message.senderName.slice(0, 1).toUpperCase() }}
                </div>
                <div
                  v-else
                  style="width: 2rem; flex-shrink: 0"
                />

                <div class="qq-message-group">
                  <div
                    v-if="shouldShowSenderInfo(message, msgIdx, group.messages)"
                    class="qq-message-sender"
                  >
                    {{ message.senderName }}
                  </div>

                  <article
                    :class="[
                      'qq-message-bubble',
                      { 'qq-message-bubble--mine': message.senderId === authStore.currentUser.id }
                    ]"
                  >
                    <p>{{ message.content }}</p>
                    <small class="qq-message-time">
                      {{ new Date(message.createdAt).toLocaleTimeString(
                        uiStore.locale === 'zh' ? 'zh-CN' : 'en-US',
                        { hour: '2-digit', minute: '2-digit' }
                      ) }}
                    </small>
                  </article>
                </div>
              </div>
            </template>
          </template>
        </div>

        <div v-else class="qq-chat__empty">
          <div class="qq-chat__empty-card">
            <div class="qq-chat__empty-avatar">
              {{ chatTarget ? chatTarget.avatar : '...' }}
            </div>
            <h3>{{ chatTarget ? uiStore.t('messagesGreetTitle') : uiStore.t('messagesChooseTitle') }}</h3>
            <p>{{ chatTarget ? uiStore.t('messagesGreetText') : uiStore.t('messagesChooseText') }}</p>
          </div>
        </div>

        <div v-if="chatTarget" class="qq-composer">
          <div class="qq-chat__typing-indicator">
            <span v-if="false">{{ chatTarget.name }} {{ uiStore.locale === 'zh' ? '正在输入...' : 'is typing...' }}</span>
          </div>
          <div class="qq-composer__field">
            <textarea
              ref="composerTextareaRef"
              v-model="draft"
              rows="3"
              :maxlength="MESSAGE_CHARACTER_LIMIT"
              :placeholder="uiStore.t('messagesInputPlaceholder')"
              @input="handleDraftInput"
              @keydown="handleComposerKeydown"
            />
            <div class="qq-composer__meta">
              <small>{{ composerHint }}</small>
              <small :class="['qq-composer__count', { 'qq-composer__count--warning': draftRemaining <= 60 }]">
                {{ draftLength }}/{{ MESSAGE_CHARACTER_LIMIT }}
              </small>
            </div>
            <small v-if="messagesStore.sending" class="qq-composer__status">
              {{ sendingText }}
            </small>
          </div>
          <button :disabled="messagesStore.sending || !draft.trim()" @click="handleSend">
            {{ messagesStore.sending ? uiStore.t('sending') : uiStore.t('send') }}
          </button>
        </div>
      </section>
    </section>

    <template #sidebar>
      <AuthPanel
        :current-user="authStore.currentUser"
        :error="authStore.error"
        :notice="authStore.notice"
        :using-supabase="authStore.usingSupabase"
        :pending-verification-email="authStore.pendingVerificationEmail"
        :resend-cooldown-seconds="authStore.verificationCooldownSeconds"
        :resending="authStore.resendingVerification"
        :submitting="authStore.submitting"
        @sign-in="authStore.signIn"
        @resend-verification="authStore.resendSignupConfirmation"
        @sign-out="authStore.signOut"
      />
    </template>
  </AppShellLayout>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from './AppHeader.vue'
import AppShellLayout from './AppShellLayout.vue'
import AuthPanel from './AuthPanel.vue'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'
import { useUiStore } from '@/stores/ui'

const MESSAGE_DRAFT_STORAGE_KEY = 'campus-link-message-drafts'
const MESSAGE_CHARACTER_LIMIT = 500

const authStore = useAuthStore()
const messagesStore = useMessagesStore()
const uiStore = useUiStore()
const route = useRoute()
const router = useRouter()
const draft = ref('')
const activeThreadId = ref('')
const chatHistoryRef = ref(null)
const composerTextareaRef = ref(null)
const threadSearch = ref('')
const openedUnreadMessageId = ref('')
const mobilePane = ref('threads')

const buildThreadId = (userA, userB) => [userA, userB].sort().join(':')

const readStoredDrafts = () => {
  if (typeof localStorage === 'undefined') {
    return {}
  }

  try {
    const saved = localStorage.getItem(MESSAGE_DRAFT_STORAGE_KEY)

    if (!saved) {
      return {}
    }

    const parsed = JSON.parse(saved)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    console.warn('Unable to restore message drafts.', error)
    return {}
  }
}

const writeStoredDrafts = (value) => {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.setItem(MESSAGE_DRAFT_STORAGE_KEY, JSON.stringify(value))
  } catch (error) {
    console.warn('Unable to persist message drafts.', error)
  }
}

const storedDrafts = ref(readStoredDrafts())

const threads = computed(() =>
  authStore.currentUser ? messagesStore.getThreadsForUser(authStore.currentUser.id) : []
)
const normalizedThreadSearch = computed(() => threadSearch.value.trim().toLowerCase())
const routeTarget = computed(() => {
  if (!route.query.userId || !route.query.name || !route.query.role) {
    return null
  }

  if (route.query.userId === authStore.currentUser?.id) {
    return null
  }

  return {
    id: String(route.query.userId),
    name: String(route.query.name),
    role: String(route.query.role),
    avatar: String(route.query.avatar || String(route.query.name).slice(0, 1).toUpperCase())
  }
})

const selectedThread = computed(() =>
  threads.value.find((thread) => thread.id === activeThreadId.value) || null
)
const chatTarget = computed(() => selectedThread.value?.counterpart || routeTarget.value)
const pageError = computed(() => messagesStore.error)
const unreadThreadCount = computed(() =>
  authStore.currentUser ? messagesStore.getUnreadThreadCount(authStore.currentUser.id) : 0
)
const draftLength = computed(() => draft.value.length)
const draftRemaining = computed(() => MESSAGE_CHARACTER_LIMIT - draftLength.value)
const sendingText = computed(() => (uiStore.locale === 'zh' ? '\u6b63\u5728\u53d1\u9001...' : 'Sending...'))
const mobileThreadLabel = computed(() =>
  uiStore.locale === 'zh' ? '\u4f1a\u8bdd' : 'Chats'
)
const allChatsTitle = computed(() => (uiStore.locale === 'zh' ? '\u5168\u90e8\u4f1a\u8bdd' : 'All chats'))
const composerHint = computed(() =>
  uiStore.locale === 'zh'
    ? 'Enter \u53d1\u9001 | Shift + Enter \u6362\u884c'
    : 'Press Enter to send | Shift + Enter for a new line'
)
const replyNeededTitle = computed(() => (uiStore.locale === 'zh' ? '\u522b\u4eba\u627e\u4f60' : 'Needs reply'))
const replyNeededPill = computed(() => (uiStore.locale === 'zh' ? '\u65b0\u6d88\u606f' : 'New'))
const replyNeededEmptyText = computed(() =>
  uiStore.locale === 'zh'
    ? '\u6682\u65f6\u6ca1\u6709\u9700\u8981\u4f18\u5148\u56de\u590d\u7684\u4f1a\u8bdd\u3002'
    : 'No incoming chats need your reply right now.'
)
const currentUserAvatar = computed(
  () => authStore.currentUser?.avatar || authStore.currentUser?.name?.slice(0, 1)?.toUpperCase() || 'U'
)
const currentDraftKey = computed(() => {
  if (!authStore.currentUser?.id) {
    return ''
  }

  if (selectedThread.value?.id) {
    return `${authStore.currentUser.id}:${selectedThread.value.id}`
  }

  if (routeTarget.value?.id) {
    return `${authStore.currentUser.id}:${buildThreadId(authStore.currentUser.id, routeTarget.value.id)}`
  }

  return ''
})

// 在线状态模拟（实际项目中应从服务获取）
const onlineUsers = ref(new Set())
const getIsUserOnline = (userId) => {
  return onlineUsers.value.has(userId)
}

// 扁平化线程列表（移除分组）
const flatThreads = computed(() =>
  normalizedThreadSearch.value
    ? threads.value.filter(
        (thread) =>
          matchesThreadSearch(thread) &&
          !showSearchEmpty.value
      )
    : threads.value
)

// 消息时间分组
const groupMessagesByDate = (messages) => {
  if (!messages.length) return []

  const groups = []
  let currentDate = null
  let currentGroup = null

  for (const message of messages) {
    const messageDate = new Date(message.createdAt).toLocaleDateString()

    if (messageDate !== currentDate) {
      currentDate = messageDate
      currentGroup = {
        date: messageDate,
        messages: []
      }
      groups.push(currentGroup)
    }

    currentGroup.messages.push(message)
  }

  return groups
}

// 检查是否应该显示发送者信息（用于相邻消息合并）
const shouldShowSenderInfo = (message, index, messages) => {
  if (index === 0) return true
  const prevMessage = messages[index - 1]
  return prevMessage.senderId !== message.senderId
}

const formatDateLabel = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return uiStore.locale === 'zh' ? '今天' : 'Today'
  }

  if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return uiStore.locale === 'zh' ? '昨天' : 'Yesterday'
  }

  return date.toLocaleDateString(uiStore.locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: dateOnly.getFullYear() !== todayOnly.getFullYear() ? 'numeric' : undefined
  })
}

const formatThreadTime = (value) => {
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

const formatMessageTime = (value) =>
  new Date(value).toLocaleString(uiStore.locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

const buildThreadPreview = (thread) => {
  if (!authStore.currentUser) {
    return thread.latestMessage.content
  }

  return thread.latestMessage.senderId === authStore.currentUser.id
    ? `${thread.latestMessage.senderName}: ${thread.latestMessage.content}`
    : thread.latestMessage.content
}

const matchesThreadSearch = (thread) => {
  if (!normalizedThreadSearch.value) {
    return true
  }

  const haystack = [
    thread.counterpart.name,
    thread.counterpart.role,
    thread.latestMessage.content,
    thread.latestMessage.senderName
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalizedThreadSearch.value)
}

const needsReply = (thread) =>
  Boolean(authStore.currentUser?.id) && thread.latestMessage.senderId !== authStore.currentUser.id

const showSearchEmpty = computed(
  () =>
    Boolean(normalizedThreadSearch.value) &&
    Boolean(threads.value.length) &&
    !threads.value.some((thread) => matchesThreadSearch(thread))
)

const getFirstUnreadMessageId = (thread) => {
  if (!thread?.lastReadAt || !authStore.currentUser?.id) {
    return ''
  }

  const firstUnreadMessage = thread.messages.find(
    (message) =>
      message.senderId !== authStore.currentUser.id &&
      new Date(message.createdAt).getTime() > new Date(thread.lastReadAt).getTime()
  )

  return firstUnreadMessage?.id || ''
}

const scrollChatToBottom = async () => {
  if (!selectedThread.value) {
    return
  }

  await nextTick()

  if (!chatHistoryRef.value) {
    return
  }

  chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight
}

const syncComposerHeight = async () => {
  await nextTick()

  if (!composerTextareaRef.value) {
    return
  }

  composerTextareaRef.value.style.height = 'auto'
  composerTextareaRef.value.style.height = `${Math.max(composerTextareaRef.value.scrollHeight, 104)}px`
}

const handleDraftInput = () => {
  syncComposerHeight()
}

const handleComposerKeydown = (event) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
    return
  }

  event.preventDefault()
  handleSend()
}

const showThreadsPane = () => {
  mobilePane.value = 'threads'
}

const showChatPane = () => {
  if (!chatTarget.value) {
    return
  }

  mobilePane.value = 'chat'
}

const selectThread = (threadId, options = {}) => {
  const { focusChat = false } = options

  if (!threadId) {
    return
  }

  const nextThread = threads.value.find((thread) => thread.id === threadId) || null
  openedUnreadMessageId.value = getFirstUnreadMessageId(nextThread)
  activeThreadId.value = threadId

  if (focusChat) {
    mobilePane.value = 'chat'
  }
}

const shouldShowUnreadDivider = (messageId) =>
  Boolean(openedUnreadMessageId.value) && openedUnreadMessageId.value === messageId

const handleMarkAllRead = () => {
  if (!authStore.currentUser?.id) {
    return
  }

  openedUnreadMessageId.value = ''
  messagesStore.markAllThreadsRead(authStore.currentUser.id)
}

const syncActiveThread = () => {
  if (selectedThread.value) {
    return
  }

  if (routeTarget.value && authStore.currentUser?.id) {
    const matchedThread = threads.value.find(
      (thread) => thread.counterpart.id === routeTarget.value.id
    )

    if (matchedThread?.id) {
      selectThread(matchedThread.id, { focusChat: false })
      return
    }

    activeThreadId.value = ''
    openedUnreadMessageId.value = ''
    return
  }

  const rememberedThreadId = authStore.currentUser?.id
    ? messagesStore.getLastActiveThreadId(authStore.currentUser.id)
    : ''
  const unreadThread = threads.value.find((thread) => thread.hasUnread)
  const rememberedThreadExists = threads.value.some((thread) => thread.id === rememberedThreadId)
  const nextThreadId =
    unreadThread?.id ||
    (rememberedThreadExists ? rememberedThreadId : '') ||
    threads.value[0]?.id ||
    ''

  if (nextThreadId) {
    selectThread(nextThreadId, { focusChat: false })
    return
  }

  activeThreadId.value = ''
  openedUnreadMessageId.value = ''
}

const syncMessageSession = async (currentUserId) => {
  if (!currentUserId) {
    messagesStore.stopRealtime()
    await messagesStore.loadMessages('')
    return
  }

  await messagesStore.loadMessages(currentUserId)
  messagesStore.startRealtime(currentUserId)
}

watch(
  () => authStore.currentUser?.id,
  (currentUserId) => {
    syncMessageSession(currentUserId)
  },
  { immediate: true }
)
watch([threads, routeTarget], syncActiveThread, { immediate: true })
watch(
  routeTarget,
  (nextRouteTarget) => {
    if (nextRouteTarget) {
      mobilePane.value = 'chat'
      return
    }

    if (!selectedThread.value) {
      mobilePane.value = 'threads'
    }
  },
  { immediate: true }
)
onUnmounted(() => {
  messagesStore.stopRealtime()
})

watch(
  () => [
    authStore.currentUser?.id,
    selectedThread.value?.id,
    selectedThread.value?.latestMessage?.createdAt
  ],
  ([currentUserId, threadId, latestMessageCreatedAt]) => {
    if (!currentUserId || !threadId) {
      return
    }

    messagesStore.setLastActiveThread(currentUserId, threadId)
    messagesStore.markThreadRead(currentUserId, threadId, latestMessageCreatedAt)
  },
  { immediate: true }
)
watch(
  currentDraftKey,
  (nextDraftKey) => {
    draft.value = nextDraftKey ? storedDrafts.value[nextDraftKey] || '' : ''
  },
  { immediate: true }
)
watch(
  () => draft.value,
  () => {
    syncComposerHeight()
  },
  { immediate: true }
)
watch([currentDraftKey, draft], ([nextDraftKey, nextDraft]) => {
  if (!nextDraftKey) {
    return
  }

  const previousDraft = storedDrafts.value[nextDraftKey] || ''

  if (nextDraft.trim()) {
    if (previousDraft === nextDraft) {
      return
    }
  } else if (!previousDraft) {
    return
  }

  const nextStoredDrafts = { ...storedDrafts.value }

  if (nextDraft.trim()) {
    nextStoredDrafts[nextDraftKey] = nextDraft
  } else {
    delete nextStoredDrafts[nextDraftKey]
  }

  storedDrafts.value = nextStoredDrafts
  writeStoredDrafts(nextStoredDrafts)
})
watch(
  () => [selectedThread.value?.id, selectedThread.value?.messages.length],
  () => {
    scrollChatToBottom()
  },
  { immediate: true }
)

const handleSend = async () => {
  if (!authStore.currentUser || !chatTarget.value || !draft.value.trim()) {
    return
  }

  const created = await messagesStore.sendMessage({
    sender: authStore.currentUser,
    recipient: chatTarget.value,
    content: draft.value
  })

  if (!created) {
    return
  }

  if (currentDraftKey.value) {
    const nextStoredDrafts = { ...storedDrafts.value }
    delete nextStoredDrafts[currentDraftKey.value]
    storedDrafts.value = nextStoredDrafts
    writeStoredDrafts(nextStoredDrafts)
  }

  draft.value = ''
  selectThread(buildThreadId(authStore.currentUser.id, chatTarget.value.id), { focusChat: true })
  scrollChatToBottom()

  if (routeTarget.value) {
    router.replace({ path: '/messages' })
  }
}
</script>

<style scoped>
.page-panel {
  margin: 1rem;
  padding: 1.1rem;
  border: 1px solid var(--app-border);
  border-radius: 20px;
  background: var(--app-surface-elevated);
}

.hero-panel h1,
.thread-section h3,
.chat-panel__identity h3,
.chat-empty h3 {
  color: var(--app-heading);
  font-size: 1.4rem;
  font-weight: 800;
}

.section-kicker {
  margin: 0 0 0.45rem;
  color: var(--app-accent);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-panel p,
.thread-empty,
.chat-empty p,
.chat-panel__identity small {
  margin-top: 0.45rem;
  color: var(--app-text-soft);
}

.hero-panel {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 1rem;
  overflow: hidden;
}

.hero-panel__copy {
  max-width: 38rem;
}

.hero-panel__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  min-width: min(24rem, 46%);
}

.messages-mobile-shell {
  display: block;
}

.messages-mobile-switch {
  display: none;
  margin: 0 1rem 0.3rem;
  padding: 0.35rem;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
}

.messages-mobile-switch__button {
  min-height: 2.75rem;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: var(--app-text-soft);
  font-weight: 800;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.messages-mobile-switch__button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.messages-mobile-switch__button--active {
  background: rgba(15, 20, 25, 0.06);
  color: var(--app-heading);
}

.messages-mobile-switch__button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.hero-stat {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: var(--app-surface-soft);
}

.hero-stat strong {
  color: var(--app-heading);
  font-size: 1.6rem;
  font-weight: 800;
}

.hero-stat span {
  color: var(--app-text-soft);
  font-size: 0.84rem;
  font-weight: 700;
}

.messages-layout {
  display: grid;
  grid-template-columns: minmax(295px, 340px) minmax(0, 1fr);
  gap: 0.5rem;
  align-items: start;
}

.thread-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 1rem;
}

.thread-list__intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.15rem 0.1rem 0.2rem;
}

.thread-list__intro h3 {
  margin: 0;
  color: var(--app-heading);
  font-size: 1.25rem;
  font-weight: 800;
}

.thread-list__intro p:last-child {
  margin: 0.45rem 0 0;
}

.thread-list__pill {
  display: inline-grid;
  min-width: 2.15rem;
  height: 2.15rem;
  place-items: center;
  padding: 0 0.5rem;
  border-radius: 999px;
  background: var(--app-accent);
  color: white;
  font-size: 0.88rem;
  font-weight: 800;
}

.thread-toolbar {
  display: flex;
  gap: 0.65rem;
}

.thread-search {
  flex: 1;
  min-width: 0;
  padding: 0.78rem 0.9rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--app-heading);
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.thread-search:focus {
  border-color: rgba(29, 155, 240, 0.48);
  box-shadow: 0 0 0 4px rgba(29, 155, 240, 0.12);
  background: white;
}

.thread-toolbar__button {
  flex-shrink: 0;
  padding: 0.78rem 0.95rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--app-heading);
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.thread-toolbar__button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(15, 20, 25, 0.08);
  background: white;
}

.thread-toolbar__button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.thread-section {
  padding: 0.15rem 0;
}

.thread-section--priority {
  padding: 0.9rem;
  border-radius: 18px;
  background: rgba(29, 155, 240, 0.06);
}

.thread-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.7rem;
}

.thread-section__header h3 {
  margin: 0;
}

.thread-section__count {
  display: inline-grid;
  min-width: 1.75rem;
  height: 1.75rem;
  place-items: center;
  padding: 0 0.45rem;
  border-radius: 999px;
  background: rgba(15, 20, 25, 0.06);
  color: var(--app-heading);
  font-size: 0.8rem;
  font-weight: 800;
}

.thread-section__count--accent {
  background: rgba(29, 155, 240, 0.14);
  color: var(--app-accent);
}

.thread-stack {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.thread-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
  cursor: pointer;
  text-align: left;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.thread-item:hover {
  transform: translateY(-1px);
  border-color: rgba(29, 155, 240, 0.24);
  box-shadow: 0 10px 22px rgba(15, 20, 25, 0.08);
  background: white;
}

.thread-item--active {
  border-color: rgba(29, 155, 240, 0.34);
  box-shadow: 0 12px 24px rgba(29, 155, 240, 0.1);
  background: rgba(29, 155, 240, 0.08);
}

.thread-item__avatar {
  display: grid;
  place-items: center;
  width: 2.85rem;
  height: 2.85rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #1d9bf0, #63b3ed);
  color: white;
  font-weight: 700;
}

.thread-item__copy {
  min-width: 0;
  flex: 1;
}

.thread-item__copy strong,
.chat-bubble p,
.chat-status {
  color: var(--app-heading);
}

.thread-item__meta,
.thread-item__preview,
.thread-item__subline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.thread-item__meta span,
.thread-item__copy small {
  color: var(--app-text-soft);
}

.thread-item__subline small {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thread-item__subline {
  margin-top: 0.25rem;
}

.thread-item__subline small {
  margin: 0;
}

.thread-item__state {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.22rem 0.58rem;
  border-radius: 999px;
  background: rgba(255, 184, 76, 0.16);
  color: #9a6700;
  font-size: 0.72rem;
  font-weight: 800;
  white-space: nowrap;
}

.thread-item__state--reply {
  background: rgba(29, 155, 240, 0.14);
  color: var(--app-accent);
}

.thread-item__state--active {
  background: rgba(29, 155, 240, 0.16);
  color: var(--app-accent);
}

.thread-item__preview {
  margin-top: 0.45rem;
}

.thread-item__preview small {
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.thread-item__badge {
  display: inline-grid;
  min-width: 1.4rem;
  height: 1.4rem;
  place-items: center;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: var(--app-accent);
  color: white;
  font-size: 0.72rem;
  font-weight: 700;
}

.thread-empty--search {
  margin-top: -0.35rem;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  min-height: 36rem;
}

.chat-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.15rem 0 1rem;
  border-bottom: 1px solid var(--app-border);
}

.chat-panel__identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.chat-panel__back {
  display: none;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--app-heading);
  font-size: 0.76rem;
  font-weight: 800;
  padding: 0.45rem 0.8rem;
  cursor: pointer;
}

.chat-panel__identity-copy h3,
.chat-panel__identity-copy small,
.chat-panel__header-meta small {
  margin: 0;
}

.chat-panel__header-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.45rem;
}

.chat-status {
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: rgba(255, 184, 76, 0.18);
  font-size: 0.82rem;
  font-weight: 700;
}

.chat-status--active {
  background: rgba(29, 155, 240, 0.18);
  color: var(--app-accent);
}

.chat-history {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.2rem 0;
  overflow-y: auto;
}

.chat-history__divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--app-text-soft);
  font-size: 0.82rem;
  font-weight: 700;
}

.chat-history__divider::before,
.chat-history__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--app-border);
}

.chat-row {
  display: flex;
  align-items: flex-end;
  gap: 0.65rem;
}

.chat-row--mine {
  justify-content: flex-end;
}

.chat-row__avatar {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: 999px;
  background: rgba(29, 155, 240, 0.14);
  color: var(--app-heading);
  font-size: 0.78rem;
  font-weight: 800;
  flex-shrink: 0;
}

.chat-bubble {
  max-width: 72%;
  padding: 0.9rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 22px;
  background: #f7f9f9;
}

.chat-bubble--mine {
  align-self: flex-end;
  border-color: rgba(29, 155, 240, 0.2);
  background: rgba(29, 155, 240, 0.12);
}

.chat-bubble__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}

.chat-bubble__meta strong,
.chat-bubble small {
  color: var(--app-text-soft);
  font-size: 0.78rem;
  font-weight: 700;
}

.chat-bubble p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.chat-empty {
  display: grid;
  flex: 1;
  place-items: center;
  padding: 2rem 1rem;
}

.chat-empty__card {
  width: min(26rem, 100%);
  padding: 2rem 1.35rem;
  border: 1px dashed rgba(15, 20, 25, 0.16);
  border-radius: 28px;
  background:
    radial-gradient(circle at top, rgba(29, 155, 240, 0.12), transparent 46%),
    rgba(255, 255, 255, 0.82);
  text-align: center;
}

.chat-empty__icon {
  display: grid;
  width: 4.25rem;
  height: 4.25rem;
  place-items: center;
  margin: 0 auto 1rem;
  border-radius: 1.4rem;
  background: linear-gradient(135deg, rgba(29, 155, 240, 0.24), rgba(99, 179, 237, 0.18));
  color: var(--app-heading);
  font-size: 1.25rem;
  font-weight: 800;
}

.chat-composer {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--app-border);
}

.chat-composer__field {
  flex: 1;
}

.chat-composer__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.chat-composer textarea {
  width: 100%;
  min-height: 5.5rem;
  max-height: 15rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--app-heading);
  line-height: 1.5;
  outline: none;
  resize: none;
  overflow-y: auto;
  overflow-wrap: anywhere;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.chat-composer textarea:focus {
  border-color: rgba(29, 155, 240, 0.48);
  box-shadow: 0 0 0 4px rgba(29, 155, 240, 0.12);
  background: white;
}

.chat-composer__hint {
  display: block;
  margin: 0.45rem 0 0 0.1rem;
  color: var(--app-text-soft);
}

.chat-composer__count,
.chat-composer__status {
  display: block;
  margin-top: 0.45rem;
  color: var(--app-text-soft);
  font-weight: 700;
}

.chat-composer__count--warning {
  color: #b67c24;
}

.chat-composer button {
  min-width: 6.2rem;
  padding: 0.9rem 1.25rem;
  border: none;
  border-radius: 999px;
  background: var(--app-accent);
  color: white;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 12px 22px rgba(29, 155, 240, 0.18);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease;
}

.chat-composer button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 16px 24px rgba(29, 155, 240, 0.22);
}

.chat-composer button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.status-banner {
  margin: 0 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(244, 33, 46, 0.16);
  border-radius: 12px;
  background: rgba(244, 33, 46, 0.08);
  color: var(--app-danger);
}

@media (max-width: 980px) {
  .hero-panel {
    flex-direction: column;
  }

  .messages-mobile-switch {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .hero-panel__stats {
    min-width: 0;
  }

  .messages-layout {
    grid-template-columns: 1fr;
  }

  .messages-layout--threads .chat-panel {
    display: none;
  }

  .messages-layout--chat .thread-list {
    display: none;
  }

  .thread-list {
    position: static;
  }

  .chat-panel__back {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}

@media (max-width: 680px) {
  .page-panel,
  .status-banner,
  .messages-mobile-switch {
    margin: 0.75rem;
  }

  .hero-panel__stats {
    grid-template-columns: 1fr;
  }

  .thread-toolbar,
  .chat-panel__header,
  .chat-composer,
  .chat-composer__meta {
    flex-direction: column;
    align-items: stretch;
  }

  .chat-panel__header-meta {
    align-items: flex-start;
  }

  .chat-row {
    gap: 0.5rem;
  }

  .chat-bubble {
    max-width: 100%;
  }

  .chat-panel__identity {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .thread-item__subline,
  .thread-item__meta,
  .thread-item__preview {
    align-items: flex-start;
    flex-direction: column;
  }
}

.messages-auth-state {
  margin: 1rem;
}

.messages-auth-state__card,
.qq-shell {
  border: 1px solid var(--app-border);
  border-radius: 22px;
  background: var(--app-surface-elevated);
}

.messages-auth-state__card {
  padding: 1.2rem;
}

.messages-auth-state__card h3,
.qq-group__header h3,
.qq-chat__empty-card h3 {
  color: var(--app-heading);
  font-size: 1.15rem;
  font-weight: 800;
}

.messages-auth-state__card p,
.qq-group__empty,
.qq-search-empty,
.qq-chat__copy small,
.qq-chat__empty-card p {
  margin-top: 0.45rem;
  color: var(--app-text-soft);
}

.qq-shell {
  display: grid;
  grid-template-columns: minmax(300px, 340px) minmax(0, 1fr);
  margin: 1rem;
  min-height: calc(100vh - 8.5rem);
  overflow: hidden;
}

.qq-sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--app-border);
  background: linear-gradient(180deg, rgba(248, 250, 255, 0.95), rgba(255, 255, 255, 0.88));
}

.qq-sidebar__top,
.qq-chat__header,
.qq-composer {
  padding: 1rem;
}

.qq-sidebar__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  border-bottom: 1px solid var(--app-border);
}

.qq-sidebar__identity,
.qq-chat__identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.qq-sidebar__avatar,
.qq-thread__avatar,
.qq-chat__avatar,
.qq-message__avatar,
.qq-chat__empty-avatar {
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #1d9bf0, #63b3ed);
  color: white;
  font-weight: 800;
  flex-shrink: 0;
}

.qq-sidebar__avatar,
.qq-chat__avatar {
  width: 2.9rem;
  height: 2.9rem;
}

.qq-thread__avatar {
  width: 2.8rem;
  height: 2.8rem;
}

.qq-thread__avatar-wrapper {
  position: relative;
}

.qq-thread__online,
.qq-chat__online {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0.65rem;
  height: 0.65rem;
  border: 2px solid white;
  border-radius: 50%;
  background: #a0a0a0;
  transition: background-color 160ms ease;
}

.qq-thread__online--active,
.qq-chat__online--active {
  background: #10b981;
}

.qq-message__avatar {
  width: 2rem;
  height: 2rem;
  font-size: 0.78rem;
}

.qq-chat__empty-avatar {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1rem;
  border-radius: 1.25rem;
}

.qq-sidebar__copy,
.qq-chat__copy {
  min-width: 0;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
}

.qq-sidebar__copy strong,
.qq-thread__meta strong,
.qq-chat__copy strong {
  color: var(--app-heading);
}

.qq-sidebar__copy small,
.qq-thread__meta small {
  color: var(--app-text-soft);
}

.qq-sidebar__copy strong,
.qq-sidebar__copy small,
.qq-chat__copy strong,
.qq-chat__copy small {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qq-sidebar__unread,
.qq-thread__badge {
  display: inline-grid;
  min-width: 1.45rem;
  height: 1.45rem;
  place-items: center;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: var(--app-accent);
  color: white;
  font-size: 0.72rem;
  font-weight: 800;
}

.qq-sidebar__toolbar {
  display: flex;
  gap: 0.6rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--app-border);
}

.qq-sidebar__search {
  flex: 1;
  min-width: 0;
  padding: 0.75rem 0.95rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--app-heading);
  outline: none;
}

.qq-sidebar__search:focus,
.qq-composer textarea:focus {
  border-color: rgba(29, 155, 240, 0.48);
  box-shadow: 0 0 0 4px rgba(29, 155, 240, 0.12);
  background: white;
}

.qq-sidebar__action {
  flex-shrink: 0;
  padding: 0.75rem 0.95rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--app-heading);
  font-weight: 700;
  cursor: pointer;
}

.qq-sidebar__action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.qq-sidebar__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0 1rem 0.85rem;
  color: var(--app-text-soft);
}

.qq-sidebar__summary strong {
  color: var(--app-heading);
}

.qq-sidebar__groups {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0 0.5rem 0.6rem;
  overflow-y: auto;
}

.qq-group {
  padding: 0.5rem;
  border-radius: 18px;
}

.qq-group:first-child {
  background: rgba(29, 155, 240, 0.06);
}

.qq-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.2rem 0.35rem 0.65rem;
}

.qq-group__header span {
  color: var(--app-text-soft);
  font-size: 0.8rem;
  font-weight: 700;
}

.qq-thread-stack {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.qq-thread {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.8rem;
  border: 1px solid transparent;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  text-align: left;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
}

.qq-thread:hover {
  transform: translateY(-1px);
  border-color: rgba(29, 155, 240, 0.16);
  box-shadow: 0 10px 22px rgba(15, 20, 25, 0.07);
}

.qq-thread--active {
  border-color: rgba(29, 155, 240, 0.3);
  background: rgba(29, 155, 240, 0.08);
}

.qq-thread__body,
.qq-message__content {
  min-width: 0;
  flex: 1;
}

.qq-thread__meta,
.qq-thread__subline,
.qq-thread__preview,
.qq-chat__meta,
.qq-composer__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.qq-thread__subline {
  margin-top: 0.18rem;
}

.qq-thread__subline span {
  color: var(--app-text-soft);
  font-size: 0.82rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qq-thread__state,
.qq-chat__state {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-style: normal;
  font-weight: 800;
  white-space: nowrap;
}

.qq-thread__state--reply,
.qq-chat__state--reply {
  background: rgba(29, 155, 240, 0.14);
  color: var(--app-accent);
}

.qq-thread__state--pending,
.qq-chat__state--pending {
  background: rgba(255, 184, 76, 0.18);
  color: #9a6700;
}

.qq-thread__state--active,
.qq-chat__state--active {
  background: rgba(16, 185, 129, 0.16);
  color: #0f8a63;
}

.qq-thread__state--idle,
.qq-chat__state--idle {
  background: rgba(15, 20, 25, 0.06);
  color: var(--app-text-soft);
}

.qq-thread__preview {
  margin-top: 0.38rem;
  align-items: flex-start;
}

.qq-thread__preview p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--app-heading);
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.qq-group__empty,
.qq-search-empty {
  padding: 0.15rem 0.4rem 0.6rem;
}

.qq-chat {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 255, 0.92)),
    var(--app-surface-elevated);
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  direction: ltr;
}

.qq-chat__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--app-border);
}

.qq-chat__back {
  display: none;
  flex-shrink: 0;
  padding: 0.45rem 0.8rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--app-heading);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.qq-chat__meta {
  flex-direction: column;
  align-items: flex-end;
}

.qq-chat__meta small,
.qq-message__time,
.qq-composer__meta small,
.qq-composer__status {
  color: var(--app-text-soft);
}

.qq-chat__avatar-wrapper {
  position: relative;
}

.qq-chat__status-text {
  font-size: 0.78rem !important;
}

.qq-chat__typing-indicator {
  min-height: 1.25rem;
  padding: 0 1rem;
  color: var(--app-text-soft);
  font-size: 0.82rem;
  font-weight: 500;
}

.qq-chat__history {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  overflow-y: auto;
  background:
    linear-gradient(rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.75)),
    linear-gradient(90deg, rgba(29, 155, 240, 0.03) 1px, transparent 1px),
    linear-gradient(rgba(29, 155, 240, 0.03) 1px, transparent 1px);
  background-size: auto, 24px 24px, 24px 24px;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  direction: ltr;
}

.qq-chat__date-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin: 0.5rem 0;
  color: var(--app-text-soft);
  font-size: 0.78rem;
  font-weight: 700;
}

.qq-chat__date-divider::before,
.qq-chat__date-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--app-border);
}

.qq-chat__divider,
.qq-chat__unread-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--app-text-soft);
  font-size: 0.8rem;
  font-weight: 700;
  margin: 0.5rem 0;
}

.qq-chat__divider::before,
.qq-chat__divider::after,
.qq-chat__unread-divider::before,
.qq-chat__unread-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--app-border);
}

.qq-chat__unread-divider {
  color: var(--app-accent);
}

.qq-message-row {
  display: flex;
  align-items: flex-end;
  gap: 0.6rem;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  direction: ltr;
  unicode-bidi: plaintext;
}

.qq-message-row--mine {
  justify-content: flex-end;
}

.qq-message-avatar {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
}

.qq-message-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-start;
  min-width: 0;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  direction: ltr;
  unicode-bidi: plaintext;
}

.qq-message-row--mine .qq-message-group {
  align-items: flex-end;
}

.qq-message-sender {
  color: var(--app-text-soft);
  font-size: 0.78rem;
  font-weight: 600;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  direction: ltr;
}

.qq-message-bubble {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  width: fit-content;
  max-width: min(34rem, 78%);
  padding: 0.85rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 0.35rem 1.15rem 1.15rem 1.15rem;
  background: white;
  color: var(--app-heading);
  writing-mode: horizontal-tb !important;
  text-orientation: mixed !important;
  direction: ltr !important;
  unicode-bidi: plaintext;
  line-height: 1.55;
}

.qq-message-bubble--mine {
  border-color: rgba(29, 155, 240, 0.2);
  border-radius: 1.15rem 0.35rem 1.15rem 1.15rem;
  background: rgba(29, 155, 240, 0.12);
  align-self: flex-end;
}

.qq-message-bubble p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: normal;
  writing-mode: horizontal-tb !important;
  text-orientation: mixed !important;
  direction: ltr !important;
  unicode-bidi: plaintext;
  width: 100%;
}

.qq-message-time {
  color: var(--app-text-soft);
  font-size: 0.74rem;
  margin-top: 0.28rem;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  direction: ltr;
  unicode-bidi: plaintext;
}

.qq-message {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
}

.qq-message--mine {
  justify-content: flex-end;
}

.qq-chat__empty {
  display: grid;
  flex: 1;
  place-items: center;
  padding: 1.2rem;
}

.qq-chat__empty-card {
  width: min(24rem, 100%);
  padding: 2rem 1.4rem;
  border: 1px dashed rgba(15, 20, 25, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
  text-align: center;
}

.qq-composer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 1px solid var(--app-border);
  background: rgba(255, 255, 255, 0.92);
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  direction: ltr;
}

.qq-composer > div:not(.qq-composer__field) {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
}

.qq-composer__field {
  flex: 1;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  direction: ltr;
  unicode-bidi: plaintext;
}

.qq-composer textarea {
  width: 100%;
  min-height: 5.5rem;
  max-height: 15rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--app-heading);
  line-height: 1.5;
  outline: none;
  resize: none;
  overflow-y: auto;
  overflow-wrap: anywhere;
  word-break: break-word;
  writing-mode: horizontal-tb !important;
  text-orientation: mixed !important;
  direction: ltr !important;
  unicode-bidi: plaintext;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.qq-chat,
.qq-chat__header,
.qq-chat__history,
.qq-chat__date-divider,
.qq-chat__unread-divider,
.qq-chat__empty,
.qq-chat__empty-card,
.qq-message-row,
.qq-message-group,
.qq-message-sender,
.qq-message-bubble,
.qq-message-bubble p,
.qq-message-time,
.qq-composer,
.qq-composer__field,
.qq-composer__meta,
.qq-composer__hint,
.qq-composer__count,
.qq-composer__status {
  writing-mode: horizontal-tb !important;
  text-orientation: mixed !important;
  direction: ltr !important;
  unicode-bidi: plaintext;
}

.qq-composer__meta {
  margin-top: 0.45rem;
}

.qq-composer__count--warning {
  color: #9a6700;
}

.qq-composer__status {
  display: block;
  margin-top: 0.35rem;
}

.qq-composer button {
  min-width: 6.2rem;
  padding: 0.9rem 1.25rem;
  border: none;
  border-radius: 999px;
  background: var(--app-accent);
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.qq-composer button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.status-banner {
  margin: 1rem 1rem 0;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(244, 33, 46, 0.16);
  border-radius: 12px;
  background: rgba(244, 33, 46, 0.08);
  color: var(--app-danger);
}

@media (max-width: 980px) {
  .qq-shell {
    grid-template-columns: 1fr;
    min-height: calc(100vh - 9rem);
  }

  .qq-shell--chat-open .qq-sidebar {
    display: none;
  }

  .qq-shell:not(.qq-shell--chat-open) .qq-chat {
    display: none;
  }

  .qq-sidebar {
    border-right: none;
  }

  .qq-chat__back {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}

@media (max-width: 680px) {
  .messages-auth-state,
  .status-banner,
  .qq-shell {
    margin: 0.75rem;
  }

  .qq-shell {
    min-height: calc(100vh - 8.5rem);
  }

  .qq-sidebar__toolbar,
  .qq-chat__header,
  .qq-composer,
  .qq-composer__meta {
    flex-direction: column;
    align-items: stretch;
  }

  .qq-chat__meta {
    align-items: flex-start;
  }

  .qq-message__bubble {
    max-width: 100%;
  }
}
</style>
