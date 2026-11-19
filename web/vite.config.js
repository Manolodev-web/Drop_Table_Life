import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  // Base relativa es CRÍTICA para despliegue estático en Vercel Free (Hobby)
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          sqljs: ['sql.js'],
          three: ['three']
        }
      }
    }
  }
});