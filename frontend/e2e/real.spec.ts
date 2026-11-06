import { expect, test } from '@playwright/test'
import { auditScreen, captureScreen, sizeScreen } from './uxHelpers'

test('uses the HTTP adapter for recovery, edits, approval, and pending refund status', async ({ page }) => {
  test.setTimeout(60_000)
  const health = '**/api/health'
  await page.route(health, route => route.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': '*' }, json: { ok: false } }))
  await sizeScreen(page, 1440)
  await page.goto('/setup')
  await expect(page.getByRole('heading', { name: 'Reconnecting to the sandbox…' })).toBeVisible()
  for (const width of [1440, 1024, 390]) {
    await sizeScreen(page, width)
    await captureScreen(page, 'reconnecting')
    await auditScreen(page, 'reconnecting')
  }
  await page.unroute(health)
  await expect(page.getByText('No demo orders yet')).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: 'Seed demo orders' }).click()
  await expect(page.getByText('STUB-CAP-order-1')).toBeVisible()
  await page.getByRole('link', { name: 'Continue to upload notice' }).click()
  await page.getByRole('combobox', { name: 'Use a sample notice' }).selectOption('0')
  await page.getByRole('button', { name: 'Extract with AI' }).click()
  await expect(page.getByRole('textbox', { name: 'Product SKU' })).toHaveValue('PB-340')
  await page.getByRole('textbox', { name: 'Last lot number' }).fill('251')
  await expect(page.getByRole('button', { name: 'Continue to review' })).toBeDisabled()
  const patch = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith('/api/recalls/stub-recall-1'))
  await page.getByRole('button', { name: 'Save edits' }).click()
  expect((await patch).ok()).toBe(true)
  await page.getByRole('button', { name: 'Continue to review' }).click()
  await expect(page.getByText('Recall plan · PB-340 · Lots B-200 to B-251')).toBeVisible()

  await page.getByRole('button', { name: 'Approve refunds' }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Approve and refund $24.00' }).click()
  await expect(page.getByRole('heading', { name: 'Refund needs attention' })).toBeVisible()
  let releaseRefresh!: () => void
  const refreshGate = new Promise<void>(resolve => { releaseRefresh = resolve })
  const refundsPath = '**/api/recalls/stub-recall-1/refunds'
  await page.route(refundsPath, async route => {
    await refreshGate
    await route.continue()
  })
  await page.getByRole('button', { name: 'Retry refund' }).click()
  await expect(page.getByRole('heading', { name: 'Refunds are processing' })).toBeVisible()
  try {
    for (const width of [1440, 1024, 390]) {
      await sizeScreen(page, width)
      await captureScreen(page, 'pending')
      await auditScreen(page, 'pending')
    }
  } finally {
    releaseRefresh()
    await page.unroute(refundsPath)
  }
  await expect(page.getByRole('heading', { name: '$24.00 refunded' })).toBeVisible({ timeout: 10000 })
  const table = page.getByRole('table', { name: 'Refund details' })
  await expect(table.getByText('STUB-PARTIAL-REFUND')).toBeVisible()
  await expect(table.getByText('recall-stub-recall-1-order-order-1-attempt-2')).toBeVisible()
  await page.getByRole('button', { name: 'Approve again' }).click()
  await expect(page.getByText('Already refunded. No duplicate created.')).toBeVisible()
})
