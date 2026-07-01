import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/health': {
        target: 'http://localhost:7860',
        changeOrigin: true,
      },
      '/parse': {
        target: 'http://localhost:7860',
        changeOrigin: true,
      },
      '/parse-url': {
        target: 'http://localhost:7860',
        changeOrigin: true,
      },
    },
  },
})

