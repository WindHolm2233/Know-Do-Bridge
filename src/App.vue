<template>
  <router-view />
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
let preloadHandle = null

const cancelIdlePreload = () => {
  if (typeof window === 'undefined' || preloadHandle === null) {
    preloadHandle = null
    return
  }

  if (typeof preloadHandle === 'number') {
    window.clearTimeout(preloadHandle)
  } else if (typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(preloadHandle)
  }

  preloadHandle = null
}

const scheduleMessagePreload = (currentUserId) => {
  cancelIdlePreload()

  if (!currentUserId || typeof window === 'undefined') {
    return
  }

  const preload = async () => {
    const { useMessagesStore } = await import('@/stores/messages')

    if (authStore.currentUser?.id !== currentUserId) {
      return
    }

    const messagesStore = useMessagesStore()
    messagesStore.hydrateMessages(currentUserId)
  }

  if (typeof window.requestIdleCallback === 'function') {
    preloadHandle = window.requestIdleCallback(() => {
      preloadHandle = null
      void preload()
    }, { timeout: 1600 })
    return
  }

  preloadHandle = window.setTimeout(() => {
    preloadHandle = null
    void preload()
  }, 280)
}

watch(
  () => authStore.currentUser?.id,
  (nextUserId) => {
    scheduleMessagePreload(nextUserId)
  },
  { immediate: true }
)

onMounted(() => {
  authStore.loadCurrentUser()
})

onUnmounted(() => {
  cancelIdlePreload()
})
</script>
