// game-mapping/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 8080,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@state': fileURLToPath(new URL('./src/state', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
    },
  },
  build: {
    // keep your dist path choice
    outDir: fileURLToPath(new URL('../dist/game-mapping', import.meta.url)),
    emptyOutDir: true,
  },
})
