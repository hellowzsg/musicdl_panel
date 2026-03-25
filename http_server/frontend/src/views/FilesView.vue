<script setup>
/**
 * 文件管理页
 * 浏览工作目录中的下载文件，支持递归浏览和下载
 * 使用 TDesign 组件重构
 */
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGlobalStore } from '../stores/global'
import { useResponsive } from '../composables/useResponsive'
import { api } from '../api'
import {
  RefreshIcon,
  DeleteIcon,
  DownloadIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  RollbackIcon,
} from 'tdesign-icons-vue-next'

const route = useRoute()
const router = useRouter()
const store = useGlobalStore()
const { isMobile } = useResponsive()

const workDir = ref('')
const recursive = ref(false)
const loading = ref(false)
const files = ref([])
const currentDir = ref('')
const highlightFile = ref('')

onMounted(() => {
  if (route.query.dir) {
    workDir.value = route.query.dir
  }
  if (route.query.highlight) {
    highlightFile.value = route.query.highlight
  }
  fetchFiles()
})

watch(() => route.query, (newQuery) => {
  if (newQuery.dir) {
    workDir.value = newQuery.dir
  }
  if (newQuery.highlight) {
    highlightFile.value = newQuery.highlight
  }
  if (newQuery.dir || newQuery.highlight) {
    fetchFiles()
  }
})

