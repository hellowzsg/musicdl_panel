<script setup>
/**
 * 顶部导航栏 + 移动端底部 Tab Bar
 * 使用 TDesign 组件重构
 */
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGlobalStore } from '../stores/global'
import { useResponsive } from '../composables/useResponsive'
import {
  SearchIcon,
  ViewListIcon,
  FileIcon,
  ChartIcon,
  FolderOpenIcon,
  SunnyIcon,
  MoonIcon,
  LinkIcon,
} from 'tdesign-icons-vue-next'

const router = useRouter()
const route = useRoute()
const store = useGlobalStore()
const { isMobile } = useResponsive()

const tabs = [
  { path: '/search', label: '搜索', icon: SearchIcon },
  { path: '/playlist', label: '歌单', icon: ViewListIcon },
  { path: '/lyrics', label: '歌词', icon: FileIcon },
  { path: '/tasks', label: '任务', icon: ChartIcon },
  { path: '/files', label: '文件', icon: FolderOpenIcon },
]

const activeMenu = computed(() => route.path)

function onMenuChange(value) {
  router.push(value)
}
</script>

<template>
  <!-- 顶部导航栏 -->
  <header class="header">
    <div class="header-inner">
      <!-- Logo -->
      <div class="header-brand" @click="router.push('/search')">
        <span class="brand-icon">🎵</span>
        <span class="brand-text" v-if="!isMobile">MusicDL</span>
      </div>

      <!-- 桌面端导航 -->
      <t-head-menu
        v-if="!isMobile"
        :value="activeMenu"
        @change="onMenuChange"
        style="flex: 1; background: transparent; border: none;"
      >
        <t-menu-item v-for="tab in tabs" :key="tab.path" :value="tab.path">
          <template #icon>
            <component :is="tab.icon" />
          </template>
          {{ tab.label }}
        </t-menu-item>
      </t-head-menu>

      <!-- 右侧操作区 -->
      <div class="header-actions">
        <t-button
          variant="text"
          shape="square"
          size="medium"
          href="/api/docs"
          tag="a"
          target="_blank"
          title="API 文档"
        >
          <template #icon><LinkIcon /></template>
        </t-button>
        <t-button
          variant="text"
          shape="square"
          size="medium"
          @click="store.toggleTheme"
          :title="store.isDark ? '切换亮色' : '切换暗色'"
        >
          <template #icon>
            <SunnyIcon v-if="store.isDark" />
            <MoonIcon v-else />
          </template>
        </t-button>
      </div>
    </div>
  </header>

  <!-- 移动端底部 Tab Bar -->
  <Teleport to="body">
    <div class="bottom-tab-bar" v-if="isMobile">
      <div
        v-for="tab in tabs"
        :key="tab.path"
        class="tab-item"
        :class="{ active: activeMenu === tab.path }"
        @click="router.push(tab.path)"
      >
        <component :is="tab.icon" size="22px" />
        <span class="tab-label">{{ tab.label }}</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 顶部导航栏 */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  backdrop-filter: blur(12px);
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}
.brand-icon {
  font-size: 24px;
}
.brand-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

/* TDesign HeadMenu 样式覆盖 */
.header-inner :deep(.t-head-menu) {
  height: 56px;
}
.header-inner :deep(.t-head-menu__inner) {
  height: 56px;
}
.header-inner :deep(.t-menu__item) {
  height: 56px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
</style>

<!-- 底部 Tab Bar 样式（非 scoped，因为通过 Teleport 传送到 body） -->
<style>
.bottom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(56px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  z-index: 100;
}
.bottom-tab-bar .tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--text-muted);
  font-size: 10px;
  min-height: 44px;
  cursor: pointer;
  transition: color 0.2s;
}
.bottom-tab-bar .tab-item.active {
  color: var(--color-accent);
}
.bottom-tab-bar .tab-label {
  font-weight: 500;
}
</style>
