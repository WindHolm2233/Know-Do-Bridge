<template>
  <div v-if="userStar" class="achievement-card">
    <div :class="['card-container', `card-${userStar.tier}`]">
      <!-- 星级徽章 -->
      <div class="star-badge">
        <span class="star-icon">{{ userStar.tierIcon }}</span>
        <span class="star-tier">{{ userStar.tierLabel }}</span>
      </div>

      <!-- 证书内容 -->
      <div class="certificate">
        <h2>{{ uiStore.t('knowDoStarTitle') }}</h2>
        <p class="certificate-title">{{ uiStore.t('starCertificate') }}</p>

        <div class="certificate-body">
          <p class="recipient">{{ userStar.userName }}</p>
          <p class="certificate-text">{{ userStar.certificateText }}</p>
        </div>

        <!-- 成就徽章 -->
        <div v-if="userStar.badges.length > 0" class="achievement-badges">
          <div v-for="badge in userStar.badges" :key="badge.key" class="achievement-badge">
            <span class="badge-icon">{{ badge.icon }}</span>
            <div>
              <strong>{{ badge.zh }}</strong>
              <small>{{ badge.description_zh }}</small>
            </div>
          </div>
        </div>

        <!-- 统计数据 -->
        <div class="stats-summary">
          <div class="stat-box">
            <span class="stat-number">{{ userStar.crossGradeResponseCount }}</span>
            <span class="stat-label">{{ uiStore.t('crossGradeInteractions') }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-number">{{ userStar.experienceShareCount }}</span>
            <span class="stat-label">{{ uiStore.t('experienceShares') }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-number">{{ userStar.engagementRate }}%</span>
            <span class="stat-label">{{ uiStore.t('engagementRate') }}</span>
          </div>
        </div>

        <!-- 签署 -->
        <div class="certificate-signature">
          <p>知行桥社区</p>
          <p class="signature-date">{{ formatDate(new Date()) }}</p>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="card-actions">
        <button class="action-btn action-btn--share" @click="handleShare">
          📱 {{ $t('share') || 'Share' }}
        </button>
        <button class="action-btn action-btn--download" @click="handleDownloadCertificate">
          ⬇️ {{ $t('download') || 'Download' }}
        </button>
      </div>
    </div>
  </div>

  <!-- 未获奖状态 -->
  <div v-else class="no-achievement">
    <p class="no-achievement__icon">✨</p>
    <p class="no-achievement__text">{{ uiStore.t('knowDoStarSubtitle') }}</p>
    <p class="no-achievement__hint">
      继续积极参与跨年级互动、分享经验，有机会获得知行之星称号！
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'

const props = defineProps({
  userId: {
    type: String,
    required: true
  },
  userMetrics: {
    type: Object,
    default: null
  },
  userStar: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['share', 'download'])

const uiStore = useUiStore()

const formatDate = (date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

const handleShare = () => {
  const text = `我获得了知行桥社区的${props.userStar.tierLabel}！${props.userStar.certificateText}`

  if (navigator.share) {
    navigator.share({
      title: '知行之星证书',
      text: text
    })
  } else {
    // 降级方案：复制到剪贴板
    navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  }

  emit('share')
}

const handleDownloadCertificate = () => {
  // 触发证书下载逻辑
  emit('download')
}
</script>

<style scoped>
.achievement-card {
  padding: 2rem 1.5rem;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(59, 130, 246, 0.03));
  border-radius: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.card-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.1);
  transition: all 0.3s ease;
}

.card-container:hover {
  box-shadow: 0 15px 40px rgba(37, 99, 235, 0.15);
  transform: translateY(-2px);
}

.card-gold {
  border: 3px solid #fbbf24;
}

.card-silver {
  border: 3px solid #d1d5db;
}

.card-bronze {
  border: 3px solid #f97316;
}

.star-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--app-primary), #60a5fa);
  color: white;
}

.star-icon {
  font-size: 2.5rem;
}

.star-tier {
  font-size: 1.3rem;
  font-weight: 900;
}

.certificate {
  padding: 2.5rem 2rem;
  text-align: center;
}

.certificate h2 {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--app-heading);
  margin-bottom: 0.5rem;
  letter-spacing: 1px;
}

.certificate-title {
  color: var(--app-primary);
  font-weight: 700;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 1.5rem;
}

.certificate-body {
  margin: 2rem 0;
  padding: 1.5rem;
  border: 2px solid rgba(37, 99, 235, 0.2);
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.02);
}

.recipient {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--app-heading);
  margin-bottom: 1rem;
}

.certificate-text {
  color: var(--app-text);
  font-size: 0.95rem;
  line-height: 1.8;
  font-style: italic;
}

.achievement-badges {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}

.achievement-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(37, 99, 235, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(37, 99, 235, 0.1);
}

.badge-icon {
  font-size: 2rem;
}

.achievement-badge strong {
  color: var(--app-heading);
  font-size: 0.85rem;
  text-align: center;
}

.achievement-badge small {
  color: var(--app-text-soft);
  font-size: 0.75rem;
  text-align: center;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.05), transparent);
  border-radius: 8px;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--app-primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--app-text-soft);
  text-align: center;
  margin-top: 0.3rem;
}

.certificate-signature {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid rgba(37, 99, 235, 0.1);
}

.certificate-signature p {
  color: var(--app-text);
  font-size: 0.9rem;
}

.certificate-signature p:first-child {
  font-weight: 700;
  margin-bottom: 0.3rem;
}

.signature-date {
  color: var(--app-text-soft);
  font-size: 0.8rem;
}

.card-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding: 1.5rem 2rem;
  background: rgba(37, 99, 235, 0.02);
  border-top: 1px solid rgba(37, 99, 235, 0.1);
}

.action-btn {
  padding: 0.8rem 1rem;
  border: 1.5px solid var(--app-primary);
  border-radius: 8px;
  background: white;
  color: var(--app-primary);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.action-btn:hover {
  background: var(--app-accent-soft);
  transform: translateY(-2px);
}

.action-btn--share {
  border-color: var(--app-primary);
}

.action-btn--download {
  border-color: var(--app-success, #10b981);
  color: var(--app-success, #10b981);
}

.action-btn--download:hover {
  background: rgba(16, 185, 129, 0.1);
}

.no-achievement {
  text-align: center;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(59, 130, 246, 0.03));
  border-radius: 12px;
}

.no-achievement__icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.no-achievement__text {
  color: var(--app-heading);
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.no-achievement__hint {
  color: var(--app-text-soft);
  font-size: 0.9rem;
  line-height: 1.6;
}

@media (max-width: 600px) {
  .achievement-card {
    padding: 1rem;
  }

  .certificate {
    padding: 1.5rem 1rem;
  }

  .stats-summary {
    grid-template-columns: 1fr;
    gap: 0.8rem;
  }

  .achievement-badges {
    grid-template-columns: repeat(2, 1fr);
  }

  .card-actions {
    grid-template-columns: 1fr;
  }
}
</style>
