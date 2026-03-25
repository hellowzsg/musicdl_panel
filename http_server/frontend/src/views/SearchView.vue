<script setup>
/**
 * 搜索与下载页
 * 核心功能页面：关键词搜索 + 音乐源选择 + 结果展示 + 批量下载
 * 使用 TDesign 组件重构
 */
import { ref, computed, onMounted } from 'vue'
import { useGlobalStore } from '../stores/global'
import { useResponsive } from '../composables/useResponsive'
import { api } from '../api'
import { SearchIcon, DownloadIcon } from 'tdesign-icons-vue-next'

const store = useGlobalStore()
const { isMobile } = useResponsive()

// ===== 搜索表单 =====
const keyword = ref('')
const selectedSources = ref([])
const loading = ref(false)
const results = ref([])
const searchedKeyword = ref('')

// ===== 音乐源筛选 =====
const showSourceFilter = ref(false)

onMounted(async () => {
  if (store.sources.length === 0) {
    await store.fetchSources()
  }
  // 默认选中所有源
  if (selectedSources.value.length === 0) {
    selectedSources.value = [...store.defaultSources]
  }
})

function toggleSource(src) {
  const idx = selectedSources.value.indexOf(src)
  if (idx >= 0) {
    selectedSources.value.splice(idx, 1)
  } else {
    selectedSources.value.push(src)
  }
}

function selectAllSources() {
  selectedSources.value = [...store.sources]
}

function clearAllSources() {
  selectedSources.value = []
}

