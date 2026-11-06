import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const screenshotWidths = [1440, 390] as const

export async function sizeScreen(page: Page, width: number) {
  await page.setViewportSize({ width, height: width === 1440 ? 1080 : width === 390 ? 844 : 900 })
}

export async function captureScreen(page: Page, name: string, fullPage = true) {
  if (process.env.RECALLRELAY_SCREENSHOTS !== '1') return
  const width = page.viewportSize()!.width
  if (width !== 1440 && width !== 390) return
  await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0) })
  const directory = new URL(`../../docs/screens/${width}/`, import.meta.url)
  await mkdir(directory, { recursive: true })
  await page.screenshot({
    path: fileURLToPath(new URL(`${name}.png`, directory)), fullPage, animations: 'disabled',
    style: name === 'repeat-approval' ? undefined : '.toast-stack { visibility: hidden; }',
  })
}

export async function auditScreen(page: Page, name: string) {
  const width = page.viewportSize()!.width
  await page.evaluate(async () => {
    await Promise.allSettled(document.getAnimations()
      .filter(animation => animation.effect?.getTiming().iterations === 1)
      .map(animation => animation.finished))
  })
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(violations.filter(issue => issue.impact === 'serious' || issue.impact === 'critical')
    .map(issue => ({ id: issue.id, targets: issue.nodes.map(node => node.target) })), `${name} at ${width}px`).toEqual([])
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  if (width === 390) {
    const smallTargets = await page.evaluate(() => {
      const scope = document.querySelector('dialog[open]') ?? document
      return [...scope.querySelectorAll<HTMLElement>('a[href], button, summary, select, textarea, input:not([type=checkbox])')]
        .filter(element => !element.matches('.skip-link, :disabled, [type=hidden]') && element.getClientRects().length)
        .filter(element => {
          const { width, height } = element.getBoundingClientRect()
          return width > 0 && height > 0 && (width < 43.9 || height < 43.9)
        })
        .map(element => element.getAttribute('aria-label') ?? element.innerText)
    })
    expect(smallTargets, `${name} small touch targets`).toEqual([])
  }
}
