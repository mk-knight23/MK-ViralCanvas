import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: id => {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom')) return 'react-dom';
            if (id.includes('/react/')) return 'react';
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('html2canvas')) return 'export-canvas';
            if (id.includes('file-saver')) return 'export-canvas';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('zustand')) return 'store';
          }
        },
      },
    },
  },
});
