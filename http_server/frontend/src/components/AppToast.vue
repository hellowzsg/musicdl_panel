<script setup>
/**
 * Toast 全局通知组件
 */
import { useGlobalStore } from '../stores/global'

const store = useGlobalStore()

const typeIcon = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in store.toasts"
          :key="toast.id"
          class="toast-item"
          :class="'toast-' + toast.type"
        >
          <span class="toast-icon">{{ typeIcon[toast.type] || '✅' }}</span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
  pointer-events: none;
}

@media (max-width: 768px) {
  .toast-container {
    left: 16px;
    right: 16px;
    max-width: none;
    top: calc(16px + env(safe-area-inset-top));
  }
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  font-size: 14px;
  color: var(--text-primary);
  pointer-events: auto;
}

.toast-success {
  border-left: 3px solid var(--color-success);
}
.toast-error {
  border-left: 3px solid var(--color-danger);
}
.toast-warning {
  border-left: 3px solid var(--color-warning);
}
.toast-info {
  border-left: 3px solid var(--color-info);
}

.toast-icon {
  font-size: 18px;
  flex-shrink: 0;
}
.toast-message {
  flex: 1;
  word-break: break-word;
}

/* 动画 */
.toast-enter-active {
  transition: all 0.3s ease;
}
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
