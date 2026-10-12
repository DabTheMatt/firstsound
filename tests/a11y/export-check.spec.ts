import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { boot } from './support'

const ARTIFACTS = '/opt/cursor/artifacts'
const PHONES = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
] as const

async function loadDemo(page: Page): Promise<void> {
  await page.locator('[data-settings-toggle]').click()
  await page.getByRole('dialog').getByRole('button', { name: /^(Generate demo sample|Wygeneruj sample demo)$/ }).click()
  await expect(page.locator('[data-export-open]')).toBeEnabled({ timeout: 20_000 })
}

async function openExport(page: Page): Promise<void> {
  const opener = page.locator('[data-export-open]')
  await opener.click()
}

test.describe('Export check', () => {
  test('reads the settings, stays in the dialog, and switches language without resetting them', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await boot(page, { mode: 'technical', locale: 'en' })
    await expect(page.locator('[data-export-open]')).toBeDisabled()
    await loadDemo(page)
    await page.keyboard.press('Escape')
    await openExport(page)
    const dialog = page.locator('[role="dialog"][aria-labelledby="export-title"]')
    const check = dialog.locator('[data-export-check]')
    await expect(dialog.getByRole('heading', { name: 'Export check' })).toBeVisible()
    await expect(dialog.getByText('Settings valid')).toBeVisible()
    await expect(check.getByText('WAV', { exact: true })).toBeVisible()
    await expect(dialog.locator('select').nth(0).locator('option')).toHaveCount(1)
    const rate = dialog.locator('select').nth(1)
    await expect(rate).toHaveValue('original')
    await rate.selectOption('48000')
    await expect(check.getByText('48 kHz')).toBeVisible()

    await dialog.locator('[data-dialog-initial]').focus()
    for (let step = 0; step < 8; step++) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(() => {
        const root = document.querySelector('[role="dialog"][aria-labelledby="export-title"]')
        return Boolean(root?.contains(document.activeElement))
      })
      expect(inside).toBe(true)
    }
    await page.keyboard.press('Shift+Tab')
    const stillInside = await page.evaluate(() => {
      const root = document.querySelector('[role="dialog"][aria-labelledby="export-title"]')
      return Boolean(root?.contains(document.activeElement))
    })
    expect(stillInside).toBe(true)

    const axe = await new AxeBuilder({ page })
      .include('[role="dialog"][aria-labelledby="export-title"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(axe.violations, axe.violations.map((item) => item.id).join(', ')).toEqual([])

    const before = await rate.inputValue()
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('[data-settings-toggle]')?.click()
    })
    await page.evaluate(() => {
      const polish = [...document.querySelectorAll<HTMLElement>('[role="radio"]')].find((node) => node.textContent?.trim() === 'Polski')
      polish?.click()
    })
    await expect(dialog.getByRole('heading', { name: 'Kontrola eksportu' })).toBeVisible()
    await expect(dialog.getByText('Ustawienia poprawne')).toBeVisible()
    await expect(rate).toHaveValue(before)
    await expect(dialog).toBeVisible()
    await page.screenshot({ path: `${ARTIFACTS}/export-check-pl.png` })
  })

  test('keeps simple export to format, range, and warnings', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await boot(page, { mode: 'simple', locale: 'en' })
    await loadDemo(page)
    await page.keyboard.press('Escape')
    await page.locator('[data-simple-export]').click()
    const check = page.locator('[data-export-check]')
    await expect(check.getByRole('heading', { name: 'Export check' })).toBeVisible()
    await expect(check.getByText('Format', { exact: true })).toBeVisible()
    await expect(check.getByText('Export range', { exact: true })).toBeVisible()
    await expect(check.getByText('Bit depth')).toHaveCount(0)
    await expect(check.getByText('Settings valid')).toBeVisible()
    await expect(page.locator('[data-export-dialog] button[type="submit"]')).toBeVisible()
    await page.screenshot({ path: `${ARTIFACTS}/export-check-simple.png` })
  })

  for (const viewport of PHONES) {
    test(`fits the export dialog at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await boot(page, { mode: 'technical', locale: 'pl' })
      await loadDemo(page)
      await openExport(page)
      const dialog = page.locator('[role="dialog"][aria-labelledby="export-title"]')
      await expect(dialog.getByRole('heading', { name: 'Kontrola eksportu' })).toBeVisible()
      const box = await page.evaluate(() => {
        const root = document.querySelector('[data-export-dialog]')
        const body = root?.querySelector('[data-export-body]')
        const check = root?.querySelector('[data-export-check]')
        check?.scrollIntoView({ block: 'nearest' })
        const button = root?.querySelector('button[type="submit"]')
        const buttonBox = button?.getBoundingClientRect()
        const bodyBox = body?.getBoundingClientRect()
        const panel = root?.getBoundingClientRect()
        return {
          scrollW: document.documentElement.scrollWidth,
          innerW: window.innerWidth,
          innerH: window.innerHeight,
          panelRight: panel?.right ?? 0,
          panelLeft: panel?.left ?? 0,
          buttonTop: buttonBox?.top ?? -1,
          buttonBottom: buttonBox?.bottom ?? -1,
          buttonHeight: buttonBox?.height ?? 0,
          bodyBottom: bodyBox?.bottom ?? -1,
          text: button?.textContent ?? '',
        }
      })
      expect(box.scrollW).toBeLessThanOrEqual(box.innerW + 1)
      expect(box.panelLeft).toBeGreaterThanOrEqual(-1)
      expect(box.panelRight).toBeLessThanOrEqual(box.innerW + 1)
      expect(box.buttonHeight).toBeGreaterThanOrEqual(40)
      expect(box.buttonTop).toBeGreaterThanOrEqual(0)
      expect(box.buttonBottom).toBeLessThanOrEqual(box.innerH + 1)
      expect(box.bodyBottom).toBeLessThanOrEqual(box.buttonTop + 1)
      expect(box.text).toContain('Eksportuj')
      if (viewport.width === 320 || viewport.width === 390) {
        await page.screenshot({ path: `${ARTIFACTS}/export-check-${viewport.width}.png` })
      }
    })
  }
})
