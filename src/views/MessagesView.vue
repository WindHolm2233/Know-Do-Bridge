<template>
<AppShellLayout :current-user="authStore.currentUser">
  <AppHeader :title="uiStore.t('messagesTitle')" :subtitle="uiStore.t('messagesSubtitle')" :is-live="messagesStore.isRealtimeActive" />
  <section v-if="!authStore.currentUser" class="messages-auth-state"><div class="messages-auth-state__card"><h3>{{ uiStore.t('messagesSignInTitle') }}</h3><p>{{ uiStore.t('messagesSignInText') }}</p></div></section>
  <template v-else>
    <p v-if="pageError" class="status-banner status-banner--error">{{ pageError }}</p>
    <section :class="['qq-shell', { 'qq-shell--chat-open': mobilePane === 'chat' }]">
      <aside class="qq-sidebar">
        <div class="qq-sidebar__top">
          <div class="qq-sidebar__identity"><div class="qq-sidebar__avatar">{{ currentUserAvatar }}</div><div class="qq-sidebar__copy"><strong>{{ authStore.currentUser.name }}</strong><small>{{ authStore.currentUser.role }}</small></div></div>
          <div v-if="unreadThreadCount" class="qq-sidebar__unread">{{ unreadThreadCount }}</div>
        </div>
        <div class="qq-sidebar__toolbar">
          <input v-model="threadSearch" class="qq-sidebar__search" type="search" :placeholder="uiStore.t('messagesSearchPlaceholder')" />
          <button type="button" class="qq-sidebar__action" :disabled="!unreadThreadCount" @click="handleMarkAllRead">{{ uiStore.t('messagesMarkAllRead') }}</button>
        </div>
        <div class="qq-sidebar__summary"><span>{{ allChatsTitle }}</span><strong>{{ flatThreads.length }}</strong></div>
        <div class="qq-sidebar__groups">
          <div v-if="flatThreads.length" class="qq-thread-stack">
            <button v-for="thread in flatThreads" :key="thread.id" :class="['qq-thread', { 'qq-thread--active': activeThreadId === thread.id }]" type="button" @click="selectThread(thread.id, { focusChat: true })">
              <div class="qq-thread__avatar">{{ thread.counterpart.avatar }}</div>
              <div class="qq-thread__body"><div class="qq-thread__meta"><strong>{{ thread.counterpart.name }}</strong><small>{{ formatThreadTime(thread.latestMessage.createdAt) }}</small></div><div class="qq-thread__preview"><p>{{ buildThreadPreview(thread) }}</p><span v-if="thread.unreadCount" class="qq-thread__badge">{{ thread.unreadCount }}</span></div></div>
            </button>
          </div>
          <p v-else-if="showSearchEmpty" class="qq-search-empty">{{ uiStore.t('messagesSearchEmpty') }}</p>
          <p v-else class="qq-group__empty">{{ uiStore.t('messagesNoChats') }}</p>
        </div>
      </aside>
      <section class="qq-chat">
        <div v-if="chatTarget" class="qq-chat__header">
          <div class="qq-chat__identity">
            <button type="button" class="qq-chat__back" @click="showThreadsPane">{{ mobileThreadLabel }}</button>
            <div class="qq-chat__avatar">{{ chatTarget.avatar }}</div>
            <div class="qq-chat__copy"><strong>{{ chatTarget.name }}</strong><small>{{ chatTarget.role }}</small></div>
          </div>
          <div class="qq-chat__meta"><small v-if="selectedThread?.latestMessage?.createdAt">{{ formatMessageTime(selectedThread.latestMessage.createdAt) }}</small></div>
        </div>
        <div v-if="selectedThread" ref="chatHistoryRef" class="qq-chat__history">
          <button
            v-if="hiddenMessageCount"
            type="button"
            class="qq-chat__load-older"
            @click="loadOlderMessages"
          >
            {{ loadOlderMessagesText }}
          </button>
          <template v-for="group in groupedMessages" :key="group.key">
            <div class="qq-chat__date-divider"><span>{{ formatDateLabel(group.key) }}</span></div>
            <template v-for="(message, idx) in group.messages" :key="message.id">
              <div v-if="shouldShowUnreadDivider(message.id)" class="qq-chat__unread-divider"><span>{{ uiStore.t('messagesUnreadDivider') }}</span></div>
              <div :class="messageRowClass(message, idx, group.messages)">
                <div v-if="message.senderId !== authStore.currentUser.id" :class="messageAvatarClass(message, idx, group.messages)">{{ message.senderName.slice(0, 1).toUpperCase() }}</div>
                <div v-else :class="['qq-message-avatar', 'qq-message-avatar--spacer', { 'qq-message-avatar--hidden': isSameSenderAsNext(message, idx, group.messages) }]"></div>
                <div class="qq-message-group">
                  <div v-if="shouldShowSenderInfo(message, idx, group.messages)" class="qq-message-sender">{{ message.senderName }}</div>
                  <article :class="messageBubbleClass(message, idx, group.messages)">
                    <p>{{ message.content }}</p><small class="qq-message-time">{{ formatClockTime(message.createdAt) }}</small>
                  </article>
                </div>
              </div>
            </template>
          </template>
        </div>
        <div v-else class="qq-chat__empty"><div class="qq-chat__empty-card"><div class="qq-chat__empty-avatar">{{ chatTarget ? chatTarget.avatar : '...' }}</div><h3>{{ chatTarget ? uiStore.t('messagesGreetTitle') : uiStore.t('messagesChooseTitle') }}</h3><p>{{ chatTarget ? uiStore.t('messagesGreetText') : uiStore.t('messagesChooseText') }}</p></div></div>
        <div v-if="chatTarget" class="qq-composer">
          <div class="qq-composer__field">
            <textarea ref="composerTextareaRef" v-model="draft" rows="3" :maxlength="MESSAGE_CHARACTER_LIMIT" :placeholder="uiStore.t('messagesInputPlaceholder')" @input="handleDraftInput" @keydown="handleComposerKeydown" />
            <div class="qq-composer__meta"><small>{{ composerHint }}</small><small :class="['qq-composer__count', { 'qq-composer__count--warning': draftRemaining <= 60 }]">{{ draftLength }}/{{ MESSAGE_CHARACTER_LIMIT }}</small></div>
            <small v-if="messagesStore.sending" class="qq-composer__status">{{ sendingText }}</small>
          </div>
          <button type="button" :disabled="messagesStore.sending || !draft.trim()" @click="handleSend">{{ messagesStore.sending ? uiStore.t('sending') : uiStore.t('send') }}</button>
        </div>
      </section>
    </section>
  </template>
  <template #sidebar>
    <AuthPanel :current-user="authStore.currentUser" :error="authStore.error" :notice="authStore.notice" :using-supabase="authStore.usingSupabase" :pending-verification-email="authStore.pendingVerificationEmail" :resend-cooldown-seconds="authStore.verificationCooldownSeconds" :resending="authStore.resendingVerification" :submitting="authStore.submitting" @sign-in="authStore.signIn" @resend-verification="authStore.resendSignupConfirmation" @sign-out="authStore.signOut" />
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
const INITIAL_MESSAGE_RENDER_COUNT = 120
const MESSAGE_RENDER_STEP = 80
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
const visibleMessageCount = ref(INITIAL_MESSAGE_RENDER_COUNT)
const storedDrafts = ref(readStoredDrafts())
let writeDraftTimer = null
const threads = computed(() => authStore.currentUser ? messagesStore.getThreadsForUser(authStore.currentUser.id) : [])
const normalizedThreadSearch = computed(() => threadSearch.value.trim().toLowerCase())
const routeTarget = computed(() => {
  if (!route.query.userId || !route.query.name || !route.query.role || route.query.userId === authStore.currentUser?.id) return null
  return { id: String(route.query.userId), name: String(route.query.name), role: String(route.query.role), avatar: String(route.query.avatar || String(route.query.name).slice(0, 1).toUpperCase()) }
})
const flatThreads = computed(() => normalizedThreadSearch.value ? threads.value.filter((thread) => matchesThreadSearch(thread)) : threads.value)
const selectedThread = computed(() => threads.value.find((thread) => thread.id === activeThreadId.value) || null)
const visibleThreadMessages = computed(() => {
  const messages = selectedThread.value?.messages || []

  if (messages.length <= visibleMessageCount.value) {
    return messages
  }

  return messages.slice(-visibleMessageCount.value)
})
const hiddenMessageCount = computed(() =>
  Math.max(0, (selectedThread.value?.messages.length || 0) - visibleThreadMessages.value.length)
)
const groupedMessages = computed(() => groupMessagesByDate(visibleThreadMessages.value))
const chatTarget = computed(() => selectedThread.value?.counterpart || routeTarget.value)
const pageError = computed(() => messagesStore.error)
const unreadThreadCount = computed(() => authStore.currentUser ? messagesStore.getUnreadThreadCount(authStore.currentUser.id) : 0)
const showSearchEmpty = computed(() => Boolean(normalizedThreadSearch.value) && !flatThreads.value.length && threads.value.length > 0)
const draftLength = computed(() => draft.value.length)
const draftRemaining = computed(() => MESSAGE_CHARACTER_LIMIT - draftLength.value)
const sendingText = computed(() => uiStore.locale === 'zh' ? '\u6b63\u5728\u53d1\u9001...' : 'Sending...')
const mobileThreadLabel = computed(() => uiStore.locale === 'zh' ? '\u4f1a\u8bdd' : 'Chats')
const allChatsTitle = computed(() => uiStore.locale === 'zh' ? '\u5168\u90e8\u4f1a\u8bdd' : 'All chats')
const composerHint = computed(() => uiStore.locale === 'zh' ? 'Enter \u53d1\u9001\uff0cShift + Enter \u6362\u884c' : 'Press Enter to send, Shift + Enter for a new line')
const loadOlderMessagesText = computed(() =>
  uiStore.locale === 'zh'
    ? `\u52a0\u8f7d\u66f4\u65e9\u6d88\u606f (${hiddenMessageCount.value})`
    : `Load earlier messages (${hiddenMessageCount.value})`
)
const currentUserAvatar = computed(() => authStore.currentUser?.avatar || authStore.currentUser?.name?.slice(0, 1)?.toUpperCase() || 'U')
const currentDraftKey = computed(() => {
  if (!authStore.currentUser?.id) return ''
  if (selectedThread.value?.id) return `${authStore.currentUser.id}:${selectedThread.value.id}`
  if (routeTarget.value?.id) return `${authStore.currentUser.id}:${buildThreadId(authStore.currentUser.id, routeTarget.value.id)}`
  return ''
})
function buildThreadId(userA, userB) { return [userA, userB].sort().join(':') }
function readStoredDrafts() {
  if (typeof localStorage === 'undefined') return {}
  try { const saved = localStorage.getItem(MESSAGE_DRAFT_STORAGE_KEY); return saved ? JSON.parse(saved) || {} : {} } catch { return {} }
}
function writeStoredDrafts(value, { immediate = false } = {}) {
  if (typeof localStorage === 'undefined' || typeof window === 'undefined') return
  const persist = () => {
    try {
      localStorage.setItem(MESSAGE_DRAFT_STORAGE_KEY, JSON.stringify(value))
    } catch {
      // Ignore storage quota and serialization issues to keep composer responsive.
    }
  }

  if (immediate) {
    if (writeDraftTimer) {
      window.clearTimeout(writeDraftTimer)
      writeDraftTimer = null
    }
    persist()
    return
  }

  if (writeDraftTimer) {
    window.clearTimeout(writeDraftTimer)
  }

  writeDraftTimer = window.setTimeout(() => {
    writeDraftTimer = null
    persist()
  }, 220)
}
function groupMessagesByDate(messages) {
  const groups = []
  let current = null
  messages.forEach((message) => {
    const date = new Date(message.createdAt)
    const key = Number.isNaN(date.getTime()) ? String(message.createdAt) : date.toISOString().slice(0, 10)
    if (!current || current.key !== key) { current = { key, messages: [] }; groups.push(current) }
    current.messages.push(message)
  })
  return groups
}
function shouldShowSenderInfo(message, index, messages) { return message.senderId !== authStore.currentUser?.id && (index === 0 || messages[index - 1]?.senderId !== message.senderId) }
function isSameSenderAsPrev(message, index, messages) { return index > 0 && messages[index - 1]?.senderId === message.senderId }
function isSameSenderAsNext(message, index, messages) { return index < messages.length - 1 && messages[index + 1]?.senderId === message.senderId }
function messageRowClass(message, index, messages) {
  return [
    'qq-message-row',
    {
      'qq-message-row--mine': message.senderId === authStore.currentUser?.id,
      'qq-message-row--grouped': isSameSenderAsPrev(message, index, messages)
    }
  ]
}
function messageAvatarClass(message, index, messages) {
  return ['qq-message-avatar', { 'qq-message-avatar--hidden': isSameSenderAsNext(message, index, messages) }]
}
function messageBubbleClass(message, index, messages) {
  return [
    'qq-message-bubble',
    {
      'qq-message-bubble--mine': message.senderId === authStore.currentUser?.id,
      'qq-message-bubble--tail-hidden': isSameSenderAsNext(message, index, messages),
      'qq-message-bubble--compact': isSameSenderAsPrev(message, index, messages)
    }
  ]
}
function formatDateLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`); const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime(); const previousDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).getTime(); const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  if (targetDay === currentDay) return uiStore.locale === 'zh' ? '\u4eca\u5929' : 'Today'
  if (targetDay === previousDay) return uiStore.locale === 'zh' ? '\u6628\u5929' : 'Yesterday'
  return date.toLocaleDateString(uiStore.locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
}
function formatThreadTime(value) {
  const time = new Date(value); const delta = Date.now() - time.getTime(); const minute = 60000; const hour = 3600000; const day = 86400000
  if (delta < minute) return uiStore.t('now')
  if (delta < hour) return `${Math.floor(delta / minute)}m`
  if (delta < day) return `${Math.floor(delta / hour)}h`
  return time.toLocaleDateString(uiStore.locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })
}
function formatMessageTime(value) { return new Date(value).toLocaleString(uiStore.locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }
function formatClockTime(value) { return new Date(value).toLocaleTimeString(uiStore.locale === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' }) }
function buildThreadPreview(thread) { return thread.latestMessage.senderId === authStore.currentUser?.id ? `${uiStore.locale === 'zh' ? '\u6211: ' : 'You: '}${thread.latestMessage.content}` : thread.latestMessage.content }
function matchesThreadSearch(thread) { return [thread.counterpart.name, thread.counterpart.role, thread.latestMessage.content, thread.latestMessage.senderName].join(' ').toLowerCase().includes(normalizedThreadSearch.value) }
function getFirstUnreadMessageId(thread) {
  if (!thread?.lastReadAt || !authStore.currentUser?.id) return ''
  return thread.messages.find((message) => message.senderId !== authStore.currentUser.id && new Date(message.createdAt).getTime() > new Date(thread.lastReadAt).getTime())?.id || ''
}
async function scrollChatToBottom() { await nextTick(); if (selectedThread.value && chatHistoryRef.value) chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight }
function isChatNearBottom(threshold = 56) {
  if (!chatHistoryRef.value) return false
  const { scrollTop, clientHeight, scrollHeight } = chatHistoryRef.value
  return scrollTop + clientHeight >= scrollHeight - threshold
}
async function syncComposerHeight() { await nextTick(); if (composerTextareaRef.value) { composerTextareaRef.value.style.height = 'auto'; composerTextareaRef.value.style.height = `${Math.max(composerTextareaRef.value.scrollHeight, 104)}px` } }
function handleDraftInput() { void syncComposerHeight() }
function handleComposerKeydown(event) { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); void handleSend() } }
function showThreadsPane() { mobilePane.value = 'threads' }
async function loadOlderMessages() {
  if (!selectedThread.value || !hiddenMessageCount.value || !chatHistoryRef.value) return
  const previousHeight = chatHistoryRef.value.scrollHeight
  const previousTop = chatHistoryRef.value.scrollTop
  visibleMessageCount.value = Math.min(
    selectedThread.value.messages.length,
    visibleMessageCount.value + MESSAGE_RENDER_STEP
  )
  await nextTick()
  const nextHeight = chatHistoryRef.value.scrollHeight
  chatHistoryRef.value.scrollTop = previousTop + (nextHeight - previousHeight)
}
function selectThread(threadId, { focusChat = false } = {}) {
  const nextThread = threads.value.find((thread) => thread.id === threadId) || null
  if (!threadId) return
  visibleMessageCount.value = INITIAL_MESSAGE_RENDER_COUNT
  openedUnreadMessageId.value = getFirstUnreadMessageId(nextThread)
  activeThreadId.value = threadId
  if (focusChat) mobilePane.value = 'chat'
}
function shouldShowUnreadDivider(messageId) { return Boolean(openedUnreadMessageId.value) && openedUnreadMessageId.value === messageId }
function handleMarkAllRead() { if (authStore.currentUser?.id) { openedUnreadMessageId.value = ''; messagesStore.markAllThreadsRead(authStore.currentUser.id) } }
function syncActiveThread() {
  if (selectedThread.value) return
  if (routeTarget.value && authStore.currentUser?.id) {
    const matchedThread = threads.value.find((thread) => thread.counterpart.id === routeTarget.value.id)
    if (matchedThread?.id) { selectThread(matchedThread.id); return }
    activeThreadId.value = ''; openedUnreadMessageId.value = ''; return
  }
  const remembered = authStore.currentUser?.id ? messagesStore.getLastActiveThreadId(authStore.currentUser.id) : ''
  const unread = threads.value.find((thread) => thread.hasUnread)
  const nextId = unread?.id || (threads.value.some((thread) => thread.id === remembered) ? remembered : '') || threads.value[0]?.id || ''
  if (nextId) selectThread(nextId); else { activeThreadId.value = ''; openedUnreadMessageId.value = '' }
}
async function syncMessageSession(currentUserId) { if (!currentUserId) { messagesStore.stopRealtime(); await messagesStore.loadMessages(''); return } await messagesStore.loadMessages(currentUserId); messagesStore.startRealtime(currentUserId) }
watch(() => authStore.currentUser?.id, (currentUserId) => { void syncMessageSession(currentUserId) }, { immediate: true })
watch([threads, routeTarget], syncActiveThread, { immediate: true })
watch(routeTarget, (nextRouteTarget) => { if (nextRouteTarget) mobilePane.value = 'chat'; else if (!selectedThread.value) mobilePane.value = 'threads' }, { immediate: true })
watch(() => [authStore.currentUser?.id, selectedThread.value?.id, selectedThread.value?.latestMessage?.createdAt], ([currentUserId, threadId, latest]) => { if (currentUserId && threadId) { messagesStore.setLastActiveThread(currentUserId, threadId); messagesStore.markThreadRead(currentUserId, threadId, latest) } }, { immediate: true })
watch(currentDraftKey, (nextDraftKey) => {
  draft.value = nextDraftKey ? storedDrafts.value[nextDraftKey] || '' : ''
  void syncComposerHeight()
}, { immediate: true })
watch([currentDraftKey, draft], ([nextDraftKey, nextDraft]) => {
  if (!nextDraftKey) return
  const previous = storedDrafts.value[nextDraftKey] || ''
  if ((nextDraft.trim() && previous === nextDraft) || (!nextDraft.trim() && !previous)) return
  const nextStored = { ...storedDrafts.value }
  if (nextDraft.trim()) nextStored[nextDraftKey] = nextDraft; else delete nextStored[nextDraftKey]
  storedDrafts.value = nextStored; writeStoredDrafts(nextStored)
})
watch(
  () => [selectedThread.value?.id, selectedThread.value?.messages.length],
  ([nextThreadId], previous = []) => {
    const [prevThreadId] = previous
    if (nextThreadId !== prevThreadId || isChatNearBottom()) {
      void scrollChatToBottom()
    }
  },
  { immediate: true }
)
onUnmounted(() => {
  if (writeDraftTimer && typeof window !== 'undefined') {
    window.clearTimeout(writeDraftTimer)
    writeDraftTimer = null
  }
  writeStoredDrafts(storedDrafts.value, { immediate: true })
  messagesStore.stopRealtime()
})
async function handleSend() {
  if (!authStore.currentUser || !chatTarget.value || !draft.value.trim()) return
  const created = await messagesStore.sendMessage({ sender: authStore.currentUser, recipient: chatTarget.value, content: draft.value })
  if (!created) return
  if (currentDraftKey.value) { const nextStored = { ...storedDrafts.value }; delete nextStored[currentDraftKey.value]; storedDrafts.value = nextStored; writeStoredDrafts(nextStored) }
  draft.value = ''
  selectThread(buildThreadId(authStore.currentUser.id, chatTarget.value.id), { focusChat: true })
  await scrollChatToBottom()
  if (routeTarget.value) router.replace({ path: '/messages' })
}
</script>

<style scoped>
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
.qq-chat__empty-card h3 {
  color: var(--app-heading);
  font-size: 1.15rem;
  font-weight: 800;
}

.messages-auth-state__card p,
.qq-group__empty,
.qq-search-empty,
.qq-chat__copy small,
.qq-chat__empty-card p,
.qq-composer__meta small,
.qq-composer__status,
.qq-message-time,
.qq-message-sender,
.qq-thread__meta small,
.qq-sidebar__copy small,
.qq-sidebar__summary {
  color: var(--app-text-soft);
}

.status-banner {
  margin: 1rem 1rem 0;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(244, 33, 46, 0.16);
  border-radius: 12px;
  background: rgba(244, 33, 46, 0.08);
  color: var(--app-danger);
}

.qq-shell {
  display: grid;
  grid-template-columns: minmax(300px, 340px) minmax(0, 1fr);
  margin: 1rem;
  min-height: calc(100vh - 8.5rem);
  overflow: hidden;
}

.qq-shell,
.qq-shell * {
  writing-mode: horizontal-tb;
  text-orientation: mixed;
}

.qq-sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--app-border);
  background: linear-gradient(180deg, rgba(248, 250, 255, 0.98), rgba(255, 255, 255, 0.92));
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
  gap: 0.85rem;
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
.qq-chat__empty-avatar,
.qq-message-avatar {
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #1890ff, #6cb8ff);
  color: #fff;
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

.qq-message-avatar {
  width: 2rem;
  height: 2rem;
  font-size: 0.78rem;
  transition: opacity 140ms ease;
}

.qq-message-avatar--spacer {
  visibility: hidden;
}

.qq-message-avatar--hidden {
  opacity: 0;
}

.qq-sidebar__copy,
.qq-chat__copy,
.qq-thread__body,
.qq-message-group {
  min-width: 0;
}

.qq-sidebar__copy strong,
.qq-chat__copy strong,
.qq-thread__meta strong {
  display: block;
  color: var(--app-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qq-chat__status-text,
.qq-sidebar__copy small,
.qq-thread__meta small {
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
  background: #ff4d4f;
  color: #fff;
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
  border-color: rgba(24, 144, 255, 0.42);
  box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.12);
  background: #fff;
}

.qq-sidebar__action {
  flex-shrink: 0;
  padding: 0.75rem 0.95rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--app-heading);
  font-weight: 700;
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
  font-size: 0.86rem;
  font-weight: 700;
}

.qq-sidebar__summary strong {
  color: var(--app-heading);
}

.qq-sidebar__groups {
  flex: 1;
  padding: 0 0.55rem 0.65rem;
  overflow-y: auto;
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
  background: rgba(255, 255, 255, 0.94);
  text-align: left;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease,
    background-color 0.16s ease;
}

.qq-thread:hover {
  transform: translateY(-1px);
  border-color: rgba(24, 144, 255, 0.18);
  box-shadow: 0 10px 22px rgba(15, 20, 25, 0.07);
}

.qq-thread--active {
  border-color: rgba(24, 144, 255, 0.28);
  background: rgba(24, 144, 255, 0.08);
  box-shadow: 0 12px 24px rgba(24, 144, 255, 0.1);
}

.qq-thread__meta,
.qq-thread__preview,
.qq-chat__meta,
.qq-composer__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.qq-thread__preview {
  margin-top: 0.35rem;
  align-items: flex-start;
}

.qq-thread__preview p {
  margin: 0;
  color: var(--app-heading);
  line-height: 1.4;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  word-break: break-word;
}

.qq-group__empty,
.qq-search-empty {
  padding: 1rem 0.5rem;
}

.qq-chat {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 255, 0.94)),
    var(--app-surface-elevated);
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
}

.qq-chat__meta {
  flex-direction: column;
  align-items: flex-end;
}

.qq-chat__history {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  background: linear-gradient(rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.75)),
    linear-gradient(90deg, rgba(24, 144, 255, 0.03) 1px, transparent 1px),
    linear-gradient(rgba(24, 144, 255, 0.03) 1px, transparent 1px);
  background-size: auto, 24px 24px, 24px 24px;
}

.qq-chat__load-older {
  display: block;
  margin: 0 auto 0.9rem;
  padding: 0.5rem 0.85rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  color: var(--app-heading);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.qq-chat__date-divider,
.qq-chat__unread-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin: 0.7rem 0;
  color: var(--app-text-soft);
  font-size: 0.78rem;
  font-weight: 700;
}

.qq-chat__date-divider::before,
.qq-chat__date-divider::after,
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
  gap: 0.62rem;
  margin-top: 0.62rem;
}

.qq-message-row--grouped {
  margin-top: 0.26rem;
}

.qq-message-row--mine {
  justify-content: flex-end;
}

.qq-message-group {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  align-items: flex-start;
  max-width: min(36rem, 76%);
}

.qq-message-row--mine .qq-message-group {
  align-items: flex-end;
}

.qq-message-sender {
  font-size: 0.76rem;
  font-weight: 600;
}

.qq-message-bubble {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  width: fit-content;
  max-width: 100%;
  padding: 0.74rem 0.95rem 0.56rem;
  border: 1px solid rgba(15, 20, 25, 0.08);
  border-radius: 1.05rem;
  border-top-left-radius: 0.38rem;
  background: #fff;
  color: var(--app-heading);
  line-height: 1.56;
  box-shadow: 0 10px 22px rgba(15, 20, 25, 0.05);
  unicode-bidi: plaintext;
}

.qq-message-bubble::after {
  content: '';
  position: absolute;
  left: -0.36rem;
  bottom: 0.52rem;
  width: 0.62rem;
  height: 0.62rem;
  background: inherit;
  border-left: 1px solid rgba(15, 20, 25, 0.08);
  border-bottom: 1px solid rgba(15, 20, 25, 0.08);
  transform: rotate(45deg);
}

.qq-message-bubble--mine {
  align-items: flex-end;
  border-color: rgba(149, 236, 105, 0.55);
  border-radius: 1.05rem;
  border-top-right-radius: 0.38rem;
  background: #95ec69;
  box-shadow: 0 10px 22px rgba(115, 193, 79, 0.16);
}

.qq-message-bubble--mine::after {
  left: auto;
  right: -0.36rem;
  border-left: none;
  border-bottom: none;
  border-right: 1px solid rgba(106, 168, 77, 0.36);
  border-top: 1px solid rgba(106, 168, 77, 0.36);
}

.qq-message-bubble--compact {
  border-top-left-radius: 1.05rem;
  border-top-right-radius: 1.05rem;
}

.qq-message-bubble--tail-hidden::after {
  display: none;
}

.qq-message-bubble p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.qq-message-time {
  margin-top: 0.28rem;
  font-size: 0.7rem;
  line-height: 1;
  opacity: 0.78;
  align-self: flex-end;
}

.qq-message-bubble--mine .qq-message-time {
  color: rgba(25, 45, 10, 0.75);
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
  background: rgba(255, 255, 255, 0.88);
  text-align: center;
}

.qq-chat__empty-avatar {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1rem;
  border-radius: 1.2rem;
}

.qq-composer {
  display: flex;
  gap: 0.8rem;
  align-items: flex-end;
  border-top: 1px solid var(--app-border);
  background: rgba(255, 255, 255, 0.95);
}

.qq-composer__field {
  flex: 1;
  min-width: 0;
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
  word-break: break-word;
}

.qq-composer__meta {
  margin-top: 0.45rem;
}

.qq-composer__count--warning {
  color: #b67c24;
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
  background: linear-gradient(135deg, #1890ff, #51a8ff);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 12px 22px rgba(24, 144, 255, 0.18);
}

.qq-composer button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
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

  .qq-message-group {
    max-width: 100%;
  }

  .qq-message-bubble {
    max-width: 100%;
  }

  .qq-composer button {
    width: 100%;
  }
}
</style>
