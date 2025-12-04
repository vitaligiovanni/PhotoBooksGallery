import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      '@assets': path.resolve(__dirname, '../assets'),
    },
  },
  optimizeDeps: {
    exclude: ['canvas'], // Exclude Node.js native modules from browser bundle
  },
  server: {
    port: 3000,
    host: true,
    // Allow all localtunnel, localhost.run and ngrok subdomains for mobile testing
    allowedHosts: [
      '.loca.lt',
      '.lhr.life',
      '.localhost.run',
      '.ngrok-free.app',
      '.ngrok-free.dev',
      '.ngrok.io',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/objects': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps in production for smaller bundle size
    rollupOptions: {
      output: {
        // Better chunk splitting
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'wouter'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})