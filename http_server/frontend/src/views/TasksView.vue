<script setup>
/**
 * 任务中心页
 * 展示所有异步任务列表，支持筛选、查看详情、删除
 * 使用 TDesign 组件重构
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalStore } from '../stores/global'
import { useResponsive } from '../composables/useResponsive'
import { api } from '../api'
import {
  RefreshIcon,
  DeleteIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DownloadIcon,
  FolderOpenIcon,
} from 'tdesign-icons-vue-next'

const router = useRouter()
const store = useGlobalStore()
const { isMobile } = useResponsive()

const tasks = ref([])
const loading = ref(false)
const statusFilter = ref('')
const typeFilter = ref('')
const expandedTaskId = ref(null)

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '等待中' },
  { value: 'running', label: '运行中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '已失败' },
]
const typeOptions = [
  { value: '', label: '全部类型' },
  { value: 'search', label: '搜索' },
  { value: 'download', label: '下载' },
  { value: 'search_and_download', label: '搜索+下载' },
  { value: 'playlist_parse', label: '歌单解析' },
  { value: 'playlist_download', label: '歌单下载' },
]

onMounted(() => {
  fetchTasks()
})

async function fetchTasks() {
  loading.value = true
  try {
    const params = {}
    if (statusFilter.value) params.status = statusFilter.value
    if (typeFilter.value) params.type = typeFilter.value
    const res = await api.listTasks(params)
    if (res.success && res.data) {
      tasks.value = res.data.tasks || []
    } else {
      store.addToast(res.error || '获取任务列表失败', 'error')
    }
  } catch (e) {
    store.addToast('请求失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

function toggleExpand(taskId) {
  expandedTaskId.value = expandedTaskId.value === taskId ? null : taskId
}

async function deleteTask(taskId) {
  try {
    const res = await api.deleteTask(taskId)
    if (res.success) {
      store.addToast('任务已删除', 'success')
      tasks.value = tasks.value.filter((t) => t.task_id !== taskId)
      store.removeRunningTask(taskId)
    } else {
      store.addToast(res.error || '删除失败', 'error')
    }
  } catch (e) {
    store.addToast('删除失败: ' + e.message, 'error')
  }
}

function getStatusLabel(status) {
  const map = { pending: '等待中', running: '运行中', completed: '已完成', failed: '已失败' }
  return map[status] || status
}

function getStatusTheme(status) {
  const map = { pending: 'warning', running: 'primary', completed: 'success', failed: 'danger' }
  return map[status] || 'default'
}

function getTypeLabel(type) {
  const map = { search: '搜索', download: '下载', search_and_download: '搜索+下载', playlist_parse: '歌单解析', playlist_download: '歌单下载' }
  return map[type] || type
}

function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

function getDownloadUrl(path) {
  return api.getDownloadFileUrl(path)
}

function goToFile(file) {
  const savePath = file.save_path || ''
  if (!savePath) return
  const lastSlash = savePath.lastIndexOf('/')
  const dir = lastSlash > 0 ? savePath.substring(0, lastSlash) : ''
  const fileName = lastSlash >= 0 ? savePath.substring(lastSlash + 1) : savePath
  router.push({
    name: 'files',
    query: { dir: dir, highlight: fileName },
  })
}

/** 歌曲表格列定义 */
const songColumns = [
  { colKey: 'serial-number', title: '#', width: 50 },
  { colKey: 'song_name', title: '歌曲名', ellipsis: true },
  { colKey: 'singers', title: '歌手', ellipsis: true, width: 150 },
  { colKey: 'album', title: '专辑', ellipsis: true, width: 150 },
  { colKey: 'source', title: '来源', width: 90 },
]
</script>

