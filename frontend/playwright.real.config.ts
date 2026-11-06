import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'real.spec.ts',
  outputDir: 'test-results/real',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'npm run stub',
      wait: { stdout: /contract stub listening/ },
      env: { STUB_PORT: '4400', STUB_COLD_START: '1', STUB_FAIL_ONCE: '1' },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      env: { VITE_USE_MOCK: 'false', VITE_API_URL: 'http://127.0.0.1:4400' },
    },
  ],
})
