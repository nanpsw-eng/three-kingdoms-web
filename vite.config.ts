import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'PROJECT THREE KINGDOMS',
        short_name: 'Three Kingdoms',
        description: '모바일 퍼스트 삼국지 군단 RPG',
        lang: 'ko',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        background_color: '#11130f',
        theme_color: '#7c6236',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // App shell only: versioned static build assets. Saves live in IndexedDB (ADR-003),
        // never in Cache Storage. No runtime caching of API/data routes.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // Phaser chunk is ~1.4 MB minified; allow it in the precache.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    target: 'es2022',
    // Phaser is intentionally isolated in its own lazily-loaded chunk (~1.4 MB, ~360 kB gzip).
    chunkSizeWarningLimit: 1600,
  },
});
