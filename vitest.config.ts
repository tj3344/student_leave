import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // 使用 jsdom 环境
    environment: 'jsdom',
    // 全局可用 API（不需要 import）
    globals: true,
    // 测试环境设置文件
    setupFiles: ['./vitest.setup.ts'],
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // 覆盖率阈值
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
      // 排除文件
      exclude: [
        'node_modules/',
        'vitest.setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/build/**',
        'app/**', // Next.js App Router
      ],
    },
    // 包文件
    include: ['lib/**/*.{test,spec}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    // 排除文件
    exclude: ['node_modules', 'dist', '.next', 'out'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
