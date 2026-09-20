import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'offline' ? [viteSingleFile()] : [])],
  server: {
    watch: { ignored: ['**/dist/**', '**/offline/**', '**/交付/**', '**/reports/**', '**/public/downloads/**', '**/*.zip'] },
  },
  build: { outDir: mode === 'offline' ? 'offline' : 'dist', target: 'es2022', chunkSizeWarningLimit: 1100 },
}));
