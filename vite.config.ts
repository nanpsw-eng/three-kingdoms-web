import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'PROJECT THREE KINGDOMS',
        short_name: 'Three Kingdoms',
        description: '모바일 퍼스트 삼국지 군단 RPG',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        background_color: '#11130f',
        theme_color: '#7c6236',
      },
    }),
  ],
  build: {
    target: 'es2022',
  },
});
