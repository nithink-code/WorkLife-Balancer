import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/user': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/pomodoro': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      // '/mood': {
      //   target: 'http://localhost:8080',
      //   changeOrigin: true
      // },
      '/break': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/email': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
