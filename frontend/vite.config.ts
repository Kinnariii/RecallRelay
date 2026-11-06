import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const site = URL.parse(loadEnv(mode, process.cwd(), 'VITE_').VITE_PUBLIC_URL ?? '')
  const shareOrigin = site && /^https?:$/.test(site.protocol) ? site.origin : null

  return {
    plugins: [react(), {
      name: 'recallrelay-share-image',
      transformIndexHtml: html => shareOrigin
        ? html.replace('content="/recallrelay-og.png"', `content="${shareOrigin}/recallrelay-og.png"`)
        : html,
    }],
    server: { fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
    css: { postcss: { plugins: [tailwindcss()] } },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})