// ===== 搜索逻辑 =====
async function handleSearch() {
  const kw = keyword.value.trim()
  if (!kw) {
    store.addToast('请输入搜索关键词', 'warning')
    return
  }
  loading.value = true
  results.value = []
  searchedKeyword.value = kw
  try {
    const data = { keyword: kw }
    if (selectedSources.value.length > 0) {
      data.music_sources = selectedSources.value
    }
    const res = await api.search(data)
    if (res.success && res.data) {
      results.value = res.data.results || []
      if (results.value.length === 0) {
        store.addToast('未找到相关歌曲', 'info')
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

// ===== 搜索并下载 =====
async function handleSearchAndDownload() {
  const kw = keyword.value.trim()
  if (!kw) {
    store.addToast('请输入搜索关键词', 'warning')
    return
  }
  try {
    const data = { keyword: kw, max_download: 5 }
    if (selectedSources.value.length > 0) {
      data.music_sources = selectedSources.value
    }
    const res = await api.searchAndDownload(data)
    if (res.success && res.data) {
      store.addRunningTask({
        task_id: res.data.task_id,
        type: 'search_and_download',
        status: 'pending',
        progress: 0,
        message: `搜索并下载: ${kw}`,
      })
      store.addToast('搜索并下载任务已提交', 'success')
    } else {
      store.addToast(res.error || '提交失败', 'error')
    }
  } catch (e) {
    store.addToast('请求失败: ' + e.message, 'error')
  }
}

/** 为每个结果生成唯一 key */
function getRowKey(item) {
  return item.source + '-' + item.index
}

/** 格式化时长（秒 -> mm:ss 或 hh:mm:ss） */
function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '-'
  const s = parseInt(seconds, 10)
  if (isNaN(s) || s <= 0) return '-'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** 默认封面占位图 */
const defaultCover = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="%23e0e0e0" rx="4"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="18" fill="%23999">♪</text></svg>'

/** 桌面端表格列定义 */
const columns = computed(() => [
  {
    colKey: 'cover',
    title: '封面',
    width: 60,
  },
  {
    colKey: 'song_name',
    title: '歌曲名',
    ellipsis: true,
    cell: (h, { row }) => row.song_info.song_name || '-',
  },
  {
    colKey: 'singers',
    title: '歌手',
    ellipsis: true,
    width: 140,
    cell: (h, { row }) => row.song_info.singers || '-',
  },
  {
    colKey: 'album',
    title: '专辑',
    ellipsis: true,
    width: 140,
    cell: (h, { row }) => row.song_info.album || '-',
  },
  {
    colKey: 'duration',
    title: '时长',
    width: 80,
    cell: (h, { row }) => formatDuration(row.song_info.duration_s),
  },
  {
    colKey: 'ext',
    title: '格式',
    width: 70,
    cell: (h, { row }) => row.song_info.ext ? row.song_info.ext.toUpperCase() : '-',
  },
  {
    colKey: 'file_size',
    title: '大小',
    width: 90,
    cell: (h, { row }) => row.song_info.file_size || '-',
  },
  { colKey: 'source', title: '来源', width: 120 },
  { colKey: 'operation', title: '操作', width: 90 },
])

async function downloadOne(item) {
  try {
    const res = await api.download({ song_infos: [item.song_info] })
    if (res.success && res.data) {
      store.addRunningTask({
        task_id: res.data.task_id,
        type: 'download',
        status: 'pending',
        progress: 0,
        message: `下载: ${item.song_info.song_name || '未知'}`,
      })
      store.addToast('下载任务已提交', 'success')
    } else {
      store.addToast(res.error || '下载提交失败', 'error')
    }
  } catch (e) {
    store.addToast('下载请求失败: ' + e.message, 'error')
  }
}


</script>

<template>
  <div class="search-page">
    <!-- 搜索表单 -->
    <t-card class="search-form">
      <div class="search-row">
        <t-input
          v-model="keyword"
          placeholder="搜索歌曲、歌手、专辑..."
          size="large"
          clearable
          @enter="handleSearch"
          style="flex: 1;"
        >
          <template #prefix-icon><SearchIcon /></template>
        </t-input>
        <div class="search-actions">
          <t-button theme="primary" size="large" :loading="loading" @click="handleSearch">
            <template #icon><SearchIcon /></template>
            {{ loading ? '搜索中...' : '搜索' }}
          </t-button>
          <t-button variant="outline" size="large" :disabled="loading" @click="handleSearchAndDownload">
            <template #icon><DownloadIcon /></template>
            搜索+下载
          </t-button>
        </div>
      </div>

      <!-- 音乐源选择 -->
      <t-collapse class="mt-3" borderless>
        <t-collapse-panel
          :header="'🎵 音乐源（已选 ' + selectedSources.length + ' / ' + store.sources.length + '）'"
        >
          <div class="flex gap-2 mb-3">
            <t-button size="small" variant="outline" @click="selectAllSources">全选</t-button>
            <t-button size="small" variant="outline" @click="clearAllSources">清空</t-button>
          </div>
          <div class="source-tags">
            <t-check-tag
              v-for="src in store.sources"
              :key="src"
              :checked="selectedSources.includes(src)"
              @change="toggleSource(src)"
            >
              {{ src }}
            </t-check-tag>
          </div>
        </t-collapse-panel>
      </t-collapse>
    </t-card>

    <!-- Loading -->
    <div v-if="loading" class="loading-wrap mt-4">
      <t-loading size="medium" text="搜索中..." />
    </div>

    <!-- 搜索结果 -->
    <div v-else-if="results.length > 0" class="results-section mt-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="results-title">
          搜索 "{{ searchedKeyword }}" 找到 {{ results.length }} 首
        </h3>
      </div>

      <!-- 桌面端：TDesign 表格 -->
      <t-card v-if="!isMobile" :bordered="true" style="padding: 0;">
        <t-table
          :data="results"
          :columns="columns"
          :row-key="getRowKey"
          hover
          max-height="600"
          size="medium"
        >
          <template #cover="{ row }">
            <img
              :src="row.song_info.cover_url || defaultCover"
              class="song-cover"
              @error="(e) => e.target.src = defaultCover"
            />
          </template>
          <template #source="{ row }">
            <t-tag theme="primary" variant="light">{{ row.source }}</t-tag>
          </template>
          <template #operation="{ row }">
            <t-button theme="primary" variant="text" size="small" @click="downloadOne(row)">
              <template #icon><DownloadIcon /></template>
            </t-button>
          </template>
        </t-table>
      </t-card>

      <!-- 移动端：卡片列表 -->
      <div v-else class="result-cards">
        <t-card
          v-for="item in results"
          :key="getRowKey(item)"
          class="song-card"
          :bordered="true"
          hover-shadow
        >
          <div class="song-card-body">
            <div class="song-card-content">
              <img
                :src="item.song_info.cover_url || defaultCover"
                class="song-cover-mobile"
                @error="(e) => e.target.src = defaultCover"
              />
              <div class="song-card-info">
                <div class="song-name">{{ item.song_info.song_name || '未知歌曲' }}</div>
                <div class="song-meta text-sm text-secondary mt-1">
                  👤 {{ item.song_info.singers || '未知' }}
                  <span v-if="item.song_info.album"> · {{ item.song_info.album }}</span>
                </div>
                <div class="song-meta text-sm text-secondary mt-1">
                  ⏳ {{ formatDuration(item.song_info.duration_s) }}
                  <span v-if="item.song_info.ext"> · {{ item.song_info.ext.toUpperCase() }}</span>
                  <span v-if="item.song_info.file_size"> · {{ item.song_info.file_size }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="song-card-footer flex items-center justify-between mt-2">
            <t-tag theme="primary" variant="light">{{ item.source }}</t-tag>
            <t-button
              theme="primary"
              size="small"
              @click="downloadOne(item)"
            >
              <template #icon><DownloadIcon /></template>
              下载
            </t-button>
          </div>
        </t-card>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="searchedKeyword && !loading" class="empty-state mt-4">
      <div class="empty-state-icon">🔍</div>
      <div class="empty-state-text">未找到 "{{ searchedKeyword }}" 相关歌曲</div>
    </div>

    <!-- 初始状态 -->
    <div v-else-if="!loading" class="empty-state mt-4">
      <div class="empty-state-icon">🎵</div>
      <div class="empty-state-text">输入歌曲名称或歌手名开始搜索</div>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  max-width: 960px;
  margin: 0 auto;
}

.search-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.search-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* 修复 t-collapse-panel 展开后内容被裁切 */
.search-form :deep(.t-collapse-panel__wrapper) {
  overflow: visible;
}
.search-form :deep(.t-collapse-panel__content) {
  overflow: visible;
}
.search-form :deep(.t-card__body) {
  overflow: visible;
}

@media (max-width: 480px) {
  .search-row {
    flex-direction: column;
  }
  .search-actions {
    width: 100%;
  }
  .search-actions :deep(.t-button) {
    flex: 1;
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

.source-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 歌曲卡片（移动端） */
.result-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
/* 桌面端封面图 */
.song-cover {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
  display: block;
}

.song-card {
  transition: all 0.2s;
}
.song-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.song-meta {
  line-height: 1.4;
}

/* 移动端卡片内容布局 */
.song-card-content {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.song-cover-mobile {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}
.song-card-info {
  flex: 1;
  min-width: 0;
}
</style>
