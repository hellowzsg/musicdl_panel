/**
 * 响应式断点检测组合式函数
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useResponsive() {
  const width = ref(window.innerWidth)

  let onResize = null

  onMounted(() => {
    onResize = () => {
      width.value = window.innerWidth
    }
    window.addEventListener('resize', onResize)
  })

  onUnmounted(() => {
    if (onResize) {
      window.removeEventListener('resize', onResize)
    }
  })

  return {
    width,
    isMobile: computed(() => width.value <= 768),
    isTablet: computed(() => width.value > 768 && width.value <= 1024),
    isDesktop: computed(() => width.value > 1024),
    breakpoint: computed(() => {
      if (width.value <= 480) return 'xs'
      if (width.value <= 768) return 'sm'
      if (width.value <= 1024) return 'md'
      return 'lg'
    }),
  }
}
