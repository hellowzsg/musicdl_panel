<script setup>
/**
 * 底部任务进度浮窗
 * 显示正在运行的异步任务，支持折叠/展开
 * 使用 TDesign 组件重构
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useGlobalStore } from '../stores/global'
import { useResponsive } from '../composables/useResponsive'
import { api } from '../api'
import { ChevronUpIcon, ChevronDownIcon, CloseIcon } from 'tdesign-icons-vue-next'

const store = useGlobalStore()
const { isMobile } = useResponsive()

const expanded = ref(false)

/** 活跃任务列表 */
const activeTasks = computed(() =>
  store.runningTasks.filter((t) => t.status === 'pending' || t.status === 'running')
)

/** 是否有任务 */
const hasActiveTasks = computed(() => activeTasks.value.length > 0)

/** 轮询定时器 */
let pollTimer = null

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    for (const task of activeTasks.value) {
      try {
        const res = await api.getTask(task.task_id)
        if (res.success && res.data) {
          store.updateRunningTask(task.task_id, res.data)
          if (res.data.status === 'completed') {
            store.addToast(`任务完成：${task.task_id.slice(0, 8)}...`, 'success')
          } else if (res.data.status === 'failed') {
            store.addToast(`任务失败：${res.data.message || task.task_id.slice(0, 8)}`, 'error')
          }
        }
      } catch (e) {
        // 忽略轮询错误
      }
    }
  }, 3000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(() => startPolling())
onUnmounted(() => stopPolling())

function getStatusLabel(status) {
  const map = {
    pending: '等待中',
    running: '运行中',
    completed: '已完成',
    failed: '已失败',
  }
  return map[status] || status
}

function getStatusTheme(status) {
  const map = {
    pending: 'warning',
    running: 'primary',
    completed: 'success',
    failed: 'danger',
  }
  return map[status] || 'default'
}

function dismissTask(taskId) {
  store.removeRunningTask(taskId)
}
</script>

<template>
  <Teleport to="body">
    <div class="task-floater" v-if="store.runningTasks.length > 0" :class="{ expanded }">
      <!-- 标题栏（点击切换展开） -->
      <div class="floater-header" @click="expanded = !expanded">
        <div class="floater-title">
          <span v-if="hasActiveTasks" class="pulse-dot"></span>
          <span>📊 任务 {{ store.runningTasks.length }} 个</span>
          <span v-if="hasActiveTasks" class="text-sm text-muted">
            （{{ activeTasks.length }} 个进行中）
          </span>
        </div>
        <t-button variant="text" shape="square" size="small">
          <template #icon>
            <ChevronDownIcon v-if="expanded" />
            <ChevronUpIcon v-else />
          </template>
        </t-button>
      </div>

      <!-- 任务列表 -->
      <div class="floater-body" v-show="expanded">
        <div
          v-for="task in store.runningTasks"
          :key="task.task_id"
          class="floater-task"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm text-truncate" style="max-width:200px;">
              {{ task.task_id.slice(0, 8) }}...
            </span>
            <t-tag :theme="getStatusTheme(task.status)" variant="light" size="small">
              {{ getStatusLabel(task.status) }}
            </t-tag>
          </div>
          <t-progress
            v-if="task.status === 'running'"
            :percentage="task.progress || 0"
            :color="{ from: '#818cf8', to: '#4f46e5' }"
            size="small"
            class="mt-2"
          />
          <div class="flex items-center justify-between mt-2" v-if="task.message">
            <span class="text-sm text-muted text-truncate" style="max-width:240px;">
              {{ task.message }}
            </span>
            <t-button
              v-if="task.status === 'completed' || task.status === 'failed'"
              size="small"
              variant="outline"
              @click.stop="dismissTask(task.task_id)"
            >
              <template #icon><CloseIcon /></template>
              移除
            </t-button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.task-floater {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 420px;
  max-width: calc(100vw - 32px);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-bottom: none;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: var(--shadow-lg);
  z-index: 90;
  transition: all 0.3s;
}

@media (max-width: 768px) {
  .task-floater {
    bottom: calc(56px + env(safe-area-inset-bottom));
    width: calc(100vw - 16px);
  }
}

.floater-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
}
.floater-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.floater-body {
  max-height: 300px;
  overflow-y: auto;
  padding: 0 16px 12px;
}

.floater-task {
  padding: 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  margin-bottom: 8px;
}
.floater-task:last-child {
  margin-bottom: 0;
}
</style>
