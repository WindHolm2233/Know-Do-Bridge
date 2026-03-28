<template>
  <AppShellLayout :current-user="authStore.currentUser">
    <AppHeader
      :title="uiStore.t('profileTitle')"
      :subtitle="uiStore.t('profileSubtitle')"
      :is-live="socialStore.isRealtimeActive"
    />

    <section class="profile-hero">
      <div class="profile-hero__identity">
        <div class="profile-avatar">
          {{ profileAvatar }}
        </div>

        <div class="profile-copy">
          <p class="profile-eyebrow">
            {{ isOwnProfile ? uiStore.t('profileEyebrow') : uiStore.t('profileVisitorEyebrow') }}
          </p>
          <h1>{{ profileName }}</h1>
          <p>{{ profileRole }}</p>
          <small v-if="isOwnProfile && authStore.currentUser?.email">
            {{ authStore.currentUser.email }}
          </small>
        </div>
      </div>

      <div class="profile-actions">
        <button
          v-if="!isOwnProfile && targetProfile.id && authStore.currentUser"
          class="profile-chip profile-chip--button"
          type="button"
          @click="startChat"
        >
          {{ uiStore.t('profileChatAction') }}
        </button>
        <span class="profile-chip">{{ uiStore.t('profileModeLabel') }}: {{ dataModeLabel }}</span>
      </div>
    </section>

    <section class="stats-grid">
      <article v-for="item in stats" :key="item.label" class="stat-card">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
      </article>
    </section>

    <section class="profile-panel">
      <div class="section-head">
        <div>
          <h2>{{ uiStore.t('profilePostsTitle') }}</h2>
          <p>{{ uiStore.t('profilePostsText') }}</p>
        </div>
      </div>

      <div v-if="pageError" class="status-banner status-banner--error">
        {{ pageError }}
      </div>

      <div v-if="!targetProfile.name" class="empty-panel">
        <h3>{{ uiStore.t('profileEmptyTitle') }}</h3>
        <p>{{ uiStore.t('profileEmptyText') }}</p>
      </div>

      <PostFeed
        v-else
        :posts="userPosts"
        :loading="socialStore.loading"
        :commenting="socialStore.commenting"
        :deleting-post-id="socialStore.deletingPostId"
        :current-user="authStore.currentUser"
        @toggle-like="socialStore.likePost"
        @add-comment="handleComment"
        @delete-post="handleDeletePost"
      />
    </section>

    <template #sidebar>
      <AuthPanel
        :current-user="authStore.currentUser"
        :error="authStore.error"
        :notice="authStore.notice"
        :using-supabase="authStore.usingSupabase"
        :pending-verification-email="authStore.pendingVerificationEmail"
        :resend-cooldown-seconds="authStore.verificationCooldownSeconds"
        :resending="authStore.resendingVerification"
        :submitting="authStore.submitting"
        @sign-in="authStore.signIn"
        @resend-verification="authStore.resendSignupConfirmation"
        @sign-out="authStore.signOut"
      />

      <section class="profile-sidecard">
        <h3>{{ uiStore.t('profileAboutTitle') }}</h3>
        <p>{{ uiStore.t('profileAboutText') }}</p>

        <div class="side-list">
          <div class="side-item">
            <small>{{ uiStore.t('profileJoinedLabel') }}</small>
            <strong>{{ profileRole }}</strong>
          </div>
          <div class="side-item">
            <small>{{ uiStore.t('profileReactionsLabel') }}</small>
            <strong>{{ totalLikes }}</strong>
          </div>
          <div class="side-item">
            <small>{{ uiStore.t('profileCommentsLabel') }}</small>
            <strong>{{ totalComments }}</strong>
          </div>
        </div>
      </section>
    </template>
  </AppShellLayout>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from './AppHeader.vue'
import AppShellLayout from './AppShellLayout.vue'
import AuthPanel from './AuthPanel.vue'
import PostFeed from './PostFeed.vue'
import { useSocialViewLifecycle } from '@/composables/useSocialViewLifecycle'
import { useAuthStore } from '@/stores/auth'
import { useSocialStore } from '@/stores/social'
import { useUiStore } from '@/stores/ui'

const authStore = useAuthStore()
const socialStore = useSocialStore()
const uiStore = useUiStore()
const route = useRoute()
const router = useRouter()

useSocialViewLifecycle(socialStore)

const pageError = computed(() => socialStore.error)
const routeProfileId = computed(() => String(route.params.userId || ''))

const targetProfile = computed(() => {
  if (routeProfileId.value) {
    const matchedPost = socialStore.posts.find((post) => post.authorId === routeProfileId.value)

    if (matchedPost) {
      return {
        id: matchedPost.authorId,
        name: matchedPost.author,
        role: matchedPost.role,
        avatar: (matchedPost.author || 'U').slice(0, 1).toUpperCase()
      }
    }
  }

  if (route.query.name || route.query.role) {
    return {
      id: routeProfileId.value,
      name: String(route.query.name || ''),
      role: String(route.query.role || ''),
      avatar: String(route.query.avatar || String(route.query.name || 'U').slice(0, 1).toUpperCase())
    }
  }

  if (authStore.currentUser) {
    return {
      id: authStore.currentUser.id,
      name: authStore.currentUser.name,
      role: authStore.currentUser.role,
      avatar: authStore.currentUser.avatar
    }
  }

  return {
    id: '',
    name: '',
    role: '',
    avatar: 'P'
  }
})

