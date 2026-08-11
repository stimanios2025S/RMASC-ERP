import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [react(), {
    name: 'inject-sw-version',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist', 'sw.js')
      if (fs.existsSync(swPath)) {
        let content = fs.readFileSync(swPath, 'utf-8')
        const buildStamp = Date.now().toString(36)
        content = content.replace(
          "const SW_VERSION = 'v2.7.6'",
          `const SW_VERSION = 'v2.7.6-${buildStamp}'`
        )
        fs.writeFileSync(swPath, content)
        console.log(`  🏷️  SW_VERSION injecté: v2.7.6-${buildStamp}`)
      }
    }
  }],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          sentry: ['@sentry/react'],
          // Code-split heavy workspaces
          dashboard: ['./src/components/Dashboard.tsx'],
          ingenieurs: ['./src/components/IngenieurPortal.tsx'],
          production: ['./src/components/ProductionWorkspace.tsx'],
          stock: ['./src/components/StockWorkspace.tsx'],
          // Agent AI (heavy - speech, multilingual NLP)
          agent: ['./src/components/agent/AgentPanel.tsx'],
        },
        experimentalMinChunkSize: 20000,
      },
    },
    chunkSizeWarningLimit: 400,
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
    hmr: {
      overlay: false,
    },
    watch: {
      usePolling: false,
      ignored: ['**/node_modules/**', '**/dist/**', '**/backend/uploads/**', '**/.git/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
