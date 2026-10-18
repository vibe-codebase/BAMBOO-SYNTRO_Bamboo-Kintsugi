import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 1800, assetsInlineLimit: 0 },
  esbuild: { drop: ['console', 'debugger'] },
  test: { environment: 'node' },
} as never);
