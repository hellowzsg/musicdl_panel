<script setup>
/**
 * 根组件
 * 组装整体布局：Header + Router View + TaskFloater + Toast
 */
import { watch } from 'vue'
import { useGlobalStore } from './stores/global'
import { useResponsive } from './composables/useResponsive'
import AppHeader from './components/AppHeader.vue'
import TaskFloater from './components/TaskFloater.vue'

const store = useGlobalStore()
const { isMobile } = useResponsive()

// 监听主题变化，同步到 document（TDesign 暗色主题 + 自定义变量）
watch(
  () => store.theme,
  (theme) => {
    document.documentElement.setAttribute('theme-mode', theme === 'dark' ? 'dark' : '')
    document.documentElement.setAttribute('data-theme', theme)
  },
  { immediate: true }
)
</script>

<template>
  <div class="app" :data-theme="store.theme">
    <AppHeader />
    <main class="main-content" :class="{ 'has-bottom-bar': isMobile }">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <TaskFloater />
  </div>
</template>

<style scoped>
.app {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s, color 0.3s;
}

.main-content {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 16px 40px;
}

.main-content.has-bottom-bar {
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}
</style>
