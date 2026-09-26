import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const base = '/finance-pwa/'

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

function contentSecurityPolicyMeta(): Plugin {
  return {
    name: 'content-security-policy-meta',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace(
        /<meta charset="UTF-8" \/>/,
        `$&\n    <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}" />`,
      ),
  }
}

function githubPagesFallback(): Plugin {
  let outDir = 'dist'
  return {
    name: 'github-pages-fallback',
    apply: 'build',
    configResolved: (config) => {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle: () => {
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

export default defineConfig({
  base,
  build: {
    assetsInlineLimit: 0,
  },
  plugins: [
    react(),
    contentSecurityPolicyMeta(),
    githubPagesFallback(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        id: base,
        name: 'Luka',
        short_name: 'Luka',
        description: 'Finanzas personales que viven solo en tu teléfono.',
        lang: 'es-CO',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        theme_color: '#ffffff',
        background_color: '#ffffff',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,webmanifest}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
