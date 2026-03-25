import { createRouter, createWebHashHistory } from 'vue-router'
import SearchView from '../views/SearchView.vue'
import PlaylistView from '../views/PlaylistView.vue'
import LyricsView from '../views/LyricsView.vue'
import TasksView from '../views/TasksView.vue'
import FilesView from '../views/FilesView.vue'

const routes = [
  { path: '/', redirect: '/search' },
  { path: '/search', name: 'search', component: SearchView, meta: { title: '搜索', icon: '🔍' } },
  { path: '/playlist', name: 'playlist', component: PlaylistView, meta: { title: '歌单', icon: '📜' } },
  { path: '/lyrics', name: 'lyrics', component: LyricsView, meta: { title: '歌词', icon: '📝' } },
  { path: '/tasks', name: 'tasks', component: TasksView, meta: { title: '任务', icon: '📊' } },
  { path: '/files', name: 'files', component: FilesView, meta: { title: '文件', icon: '📁' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
