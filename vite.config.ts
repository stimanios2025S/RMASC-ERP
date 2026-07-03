import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const apiTarget = process.env.VITE_API_URL || 'http://192.168.0.189:4000'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
