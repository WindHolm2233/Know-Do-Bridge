<template>
  <section class="post-box">
    <div class="post-box__row">
      <div class="author-badge">{{ currentUser?.avatar || 'Y' }}</div>

      <div class="post-box__main">
        <textarea
          v-model="form.content"
          class="post-input"
          rows="3"
          maxlength="280"
          :placeholder="uiStore.t('postPlaceholder')"
        />

        <div class="post-box__footer">
          <div class="post-meta">
            <span>
              {{
                currentUser
                  ? `${uiStore.t('currentIdentity')}: ${currentUser.name} - ${currentUser.role}`
                  : uiStore.t('setIdentity')
              }}
            </span>
            <small>{{ remaining }} {{ uiStore.t('charsLeft') }}</small>
          </div>

          <div class="post-actions">
            <input
              v-model="form.topic"
              class="topic-input"
              maxlength="18"
              :placeholder="uiStore.t('topic')"
            />
            <button
              class="btn-publish"
              :disabled="submitting || !currentUser || !form.content.trim()"
              @click="handlePublish"
            >
              {{ submitting ? uiStore.t('posting') : uiStore.t('postButton') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useUiStore } from '@/stores/ui'

const props = defineProps({
  currentUser: {
    type: Object,
    default: null
  },
  submitting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['publish'])
const uiStore = useUiStore()

const form = reactive({
  content: '',
  topic: uiStore.t('defaultTopic')
})

const remaining = computed(() => 280 - form.content.length)

const handlePublish = () => {
  const content = form.content.trim()

  if (!content || !props.currentUser) {
    return
  }

  emit('publish', {
    authorId: props.currentUser.id,
    author: props.currentUser.name,
    role: props.currentUser.role,
    content,
    topic: form.topic.trim() || uiStore.t('defaultTopic')
  })

  form.content = ''
  form.topic = uiStore.t('defaultTopic')
}
</script>

<style scoped>
.post-box {
  padding: 1rem 1.1rem;
  border-bottom: 1px solid var(--app-border);
}

.post-box__row {
  display: flex;
  gap: 0.9rem;
}

.author-badge {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #8ba6ff, #6bc9ff);
  color: white;
  font-weight: 700;
}

.post-box__main {
  flex: 1;
}

.post-input {
  width: 100%;
  min-height: 5.4rem;
  padding: 0.35rem 0;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--app-heading);
  font-size: 1.18rem;
}

.post-input::placeholder {
  color: var(--app-text-soft);
}

.post-box__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--app-border);
}

.post-meta {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.post-meta span {
  color: var(--app-heading);
  font-size: 0.92rem;
}

.post-meta small {
  color: var(--app-text-soft);
}

.post-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.topic-input {
  width: 7.5rem;
  padding: 0.58rem 0.8rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  outline: none;
  background: rgba(255, 255, 255, 0.7);
  color: var(--app-heading);
}

.btn-publish {
  padding: 0.65rem 1.2rem;
  border: none;
  border-radius: 999px;
  background: var(--app-accent);
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.btn-publish:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 680px) {
  .post-box__footer,
  .post-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .topic-input,
  .btn-publish {
    width: 100%;
  }
}
</style>
