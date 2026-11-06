import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
  css: { postcss: { plugins: [tailwindcss()] } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
