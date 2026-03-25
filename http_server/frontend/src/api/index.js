/**
 * API 请求封装层
 * 统一封装所有后端接口调用
 */

const BASE = '/api'

/**
 * 通用请求函数
 */
async function request(url, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body)
  }
  try {
    const response = await fetch(url, config)
    const data = await response.json()
    return { code: response.status, ...data }
  } catch (error) {
    return { code: 0, success: false, error: error.message }
  }
}

export const api = {
  // ===== 音乐源 =====
  getSources: () => request(`${BASE}/sources`),

  // ===== 搜索 =====
  search: (data) => request(`${BASE}/search`, { method: 'POST', body: data }),
  searchAsync: (data) => request(`${BASE}/search/async`, { method: 'POST', body: data }),

  // ===== 下载 =====
  download: (data) => request(`${BASE}/download`, { method: 'POST', body: data }),
  searchAndDownload: (data) => request(`${BASE}/search_and_download`, { method: 'POST', body: data }),

  // ===== 歌单 =====
  parsePlaylist: (data) => request(`${BASE}/playlist/parse`, { method: 'POST', body: data }),
  downloadPlaylist: (data) => request(`${BASE}/playlist/download`, { method: 'POST', body: data }),

  // ===== 歌词 =====
  searchLyrics: (data) => request(`${BASE}/lyrics/search`, { method: 'POST', body: data }),

  // ===== 任务 =====
  getTask: (id) => request(`${BASE}/tasks/${id}`),
  listTasks: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.status) qs.set('status', params.status)
    if (params.type) qs.set('type', params.type)
    if (params.limit) qs.set('limit', params.limit)
    const query = qs.toString()
    return request(`${BASE}/tasks${query ? '?' + query : ''}`)
  },
  deleteTask: (id) => request(`${BASE}/tasks/${id}`, { method: 'DELETE' }),

  // ===== 文件 =====
  listFiles: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.work_dir) qs.set('work_dir', params.work_dir)
    if (params.recursive) qs.set('recursive', 'true')
    const query = qs.toString()
    return request(`${BASE}/files/list${query ? '?' + query : ''}`)
  },
  deleteFile: (path) => request(`${BASE}/files/delete`, { method: 'DELETE', body: { path } }),
  getDownloadFileUrl: (path) => `${BASE}/files/download?path=${encodeURIComponent(path)}`,

  // ===== 健康检查 =====
  health: () => request(`${BASE}/health`),
}