<template>
  <div class="tasks-page">
    <t-card>
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h2 class="page-title">📊 任务中心</h2>
        <div class="flex items-center gap-2 flex-wrap">
          <t-select
            v-model="statusFilter"
            :options="statusOptions"
            style="width: 130px;"
            @change="fetchTasks"
            placeholder="全部状态"
            clearable
            :popup-props="{ attach: 'body' }"
          />
          <t-select
            v-model="typeFilter"
            :options="typeOptions"
            style="width: 140px;"
            @change="fetchTasks"
            placeholder="全部类型"
            clearable
            :popup-props="{ attach: 'body' }"
          />
          <t-button variant="outline" size="small" :loading="loading" @click="fetchTasks">
            <template #icon><RefreshIcon /></template>
            刷新
          </t-button>
        </div>
      </div>
    </t-card>

    <!-- Loading -->
    <div v-if="loading" class="loading-wrap mt-4">
      <t-loading size="medium" text="加载中..." />
    </div>

    <!-- 任务列表 -->
    <div v-else-if="tasks.length > 0" class="task-list mt-4">
      <t-card v-for="task in tasks" :key="task.task_id" class="task-card" :bordered="true">
        <!-- 任务摘要行 -->
        <div class="task-summary" @click="toggleExpand(task.task_id)">
          <div class="flex items-center gap-3 flex-1" style="min-width:0;">
            <t-tag :theme="getStatusTheme(task.status)" variant="light" size="small">
              {{ getStatusLabel(task.status) }}
            </t-tag>
            <t-tag theme="primary" variant="outline" size="small">
              {{ getTypeLabel(task.type) }}
            </t-tag>
            <span class="text-sm text-muted text-truncate hide-mobile">
              {{ task.task_id }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted hide-mobile">{{ formatTime(task.created_at) }}</span>
            <t-popconfirm
              v-if="task.status !== 'running'"
              content="确定删除此任务？"
              @confirm="deleteTask(task.task_id)"
            >
              <t-button variant="text" theme="danger" size="small" @click.stop>
                <template #icon><DeleteIcon /></template>
              </t-button>
            </t-popconfirm>
            <span class="expand-icon">
              <ChevronUpIcon v-if="expandedTaskId === task.task_id" size="16px" />
              <ChevronDownIcon v-else size="16px" />
            </span>
          </div>
        </div>

        <!-- 进度条 -->
        <t-progress
          v-if="task.status === 'running' && task.progress"
          :percentage="task.progress"
          :color="{ from: '#818cf8', to: '#4f46e5' }"
          size="small"
          class="mt-2"
        />

        <!-- 消息 -->
        <div v-if="task.message" class="text-sm text-secondary mt-2">{{ task.message }}</div>

        <!-- 展开详情 -->
        <div v-if="expandedTaskId === task.task_id" class="task-detail mt-3">
          <t-descriptions :column="isMobile ? 1 : 2" layout="vertical" size="small" bordered>
            <t-descriptions-item label="任务 ID">
              <span class="text-sm" style="word-break:break-all;">{{ task.task_id }}</span>
            </t-descriptions-item>
            <t-descriptions-item label="创建时间">{{ formatTime(task.created_at) }}</t-descriptions-item>
            <t-descriptions-item label="更新时间">{{ formatTime(task.updated_at) }}</t-descriptions-item>
            <t-descriptions-item label="进度">{{ task.progress || 0 }}%</t-descriptions-item>
          </t-descriptions>

          <!-- 歌单解析结果 -->
          <div v-if="task.result && task.result.songs && task.result.songs.length > 0" class="mt-3">
            <div class="text-sm text-secondary mb-3">
              🎶 解析歌曲（{{ task.result.songs.length }} 首）
              <span v-if="task.result.playlist_url" class="text-muted"> - {{ task.result.playlist_url }}</span>
            </div>
            <!-- 桌面端表格 -->
            <div v-if="!isMobile" class="songs-table-wrap">
              <t-table
                :data="task.result.songs"
                :columns="songColumns"
                row-key="index"
                hover
                max-height="400"
                size="small"
              >
                <template #song_name="{ row }">{{ row.song_name || '-' }}</template>
                <template #singers="{ row }">{{ row.singers || '-' }}</template>
                <template #album="{ row }">{{ row.album || '-' }}</template>
                <template #source="{ row }">
                  <t-tag theme="primary" variant="light" size="small">{{ row.source || '-' }}</t-tag>
                </template>
              </t-table>
            </div>
            <!-- 移动端列表 -->
            <div v-else class="songs-list-mobile">
              <div v-for="(song, idx) in task.result.songs" :key="idx" class="song-item-mobile">
                <span class="text-muted" style="min-width:24px;text-align:center;">{{ idx + 1 }}</span>
                <div class="flex-1" style="min-width:0;">
                  <div class="text-sm text-truncate">🎵 {{ song.song_name || '未知歌曲' }}</div>
                  <div class="text-sm text-muted text-truncate">
                    {{ song.singers || '未知' }}
                    <span v-if="song.album"> · {{ song.album }}</span>
                  </div>
                </div>
                <t-tag theme="primary" variant="light" size="small">{{ song.source || '-' }}</t-tag>
              </div>
            </div>
          </div>

          <!-- 下载文件列表 -->
          <div v-if="task.result && task.result.files && task.result.files.length > 0" class="mt-3">
            <div class="text-sm text-secondary mb-3">
              📂 下载文件（{{ task.result.files.length }} 个）
            </div>
            <div class="file-list">
              <div v-for="file in task.result.files" :key="file.save_path" class="file-item">
                <span class="text-sm text-truncate flex-1">
                  🎵 {{ file.song_name || file.file_name }}
                  <span class="text-muted"> - {{ file.singers || '' }}</span>
                </span>
                <t-button variant="outline" size="small" @click.stop="goToFile(file)" title="在文件管理中定位">
                  <template #icon><FolderOpenIcon /></template>
                </t-button>
                <t-button theme="primary" size="small" tag="a" :href="getDownloadUrl(file.save_path)" target="_blank">
                  <template #icon><DownloadIcon /></template>
                </t-button>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-between mt-3">
            <div></div>
            <t-popconfirm
              v-if="task.status !== 'running'"
              content="确定删除此任务？"
              @confirm="deleteTask(task.task_id)"
            >
              <t-button theme="danger" variant="outline" size="small">
                <template #icon><DeleteIcon /></template>
                删除任务
              </t-button>
            </t-popconfirm>
          </div>
        </div>
      </t-card>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state mt-4">
      <div class="empty-state-icon">📊</div>
      <div class="empty-state-text">暂无任务</div>
    </div>
  </div>
</template>

<style scoped>
.tasks-page {
  max-width: 900px;
  margin: 0 auto;
  overflow: hidden;
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
.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.task-card :deep(.t-card__body) {
  padding: 14px;
}
.task-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}
.expand-icon {
  color: var(--text-muted);
  display: flex;
  align-items: center;
}

.task-detail {
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.songs-list-mobile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 400px;
  overflow-y: auto;
}
.song-item-mobile {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
</style>
