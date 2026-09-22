import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Proxy /api → backend.
 * cookieDomainRewrite asegura que Set-Cookie del API (puerto 4000)
 * quede asociado al host del frontend (localhost) y el navegador las envíe.
 */
const apiProxy = {
  target: 'http://localhost:4000',
  changeOrigin: true,
  secure: false,
  cookieDomainRewrite: 'localhost',
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': apiProxy,
    },
  },
  preview: {
    proxy: {
      '/api': apiProxy,
    },
  },
})
