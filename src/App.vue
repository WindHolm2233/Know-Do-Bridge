<template>
  <router-view />
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'

const authStore = useAuthStore()
const messagesStore = useMessagesStore()

watch(
  () => authStore.currentUser?.id,
  (nextUserId) => {
    if (!nextUserId) {
      messagesStore.stopRealtime()
      messagesStore.hydrateMessages('')
      return
    }

    messagesStore.hydrateMessages(nextUserId)
  },
  { immediate: true }
)

onMounted(() => {
  authStore.loadCurrentUser()
})
</script>