const isOwnProfile = computed(
  () => !targetProfile.value.id || targetProfile.value.id === authStore.currentUser?.id
)

const userPosts = computed(() => {
  if (!targetProfile.value.name) {
    return []
  }

  return socialStore.posts.filter((post) =>
    targetProfile.value.id
      ? post.authorId === targetProfile.value.id
      : post.author === targetProfile.value.name && post.role === targetProfile.value.role
  )
})

const totalLikes = computed(() => userPosts.value.reduce((sum, post) => sum + post.likes, 0))
const totalComments = computed(() =>
  userPosts.value.reduce((sum, post) => sum + post.commentsCount, 0)
)

const stats = computed(() => [
  { label: uiStore.t('profilePostsTitle'), value: userPosts.value.length },
  { label: uiStore.t('profileReactionsLabel'), value: totalLikes.value },
  { label: uiStore.t('profileCommentsLabel'), value: totalComments.value }
])

const profileName = computed(() => targetProfile.value.name || uiStore.t('profileTitle'))
const profileRole = computed(() => targetProfile.value.role || uiStore.t('profileRoleFallback'))
const profileAvatar = computed(() => targetProfile.value.avatar || 'P')
const dataModeLabel = computed(() =>
  socialStore.usingSupabase ? uiStore.t('liveSupabase') : uiStore.t('mockMode')
)

const handleComment = async (postId, payload) => {
  await socialStore.commentOnPost(postId, payload)
}

const handleDeletePost = async (postId) => {
  await socialStore.removePost(postId, authStore.currentUser?.id)
}

const startChat = () => {
  if (!targetProfile.value.id) {
    return
  }

  router.push({
    path: '/messages',
    query: {
      userId: targetProfile.value.id,
      name: targetProfile.value.name,
      role: targetProfile.value.role,
      avatar: targetProfile.value.avatar
    }
  })
}
</script>

<style scoped>
.profile-hero,
.profile-panel,
.profile-sidecard {
  margin: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 20px;
  background: var(--app-surface-elevated);
}

.profile-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem;
  background:
    radial-gradient(circle at top right, rgba(107, 201, 255, 0.18), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 247, 255, 0.92));
}

.profile-hero__identity {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.profile-avatar {
  display: grid;
  place-items: center;
  width: 5rem;
  height: 5rem;
  border-radius: 1.6rem;
  background: linear-gradient(135deg, #4f69ce, #6bc9ff);
  color: white;
  font-size: 1.8rem;
  font-weight: 800;
  box-shadow: 0 20px 40px rgba(79, 105, 206, 0.22);
}

.profile-copy h1 {
  color: var(--app-heading);
  font-size: 1.7rem;
  font-weight: 800;
}

.profile-copy p,
.profile-copy small {
  color: var(--app-text-soft);
}

.profile-copy small {
  display: inline-block;
  margin-top: 0.35rem;
}

.profile-eyebrow {
  margin-bottom: 0.15rem;
  color: var(--app-accent);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.profile-chip {
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  background: white;
  color: var(--app-heading);
  font-size: 0.88rem;
  font-weight: 700;
}

.profile-chip--button {
  border: none;
  background: var(--app-accent);
  color: white;
  cursor: pointer;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
  margin: 0 1rem 1rem;
}

.stat-card {
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
}

.stat-card small {
  display: block;
  color: var(--app-text-soft);
}

.stat-card strong {
  display: block;
  margin-top: 0.3rem;
  color: var(--app-heading);
  font-size: 1.7rem;
  font-weight: 800;
}

.profile-panel {
  overflow: hidden;
}

.section-head {
  padding: 1.1rem 1.1rem 0.8rem;
  border-bottom: 1px solid var(--app-border);
}

.section-head h2,
.profile-sidecard h3,
.empty-panel h3 {
  color: var(--app-heading);
  font-weight: 800;
}

.section-head p,
.profile-sidecard p,
.empty-panel p {
  margin-top: 0.35rem;
  color: var(--app-text-soft);
}

.empty-panel {
  padding: 1.2rem 1.1rem 1.4rem;
}

.profile-sidecard {
  padding: 1rem;
  box-shadow: 0 18px 40px rgba(111, 135, 180, 0.08);
}

.side-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin-top: 1rem;
}

.side-item small {
  display: block;
  margin-bottom: 0.2rem;
  color: var(--app-text-soft);
}

.side-item strong {
  color: var(--app-heading);
}

.status-banner {
  margin: 1rem 1rem 0;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(216, 91, 115, 0.25);
  border-radius: 12px;
  background: rgba(216, 91, 115, 0.08);
  color: var(--app-danger);
}

@media (max-width: 680px) {
  .profile-hero,
  .profile-panel,
  .profile-sidecard {
    margin: 0.75rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    margin: 0 0.75rem 0.75rem;
  }

  .profile-hero__identity {
    align-items: flex-start;
    flex-direction: column;
  }

  .profile-avatar {
    width: 4.2rem;
    height: 4.2rem;
    font-size: 1.5rem;
  }
}
</style>
