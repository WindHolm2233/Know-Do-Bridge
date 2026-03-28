import { onMounted, onUnmounted } from 'vue'

export const useSocialViewLifecycle = (socialStore) => {
  onMounted(async () => {
    await socialStore.loadInitialPosts()
    socialStore.startRealtime()
  })

  onUnmounted(() => {
    socialStore.stopRealtime()
  })
}
