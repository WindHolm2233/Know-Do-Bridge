import { onMounted, onUnmounted } from 'vue'

export const useSocialViewLifecycle = (socialStore) => {
  let idleHandle = null

  const scheduleRealtimeStart = () => {
    if (typeof window === 'undefined') {
      socialStore.startRealtime()
      return
    }

    const start = () => socialStore.startRealtime()

    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(start, { timeout: 1400 })
    } else {
      idleHandle = window.setTimeout(start, 220)
    }
  }

  const cancelScheduledRealtime = () => {
    if (typeof window === 'undefined' || !idleHandle) {
      idleHandle = null
      return
    }

    if (typeof idleHandle === 'number') {
      window.clearTimeout(idleHandle)
    } else if (typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(idleHandle)
    }

    idleHandle = null
  }

  onMounted(async () => {
    await socialStore.loadInitialPosts()
    scheduleRealtimeStart()
  })

  onUnmounted(() => {
    cancelScheduledRealtime()
    socialStore.stopRealtime()
  })
}
