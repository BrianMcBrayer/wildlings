import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { defineConfig } from 'vite';
import { VitePWA, type VitePWAOptions } from 'vite-plugin-pwa';

export const pwaOptions: VitePWAOptions = {
  injectRegister: 'auto',
  registerType: 'autoUpdate',
  minify: true,
  includeAssets: [],
  includeManifestIcons: true,
  disable: false,
  manifest: {
    name: 'Wildlings',
    short_name: 'Wildlings',
    description: 'Offline-first tracker for time spent outdoors.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F2F0E5',
    theme_color: '#2B4B3F',
  },
  workbox: {
    navigateFallback: '/index.html',
  },
  injectManifest: {},
};

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    VitePWA(pwaOptions),
  ],
});
