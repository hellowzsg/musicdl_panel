<script setup>
/**
 * 歌单解析页
 * 输入歌单 URL → 解析预览 → 一键下载
 * 使用 TDesign 组件重构
 */
import { ref, onUnmounted } from 'vue'
import { useGlobalStore } from '../stores/global'
import { useResponsive } from '../composables/useResponsive'
import { api } from '../api'
import { SearchIcon, DownloadIcon } from 'tdesign-icons-vue-next'

const store = useGlobalStore()
const { isMobile } = useResponsive()

const playlistUrl = ref('')
const maxDownload = ref(0)
const loading = ref(false)
const songs = ref([])
const parsedUrl = ref('')

onUnmounted(() => {
  stopParsePoll()
})

// ===== 解析歌单（异步任务） =====
let parseTaskId = ref('')
let parsePollTimer = null

function stopParsePoll() {
  if (parsePollTimer) {
    clearInterval(parsePollTimer)
    parsePollTimer = null
  }
}

async function handleParse() {
  const url = playlistUrl.value.trim()
  if (!url) {
    store.addToast('请输入歌单链接', 'warning')
    return
  }
  loading.value = true
  songs.value = []
  parsedUrl.value = url
  parseTaskId.value = ''
  stopParsePoll()

  try {
    const res = await api.parsePlaylist({ playlist_url: url })
    if (res.success && res.data && res.data.task_id) {
      parseTaskId.value = res.data.task_id
      store.addToast('歌单解析任务已提交，正在解析中...', 'success')
      store.addRunningTask({
        task_id: res.data.task_id,
        type: 'playlist_parse',
        status: 'pending',
        progress: 0,
        message: `歌单解析: ${url.slice(0, 40)}...`,
      })
      startParsePoll(res.data.task_id)
    } else {
      store.addToast(res.error || '提交解析任务失败', 'error')
      loading.value = false
    }
  } catch (e) {
    store.addToast('解析请求失败: ' + e.message, 'error')
    loading.value = false
  }
}

function startParsePoll(taskId) {
  parsePollTimer = setInterval(async () => {
    try {
      const res = await api.getTask(taskId)
      if (!res.success || !res.data) return
      const task = res.data
      store.updateRunningTask(taskId, task)

      if (task.status === 'completed') {
        stopParsePoll()
        loading.value = false
        const result = task.result || {}
        songs.value = result.songs || []
        if (songs.value.length === 0) {
          store.addToast('歌单为空或解析失败', 'info')
        } else {
          store.addToast(`解析成功，共 ${songs.value.length} 首歌曲`, 'success')
        }
      } else if (task.status === 'failed') {
        stopParsePoll()
        loading.value = false
        store.addToast(task.message || '歌单解析失败', 'error')
      }
    } catch (e) {
      // 忽略轮询错误
    }
  }, 2000)
}

// ===== 解析并下载 =====
async function handleDownload() {
  const url = playlistUrl.value.trim()
  if (!url) {
    store.addToast('请输入歌单链接', 'warning')
    return
  }
  try {
    const data = { playlist_url: url }
    if (maxDownload.value > 0) {
      data.max_download = maxDownload.value
    }
    const res = await api.downloadPlaylist(data)
    if (res.success && res.data) {
      store.addRunningTask({
        task_id: res.data.task_id,
        type: 'playlist_download',
        status: 'pending',
        progress: 0,
        message: `歌单下载: ${url.slice(0, 40)}...`,
      })
      store.addToast('歌单下载任务已提交', 'success')
    } else {
      store.addToast(res.error || '提交失败', 'error')
    }
  } catch (e) {
    store.addToast('请求失败: ' + e.message, 'error')
  }
}

/** 桌面端表格列定义 */
const tableColumns = [
  { colKey: 'serial-number', title: '#', width: 60 },
  { colKey: 'song_name', title: '歌曲名', ellipsis: true },
  { colKey: 'singers', title: '歌手', ellipsis: true, width: 160 },
  { colKey: 'album', title: '专辑', ellipsis: true, width: 160 },
  { colKey: 'source', title: '来源', width: 100 },
]
</script>

<template>
  <div class="playlist-page">
    <!-- 输入表单 -->
    <t-card>
      <h2 class="page-title">📜 歌单解析</h2>
      <p class="text-sm text-secondary mt-2 mb-4">
        粘贴歌单分享链接，支持 QQ 音乐、网易云、酷狗、酷我等平台
      </p>

      <t-form layout="vertical">
        <t-form-item label="歌单链接">
          <t-input
            v-model="playlistUrl"
            placeholder="请粘贴歌单分享链接..."
            size="large"
            clearable
            @enter="handleParse"
          />
        </t-form-item>

        <t-form-item label="最大下载数（0 = 全部）">
          <t-input-number
            v-model="maxDownload"
            :min="0"
            placeholder="0"
            style="width: 200px;"
          />
        </t-form-item>
      </t-form>

      <t-space class="mt-4">
        <t-button variant="outline" :loading="loading" @click="handleParse">
          <template #icon><SearchIcon /></template>
          {{ loading ? '解析中...' : '解析预览' }}
        </t-button>
        <t-button theme="primary" :disabled="loading" @click="handleDownload">
          <template #icon><DownloadIcon /></template>
          解析并下载
        </t-button>
      </t-space>
    </t-card>

    <!-- Loading -->
    <div v-if="loading" class="loading-wrap mt-4">
      <t-loading size="medium" text="解析中..." />
    </div>

    <!-- 解析结果 -->
    <div v-else-if="songs.length > 0" class="results-section mt-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="results-title">解析结果（{{ songs.length }} 首）</h3>
      </div>

      <!-- 桌面端表格 -->
      <t-card v-if="!isMobile" :bordered="true" style="padding: 0;">
        <t-table
          :data="songs"
          :columns="tableColumns"
          row-key="index"
          hover
          max-height="500"
          size="medium"
        >
          <template #song_name="{ row }">
            {{ row.song_name || '-' }}
          </template>
          <template #singers="{ row }">
            {{ row.singers || '-' }}
          </template>
          <template #album="{ row }">
            {{ row.album || '-' }}
          </template>
          <template #source="{ row }">
            <t-tag theme="primary" variant="light">{{ row.source || '-' }}</t-tag>
          </template>
        </t-table>
      </t-card>

      <!-- 移动端卡片 -->
      <div v-else class="song-list">
        <t-card v-for="(song, idx) in songs" :key="idx" :bordered="true" class="song-item">
          <div class="flex items-center gap-3">
            <span class="song-index text-muted">{{ idx + 1 }}</span>
            <div class="flex-1" style="min-width: 0;">
              <div class="song-name">{{ song.song_name || '未知歌曲' }}</div>
              <div class="text-sm text-secondary mt-2">
                {{ song.singers || '未知' }}
                <span v-if="song.album"> · {{ song.album }}</span>
              </div>
            </div>
            <t-tag theme="primary" variant="light">{{ song.source || '-' }}</t-tag>
          </div>
        </t-card>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state mt-4">
      <div class="empty-state-icon">📜</div>
      <div class="empty-state-text">粘贴歌单链接开始解析</div>
    </div>
  </div>
</template>

<style scoped>
.playlist-page {
  max-width: 800px;
  margin: 0 auto;
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
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
.song-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.song-item :deep(.t-card__body) {
  padding: 12px 14px;
}
.song-index {
  font-size: 14px;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
}
.song-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
</style>
