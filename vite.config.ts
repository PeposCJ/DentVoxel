import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  assetsInclude: ['**/*.wasm'],
  plugins: [
    react(),
    viteCommonjs(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'DentVoxel',
        short_name: 'DentVoxel',
        description: 'Open-source, private and local-first dental CBCT/DICOM viewer',
        lang: 'en',
        theme_color: '#071018',
        background_color: '#071018',
        display: 'standalone',
        start_url: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@cornerstonejs/dicom-image-loader'],
    include: ['dicom-parser'],
  },
  worker: { format: 'es' },
  build: { target: 'es2022', sourcemap: true },
});
