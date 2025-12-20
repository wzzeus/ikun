import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['pk.ikuncode.cc', 'localhost'],
    proxy: {
      // 本地开发时将 /api 请求代理到后端
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 代码分割优化
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心库
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI 相关
          'vendor-ui': ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-checkbox', '@radix-ui/react-label', '@radix-ui/react-slot'],
          // 图表库（较大，单独分离）
          'vendor-charts': ['echarts', 'echarts-for-react'],
          // PDF/Canvas 相关（按需加载）
          'vendor-export': ['html2canvas', 'jspdf'],
          // 状态管理和请求
          'vendor-state': ['zustand', 'axios', '@tanstack/react-query'],
        },
      },
    },
    // 使用 esbuild 压缩（默认，更快）
    minify: 'esbuild',
    // chunk 大小警告阈值
    chunkSizeWarningLimit: 600,
  },
})
