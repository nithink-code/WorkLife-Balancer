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
        target: 'https://worklife-balancer-1.onrender.com',
        changeOrigin: true
      },
      '/auth': {
        target: 'https://worklife-balancer-1.onrender.com',
        changeOrigin: true
      },
      '/user': {
        target: 'https://worklife-balancer-1.onrender.com',
        changeOrigin: true
      },
      '/pomodoro': {
        target: 'https://worklife-balancer-1.onrender.com',
        changeOrigin: true
      },
      // '/mood': {
      //   target: 'https://worklife-balancer-1.onrender.com',
      //   changeOrigin: true
      // },
      '/break': {
        target: 'https://worklife-balancer-1.onrender.com',
        changeOrigin: true
      },
      '/email': {
        target: 'https://worklife-balancer-1.onrender.com',
        changeOrigin: true
      }
    }
  }
})
