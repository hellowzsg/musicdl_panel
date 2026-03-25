import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { TDesignResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [TDesignResolver({ library: 'vue-next' })],
    }),
    Components({
      resolvers: [TDesignResolver({ library: 'vue-next' })],
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // 开发时代理 API 请求到 Flask 后端
      '/api': {
        target: 'http://127.0.0.1:8866',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 构建产物输出到 Flask 的 static 目录
    outDir: '../static/dist',
    emptyOutDir: true,
  },
})
