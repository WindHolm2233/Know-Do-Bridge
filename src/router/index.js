import { createRouter, createWebHistory } from 'vue-router'

const HomeView = () => import('../views/HomeView.vue')
const ExploreView = () => import('../views/ExploreView.vue')
const NotificationsView = () => import('../views/NotificationsView.vue')
const MessagesView = () => import('../views/MessagesView.vue')
const ProfileView = () => import('../views/ProfileView.vue')

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

export default router
