import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const appVersion = process.env.npm_package_version ?? '0.0.0'
const buildTime = new Date().toISOString()
/** Bumped for Mapbox migration — invalidates old Leaflet PWA asset caches. */
const cacheVersion = `pack-${appVersion}-mapbox`

export default defineConfig({
  assetsInclude: ['**/*.wasm'],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'pack-icon.png'],
      manifest: {
        name: 'Pack',
        short_name: 'Pack',
        description: 'Personal relationship memory tool',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2,wasm,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('supabase.co'),
            handler: 'NetworkOnly',
            options: {
              cacheName: `${cacheVersion}-supabase-network-only`,
            },
          },
          {
            urlPattern: ({ request, url }) =>
              request.mode === 'navigate' || url.pathname === '/',
            handler: 'NetworkFirst',
            options: {
              cacheName: `${cacheVersion}-html`,
              networkTimeoutSeconds: 4,
            },
          },
          {
            urlPattern: ({ request, url }) =>
              request.destination !== 'document' && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: `${cacheVersion}-static-assets`,
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: `${cacheVersion}-google-fonts`,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
