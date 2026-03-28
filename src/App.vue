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
  async (nextUserId) => {
    if (!nextUserId) {
      messagesStore.stopRealtime()
      await messagesStore.loadMessages('')
      return
    }

    await messagesStore.loadMessages(nextUserId)
  },
  { immediate: true }
)

onMounted(async () => {
  await authStore.loadCurrentUser()
})
</script>
