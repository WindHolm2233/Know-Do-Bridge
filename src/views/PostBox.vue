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

        <div class="assistant-card" :class="{ 'assistant-card--empty': !hasDraftContent }">
          <div class="assistant-card__header">
            <div>
              <p class="assistant-card__eyebrow">{{ uiStore.t('smartPostAssistantTitle') }}</p>
              <h3>{{ assistantHeading }}</h3>
            </div>
            <span class="assistant-card__score">{{ draftAnalysis?.impactScore || 0 }}%</span>
          </div>

          <p class="assistant-card__summary">
            {{ hasDraftContent ? draftAnalysis.reachHint : uiStore.t('smartPostAssistantEmpty') }}
          </p>

          <div v-if="hasDraftContent" class="assistant-meter" :aria-label="assistantMeterLabel">
            <span class="assistant-meter__fill" :style="{ width: `${draftAnalysis.impactScore}%` }"></span>
          </div>

          <div v-if="hasDraftContent" class="assistant-tags">
            <span class="assistant-tag assistant-tag--soft">
              {{ draftAnalysis.callToAction }}
            </span>
            <span class="assistant-tag">
              {{ draftAnalysis.gradeLabel || uiStore.t('smartPostAssistantAnyStage') }}
            </span>
          </div>

          <div v-if="hasDraftContent" class="assistant-topics">
            <button
              v-for="suggestion in draftAnalysis.topicSuggestions"
              :key="suggestion"
              type="button"
              class="assistant-topic"
              @click="applyTopic(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>

          <div v-if="hasDraftContent" class="assistant-hints">
            <span v-for="hint in draftAnalysis.coachHints" :key="hint" class="assistant-hint">
              {{ hint }}
            </span>
          </div>

          <button
            v-if="hasDraftContent && draftAnalysis.recommendedTopic !== form.topic.trim()"
            type="button"
            class="assistant-action"
            @click="applyTopic(draftAnalysis.recommendedTopic)"
          >
            {{ uiStore.t('smartPostAssistantUseTopic') }} {{ draftAnalysis.recommendedTopic }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { analyzeDraftPost } from '@/utils/recommendationEngine'
import { useUiStore } from '@/stores/ui'

const props = defineProps({
  currentUser: {
    type: Object,
    default: null
  },
  draftPreset: {
    type: String,
    default: ''
  },
  draftTopic: {
    type: String,
    default: ''
  },
  draftContent: {
    type: String,
    default: ''
  },
  submitting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['publish'])
const uiStore = useUiStore()

const draftTemplates = {
  team_request: {
    topic: '组队请求',
    content: '正在找队友/组队伙伴，欢迎私信或留言说明你的方向、时间和技能。'
  },
  club_recruitment: {
    topic: '社团招新',
    content: '欢迎分享社团招新信息、报名方式和活动亮点。'
  },
  exam_exchange: {
    topic: '考试资料交换',
    content: '这里可以交换考试资料、笔记和复习清单。'
  }
}

const resolveInitialDraft = () => {
  const template = draftTemplates[props.draftPreset] || {}

  return {
    content: props.draftContent.trim() || template.content || '',
    topic: props.draftTopic.trim() || template.topic || uiStore.t('defaultTopic')
  }
}

const form = reactive(resolveInitialDraft())

const remaining = computed(() => 280 - form.content.length)
const hasDraftContent = computed(() => Boolean(form.content.trim()))

const draftAnalysis = computed(() =>
  hasDraftContent.value
    ? analyzeDraftPost(form.content, form.topic, props.currentUser?.role, uiStore.locale)
    : null
)

const assistantHeading = computed(() =>
  hasDraftContent.value
    ? `${draftAnalysis.value?.postTypeLabel || uiStore.t('smartPostAssistantTitle')}`
    : uiStore.t('smartPostAssistantHint')
)

const assistantMeterLabel = computed(() =>
  hasDraftContent.value
    ? `${draftAnalysis.value?.impactScore || 0}% ${uiStore.t('smartPostAssistantImpact')}`
    : uiStore.t('smartPostAssistantHint')
)

const applyTopic = (topic) => {
  form.topic = topic.trim()
}

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

.assistant-card {
  margin-top: 0.9rem;
  padding: 0.95rem 1rem 1rem;
  border: 1px solid rgba(79, 105, 206, 0.14);
  border-radius: 18px;
  background:
    radial-gradient(circle at top right, rgba(107, 201, 255, 0.14), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(245, 249, 255, 0.92));
}

.assistant-card--empty {
  border-style: dashed;
  background: rgba(255, 255, 255, 0.72);
}

.assistant-card__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 0.75rem;
}

.assistant-card__eyebrow {
  color: var(--app-accent);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.assistant-card h3 {
  margin-top: 0.15rem;
  color: var(--app-heading);
  font-size: 1rem;
  font-weight: 800;
}

.assistant-card__score {
  flex-shrink: 0;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  background: rgba(79, 105, 206, 0.1);
  color: var(--app-primary);
  font-size: 0.85rem;
  font-weight: 800;
}

.assistant-card__summary {
  margin-top: 0.55rem;
  color: var(--app-text-soft);
  line-height: 1.55;
}

.assistant-meter {
  height: 0.5rem;
  margin-top: 0.8rem;
  border-radius: 999px;
  background: rgba(79, 105, 206, 0.12);
  overflow: hidden;
}

.assistant-meter__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4f69ce, #6bc9ff);
  transition: width 180ms ease;
}

.assistant-tags,
.assistant-topics,
.assistant-hints {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.85rem;
}

.assistant-tag,
.assistant-hint,
.assistant-topic {
  border-radius: 999px;
  font-size: 0.88rem;
}

.assistant-tag {
  padding: 0.45rem 0.7rem;
  background: white;
  color: var(--app-heading);
  border: 1px solid var(--app-border);
  font-weight: 700;
}

.assistant-tag--soft {
  background: rgba(79, 105, 206, 0.08);
  border-color: rgba(79, 105, 206, 0.12);
  color: var(--app-primary-dark);
}

.assistant-topic {
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(79, 105, 206, 0.16);
  background: rgba(255, 255, 255, 0.9);
  color: var(--app-heading);
  cursor: pointer;
}

.assistant-topic:hover,
.assistant-action:hover {
  transform: translateY(-1px);
}

.assistant-hint {
  padding: 0.45rem 0.7rem;
  background: rgba(255, 255, 255, 0.75);
  color: var(--app-text-soft);
  border: 1px solid rgba(79, 105, 206, 0.08);
}

.assistant-action {
  margin-top: 0.85rem;
  padding: 0.65rem 0.95rem;
  border: none;
  border-radius: 999px;
  background: var(--app-primary);
  color: white;
  font-weight: 700;
  cursor: pointer;
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

  .assistant-card__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
