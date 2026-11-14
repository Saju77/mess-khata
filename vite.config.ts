import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function getBuildVersion(): string {
  let gitSha = ''
  try {
    gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    gitSha = ''
  }
  const timestamp = new Date().toISOString()
  return gitSha ? `${gitSha}-${timestamp}` : timestamp
}

// Compute once so the JS bundle and version.json always contain the exact
// same value. Two separate calls would produce different timestamps, making
// every client think a new deployment exists (and reload forever).
const BUILD_VERSION = getBuildVersion()

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(BUILD_VERSION),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'মেস খাতা — মেসের হিসাব',
        short_name: 'মেস খাতা',
        description: 'মিল, বাজার, জমা ও মেসের সব হিসাব এক জায়গায়।',
        lang: 'bn',
        theme_color: '#0f766e',
        background_color: '#f7f8f5',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Network First for navigation (HTML)
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              expiration: { maxEntries: 10, maxAgeSeconds: 24 * 60 * 60 },
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // Never cache the deployment version — a stale value would hide updates
            urlPattern: /\/version\.json$/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
    {
      name: 'generate-version-json',
      closeBundle() {
        const outDir = resolve(process.cwd(), 'dist')
        writeFileSync(
          resolve(outDir, 'version.json'),
          JSON.stringify({ version: BUILD_VERSION, builtAt: new Date().toISOString() }),
        )
      },
    },
  ],
})