import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const apiProxy = {
  target: 'http://127.0.0.1:8000',
  changeOrigin: true,
  timeout: 30000,
  proxyTimeout: 30000,
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': apiProxy,
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': apiProxy,
    },
  },
})
