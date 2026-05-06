import { computed } from 'vue'
import { preloadRouteComponent } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'
import { useUiStore } from '@/stores/ui'

const NAV_ICON_MAP = {
  '/': 'H',
  '/explore': '#',
  '/notifications': '!',
  '/messages': 'M',
  '/profile': 'P'
}

export const useAppNavigation = () => {
  const uiStore = useUiStore()
  const authStore = useAuthStore()
  const messagesStore = useMessagesStore()

  const unreadMessages = computed(() =>
    messagesStore.getUnreadThreadCount(authStore.currentUser?.id)
  )

  const navItems = computed(() => [
    { to: '/', label: uiStore.t('navHome'), icon: NAV_ICON_MAP['/'] },
    { to: '/explore', label: uiStore.t('navExplore'), icon: NAV_ICON_MAP['/explore'] },
    {
      to: '/notifications',
      label: uiStore.t('navNotifications'),
      icon: NAV_ICON_MAP['/notifications']
    },
    {
      to: '/messages',
      label: uiStore.t('navMessages'),
      icon: NAV_ICON_MAP['/messages'],
      badge: unreadMessages.value
    },
    { to: '/profile', label: uiStore.t('navProfile'), icon: NAV_ICON_MAP['/profile'] }
  ])

  const warmRoute = (path) => {
    void preloadRouteComponent(path)
  }

  return {
    navItems,
    warmRoute
  }
}