async function fetchFiles() {
  loading.value = true
  try {
    const params = {}
    if (workDir.value.trim()) params.work_dir = workDir.value.trim()
    if (recursive.value) params.recursive = true
    const res = await api.listFiles(params)
    if (res.success && res.data) {
      files.value = res.data.files || []
      currentDir.value = res.data.work_dir || ''
      if (highlightFile.value) {
        nextTick(() => {
          scrollToHighlight()
        })
      }
    } else {
      store.addToast(res.error || '获取文件列表失败', 'error')
    }
  } catch (e) {
    store.addToast('请求失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

function scrollToHighlight() {
  const el = document.querySelector('.file-highlight')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function isHighlighted(file) {
  if (!highlightFile.value) return false
  return file.name === highlightFile.value
}

function clearHighlight() {
  highlightFile.value = ''
  if (route.query.highlight) {
    router.replace({ query: { ...route.query, highlight: undefined } })
  }
}

function openDir(dirPath) {
  highlightFile.value = ''
  workDir.value = dirPath
  fetchFiles()
}

function goUp() {
  if (!currentDir.value) return
  const parts = currentDir.value.replace(/\/$/, '').split('/')
  parts.pop()
  workDir.value = parts.join('/') || '/'
  fetchFiles()
}

function getDownloadUrl(path) {
  return api.getDownloadFileUrl(path)
}

function getFileIcon(file) {
  if (file.type === 'directory') return '📂'
  if (file.type === 'audio') return '🎵'
  if (file.type === 'lyrics') return '📄'
  const ext = (file.name || '').split('.').pop().toLowerCase()
  const audioExts = ['mp3', 'flac', 'wav', 'm4a', 'ogg', 'opus', 'wma', 'aac', 'ape']
  if (audioExts.includes(ext)) return '🎵'
  if (ext === 'lrc') return '📄'
  return '📎'
}

async function deleteFile(file) {
  try {
    const res = await api.deleteFile(file.path)
    if (res.success) {
      store.addToast(`已删除: ${file.name}`, 'success')
      files.value = files.value.filter((f) => f.path !== file.path)
    } else {
      store.addToast(res.error || '删除失败', 'error')
    }
  } catch (e) {
    store.addToast('删除失败: ' + e.message, 'error')
  }
}

function formatSize(sizeStr) {
  return sizeStr || '-'
}

function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

/** 桌面端表格列定义 */
const tableColumns = [
  { colKey: 'name', title: '文件名', ellipsis: true },
  { colKey: 'size', title: '大小', width: 120 },
  { colKey: 'modified_at', title: '修改时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 140 },
]
</script>

<template>
  <div class="files-page">
    <!-- 工具栏 -->
    <t-card>
      <h2 class="page-title">📁 文件管理</h2>
      <p class="text-sm text-secondary mt-2 mb-4">
        浏览已下载的音乐文件
      </p>
      <div class="toolbar">
        <t-input
          v-model="workDir"
          :placeholder="'工作目录（默认: ' + (currentDir || 'musicdl_outputs') + '）'"
          clearable
          @enter="fetchFiles"
          style="flex:1;min-width:0;"
        />
        <t-checkbox v-model="recursive" @change="fetchFiles" style="white-space:nowrap;">
          递归
        </t-checkbox>
        <t-button variant="outline" size="small" :loading="loading" @click="fetchFiles">
          <template #icon><RefreshIcon /></template>
          刷新
        </t-button>
      </div>

      <!-- 面包屑 / 返回上级 -->
      <div v-if="currentDir" class="breadcrumb mt-3">
        <span class="text-sm text-muted">📍 {{ currentDir }}</span>
        <t-button variant="outline" size="small" @click="goUp">
          <template #icon><RollbackIcon /></template>
          上级
        </t-button>
      </div>
    </t-card>

    <!-- Loading -->
    <div v-if="loading" class="loading-wrap mt-4">
      <t-loading size="medium" text="加载中..." />
    </div>

    <!-- 文件列表 -->
    <div v-else-if="files.length > 0" class="file-section mt-4">
      <!-- 桌面端表格 -->
      <t-card v-if="!isMobile" :bordered="true" style="padding: 0;">
        <t-table
          :data="files"
          :columns="tableColumns"
          row-key="path"
          hover
          max-height="600"
          size="medium"
          :row-class-name="({ row }) => (isHighlighted(row) ? 'file-highlight' : (row.type === 'directory' ? 'dir-row' : ''))"
          @row-dblclick="({ row }) => row.type === 'directory' && openDir(row.path)"
          @row-click="({ row }) => isHighlighted(row) && clearHighlight()"
        >
          <template #name="{ row }">
            <span class="flex items-center gap-2">
              <span>{{ getFileIcon(row) }}</span>
              <span :class="{ 'dir-name': row.type === 'directory' }">
                {{ row.name }}
              </span>
            </span>
          </template>
          <template #size="{ row }">
            <span class="text-sm text-secondary">{{ formatSize(row.size) }}</span>
          </template>
          <template #modified_at="{ row }">
            <span class="text-sm text-secondary">{{ formatTime(row.modified_at) }}</span>
          </template>
          <template #operation="{ row }">
            <t-space :size="4">
              <t-button
                v-if="row.type === 'directory'"
                variant="outline"
                size="small"
                @click="openDir(row.path)"
              >
                <template #icon><FolderOpenIcon /></template>
              </t-button>
              <t-button
                v-else
                theme="primary"
                size="small"
                tag="a"
                :href="getDownloadUrl(row.path)"
                target="_blank"
              >
                <template #icon><DownloadIcon /></template>
              </t-button>
              <t-popconfirm
                :content="'确定删除「' + row.name + '」？' + (row.type === 'directory' ? '（将删除该目录下所有文件）' : '')"
                @confirm="deleteFile(row)"
              >
                <t-button variant="text" theme="danger" size="small">
                  <template #icon><DeleteIcon /></template>
                </t-button>
              </t-popconfirm>
            </t-space>
          </template>
        </t-table>
      </t-card>

      <!-- 移动端列表 -->
      <div v-else class="file-cards">
        <t-card
          v-for="file in files"
          :key="file.path"
          :bordered="true"
          class="file-card"
          :class="{ 'file-highlight': isHighlighted(file) }"
          @click="file.type === 'directory' ? openDir(file.path) : (isHighlighted(file) ? clearHighlight() : null)"
        >
          <div class="flex items-center gap-3">
            <span class="file-icon">{{ getFileIcon(file) }}</span>
            <div class="flex-1" style="min-width:0;">
              <div class="file-name text-truncate" :class="{ 'dir-name': file.type === 'directory' }">
                {{ file.name }}
              </div>
              <div class="text-sm text-muted mt-2" v-if="file.type !== 'directory'">
                {{ formatSize(file.size) }} · {{ formatTime(file.modified_at) }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <t-button
                v-if="file.type !== 'directory'"
                theme="primary"
                size="small"
                tag="a"
                :href="getDownloadUrl(file.path)"
                target="_blank"
                @click.stop
              >
                <template #icon><DownloadIcon /></template>
              </t-button>
              <t-popconfirm
                :content="'确定删除「' + file.name + '」？'"
                @confirm="deleteFile(file)"
              >
                <t-button variant="text" theme="danger" size="small" @click.stop>
                  <template #icon><DeleteIcon /></template>
                </t-button>
              </t-popconfirm>
              <ChevronRightIcon v-if="file.type === 'directory'" class="text-muted" />
            </div>
          </div>
        </t-card>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state mt-4">
      <div class="empty-state-icon">📁</div>
      <div class="empty-state-text">{{ currentDir ? '目录为空' : '暂无下载文件' }}</div>
    </div>
  </div>
</template>

<style scoped>
.files-page {
  max-width: 900px;
  margin: 0 auto;
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}
.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 40px;
}
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}
@media (max-width: 480px) {
  .toolbar {
    flex-wrap: wrap;
  }
}
.breadcrumb {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* 表格目录行 */
:deep(.dir-row) {
  cursor: pointer;
}
:deep(.dir-row:hover) {
  background: var(--color-accent-light);
}
.dir-name {
  color: var(--color-accent);
  font-weight: 500;
}

/* 文件高亮效果 */
:deep(.file-highlight),
.file-highlight {
  background: rgba(59, 130, 246, 0.12) !important;
  box-shadow: inset 0 0 0 2px var(--color-accent, #3b82f6);
  border-radius: var(--radius-sm);
  animation: highlight-pulse 2s ease-in-out 3;
}
@keyframes highlight-pulse {
  0%, 100% { background: rgba(59, 130, 246, 0.12); }
  50% { background: rgba(59, 130, 246, 0.25); }
}

/* 移动端文件卡片 */
.file-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.file-card {
  cursor: pointer;
}
.file-card :deep(.t-card__body) {
  padding: 12px 14px;
}
.file-card:active {
  transform: scale(0.99);
}
.file-icon {
  font-size: 24px;
  flex-shrink: 0;
}
.file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}
</style>
