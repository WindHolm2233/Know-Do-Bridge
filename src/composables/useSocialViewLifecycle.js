import { onMounted, onUnmounted } from 'vue'

const REALTIME_STOP_DELAY_MS = 8000
let activeConsumers = 0
let sharedStopTimer = null

export const useSocialViewLifecycle = (socialStore) => {
  let idleHandle = null

  const clearSharedStopTimer = () => {
    if (typeof window !== 'undefined' && sharedStopTimer) {
      window.clearTimeout(sharedStopTimer)
    }

    sharedStopTimer = null
  }

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
    activeConsumers += 1
    clearSharedStopTimer()
    await socialStore.loadInitialPosts()
    scheduleRealtimeStart()
  })

  onUnmounted(() => {
    activeConsumers = Math.max(0, activeConsumers - 1)
    cancelScheduledRealtime()

    if (activeConsumers > 0) {
      return
    }

    if (typeof window === 'undefined') {
      socialStore.stopRealtime()
      return
    }

    clearSharedStopTimer()
    sharedStopTimer = window.setTimeout(() => {
      if (activeConsumers === 0) {
        socialStore.stopRealtime()
      }
      sharedStopTimer = null
    }, REALTIME_STOP_DELAY_MS)
  })
}
