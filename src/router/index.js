import { createRouter, createWebHistory } from 'vue-router'

const HomeView = () => import('../views/HomeView.vue')
const ExploreView = () => import('../views/ExploreView.vue')
const NotificationsView = () => import('../views/NotificationsView.vue')
const MessagesView = () => import('../views/MessagesView.vue')
const ProfileView = () => import('../views/ProfileView.vue')
const PRELOAD_IDLE_TIMEOUT_MS = 1500

const routeComponentLoaders = new Map([
  ['/', HomeView],
  ['/explore', ExploreView],
  ['/notifications', NotificationsView],
  ['/messages', MessagesView],
  ['/profile', ProfileView],
  ['/profile/:userId', ProfileView]
])

const routeWarmupPlan = {
  '/': ['/explore', '/messages', '/notifications'],
  '/explore': ['/', '/messages', '/notifications'],
  '/notifications': ['/', '/messages'],
  '/messages': ['/profile', '/'],
  '/profile': ['/messages', '/']
}

const preloadedPaths = new Set()

const normalizePath = (path = '') => {
  if (path.startsWith('/profile/')) {
    return '/profile/:userId'
  }

  return path || '/'
}

const runWhenIdle = (callback, timeout = PRELOAD_IDLE_TIMEOUT_MS) => {
  if (typeof window === 'undefined') {
    callback()
    return
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => callback(), { timeout })
    return
  }

  window.setTimeout(() => callback(), 180)
}

export const preloadRouteComponent = async (path) => {
  const normalized = normalizePath(path)

  if (preloadedPaths.has(normalized)) {
    return
  }

  const loader = routeComponentLoaders.get(normalized)

  if (!loader) {
    return
  }

  preloadedPaths.add(normalized)

  try {
    await loader()
  } catch {
    preloadedPaths.delete(normalized)
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: {
        title: 'Campus Connect'
      }
    },
    {
      path: '/explore',
      name: 'explore',
      component: ExploreView
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: NotificationsView
    },
    {
      path: '/messages',
      name: 'messages',
      component: MessagesView
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView
    },
    {
      path: '/profile/:userId',
      name: 'profile-user',
      component: ProfileView
    }
  ]
})

export const setupRoutePreloadStrategy = (activeRouter) => {
  if (typeof window === 'undefined') {
    return
  }

  let preloadScheduled = false

  const schedulePreload = () => {
    if (preloadScheduled) {
      return
    }

    preloadScheduled = true

    runWhenIdle(async () => {
      preloadScheduled = false

      const currentPath = normalizePath(activeRouter.currentRoute.value.path)
      const plan = routeWarmupPlan[currentPath] || routeWarmupPlan['/']

      for (const path of plan) {
        await preloadRouteComponent(path)
      }
    })
  }

  activeRouter.isReady().then(schedulePreload)
  activeRouter.afterEach(() => {
    schedulePreload()
  })
}

export default router
