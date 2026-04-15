import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],

  server: {
    // Usa un puerto fijo para evitar conflictos con otras interfaces Vite
    port: 5175,
    strictPort: true,
    proxy: {
      // Dev: evita CORS y mantiene el mismo path que en producción
      '/api': {
        target: 'http://localhost:9091',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
