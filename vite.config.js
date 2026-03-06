import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '^/api/allorigins': {
        target: 'https://api.allorigins.win',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/allorigins/, '')
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // setupFiles: ['./src/test/setup.ts'],
  },
})
