import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  base: '/ostetrixie/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Ostetrixie',
        short_name: 'Ostetrixie',
        lang: 'it',
        display: 'standalone',
        id: '/ostetrixie/',
        start_url: '/ostetrixie/',
        scope: '/ostetrixie/',
        theme_color: '#4FB874',
        background_color: '#FFFFFF',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,woff2,png,svg}'] }
    })
  ],
  test: { environment: 'node', setupFiles: [] }
});
