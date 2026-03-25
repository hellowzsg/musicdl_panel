<script setup>
/**
 * 歌词搜索页
 * 输入歌曲名+歌手名 → 搜索歌词 → 展示+复制
 * 使用 TDesign 组件重构
 */
import { ref } from 'vue'
import { useGlobalStore } from '../stores/global'
import { api } from '../api'
import { SearchIcon, FileCopyIcon } from 'tdesign-icons-vue-next'

const store = useGlobalStore()

const trackName = ref('')
const artistName = ref('')
const loading = ref(false)
const lyric = ref('')
const lyricResult = ref(null)
const searched = ref(false)

async function handleSearch() {
  const track = trackName.value.trim()
  const artist = artistName.value.trim()
  if (!track || !artist) {
    store.addToast('请输入歌曲名和歌手名', 'warning')
    return
  }
  loading.value = true
  lyric.value = ''
  lyricResult.value = null
  searched.value = true
  try {
    const res = await api.searchLyrics({ track_name: track, artist_name: artist })
    if (res.success && res.data) {
      lyric.value = res.data.lyric || ''
      lyricResult.value = res.data.lyric_result || null
      if (!lyric.value) {
        store.addToast('未找到歌词', 'info')
      }
    } else {
      store.addToast(res.error || '搜索失败', 'error')
    }
  } catch (e) {
    store.addToast('搜索请求失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function copyLyric() {
  if (!lyric.value) return
  try {
    await navigator.clipboard.writeText(lyric.value)
    store.addToast('歌词已复制到剪贴板', 'success')
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = lyric.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    store.addToast('歌词已复制到剪贴板', 'success')
  }
}
</script>

<template>
  <div class="lyrics-page">
    <!-- 搜索表单 -->
    <t-card>
      <h2 class="page-title">📝 歌词搜索</h2>
      <p class="text-sm text-secondary mt-2 mb-4">输入歌曲名和歌手名搜索歌词</p>

      <div class="form-row">
        <t-form-item label="歌曲名" class="flex-1">
          <t-input
            v-model="trackName"
            placeholder="例如: 晴天"
            clearable
            @enter="handleSearch"
          />
        </t-form-item>
        <t-form-item label="歌手名" class="flex-1">
          <t-input
            v-model="artistName"
            placeholder="例如: 周杰伦"
            clearable
            @enter="handleSearch"
          />
        </t-form-item>
      </div>

      <div class="mt-4">
        <t-button theme="primary" :loading="loading" @click="handleSearch">
          <template #icon><SearchIcon /></template>
          {{ loading ? '搜索中...' : '搜索歌词' }}
        </t-button>
      </div>
    </t-card>

    <!-- Loading -->
    <div v-if="loading" class="loading-wrap mt-4">
      <t-loading size="medium" text="搜索中..." />
    </div>

    <!-- 歌词结果 -->
    <t-card v-else-if="lyric" class="mt-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="results-title">歌词</h3>
        <t-button variant="outline" size="small" @click="copyLyric">
          <template #icon><FileCopyIcon /></template>
          复制歌词
        </t-button>
      </div>
      <pre class="lyric-content">{{ lyric }}</pre>
    </t-card>

    <!-- 空状态 -->
    <div v-else-if="searched && !loading" class="empty-state mt-4">
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-text">未找到歌词</div>
    </div>
    <div v-else-if="!loading" class="empty-state mt-4">
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-text">输入歌曲名和歌手名搜索歌词</div>
    </div>
  </div>
</template>

<style scoped>
.lyrics-page {
  max-width: 700px;
  margin: 0 auto;
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}
.form-row {
  display: flex;
  gap: 16px;
}
@media (max-width: 480px) {
  .form-row {
    flex-direction: column;
    gap: 12px;
  }
}
.results-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 40px;
}
.lyric-content {
  font-family: inherit;
  font-size: 14px;
  line-height: 2;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 500px;
  overflow-y: auto;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
</style>
