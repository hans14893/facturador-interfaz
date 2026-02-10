import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['stream', 'buffer', 'util', 'events', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
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
