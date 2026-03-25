/**
 * Pinia 全局状态管理
 */
import { defineStore } from 'pinia'
import { MessagePlugin } from 'tdesign-vue-next'
import { api } from '../api'

export const useGlobalStore = defineStore('global', {
  state: () => ({
    /** 所有可用音乐源 */
    sources: [],
    /** 默认音乐源 */
    defaultSources: [],
    /** 主题：dark / light */
    theme: localStorage.getItem('musicdl-theme') || 'dark',
    /** 运行中的异步任务列表 */
    runningTasks: [],
  }),

  getters: {
    /** 是否为暗色主题 */
    isDark: (state) => state.theme === 'dark',
    /** 进行中的任务数量 */
    activeTaskCount: (state) =>
      state.runningTasks.filter((t) => t.status === 'pending' || t.status === 'running').length,
  },

  actions: {
    /** 获取音乐源列表 */
    async fetchSources() {
      const res = await api.getSources()
      if (res.success && res.data) {
        this.sources = res.data.sources || []
        this.defaultSources = res.data.default_sources || []
      }
    },

    /** 切换主题 */
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('musicdl-theme', this.theme)
    },

    /** 添加 Toast 通知（使用 TDesign MessagePlugin） */
    addToast(message, type = 'success', duration = 3000) {
      const typeMap = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info',
      }
      const method = typeMap[type] || 'info'
      MessagePlugin[method](message, duration)
    },

    /** 添加任务到运行列表 */
    addRunningTask(task) {
      this.runningTasks.unshift(task)
    },

    /** 更新任务状态 */
    updateRunningTask(taskId, data) {
      const idx = this.runningTasks.findIndex((t) => t.task_id === taskId)
      if (idx !== -1) {
        Object.assign(this.runningTasks[idx], data)
      }
    },

    /** 移除任务 */
    removeRunningTask(taskId) {
      this.runningTasks = this.runningTasks.filter((t) => t.task_id !== taskId)
    },
  },
})
