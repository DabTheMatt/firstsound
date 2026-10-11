import { expect, test, type Page } from '@playwright/test'
import { boot, controlsOutsideViewport, REPRESENTATIVE_THEMES, saveScreenshot } from './support'
const PHONE = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
] as const

async function geometry(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector('header')?.getBoundingClientRect()
    const wave = document.querySelector('[data-attention-region="waveform"]')?.getBoundingClientRect()
    return {
      headerH: Math.round(header?.height ?? 0),
      waveH: Math.round(wave?.height ?? 0),
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      lang: document.documentElement.lang,
    }
  })
}

test.describe('Polish locale layout', () => {
  test('keeps English as the stored default and switches without leaving Technical', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await boot(page, { mode: 'technical', locale: 'en' })
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await saveScreenshot(page, 'en-technical-desktop.png')
    const before = await geometry(page)

    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('radio', { name: 'Polski', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
    await expect(page.getByRole('button', { name: 'Ustawienia', exact: true })).toBeVisible()
    const stored = await page.evaluate(() => ({
      locale: localStorage.getItem('field.uiLocale'),
      mode: localStorage.getItem('firstsound.uiMode'),
    }))
    expect(stored).toEqual({ locale: 'pl', mode: 'technical' })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('radio', { name: 'Techniczny', exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Przebieg', exact: true })).toBeVisible()
    await saveScreenshot(page, 'pl-technical-desktop.png')
    const after = await geometry(page)
    expect(after.lang).toBe('pl')
    expect(Math.abs(after.headerH - before.headerH)).toBeLessThanOrEqual(2)
    expect(after.scrollW).toBeLessThanOrEqual(after.innerW + 1)
    if (before.waveH > 0 && after.waveH > 0) {
      expect(Math.abs(after.waveH - before.waveH)).toBeLessThanOrEqual(4)
    }
  })

  test('keeps the language control in settings', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await boot(page, { locale: 'pl', mode: 'technical' })
    await expect(page.locator('header').getByRole('radio', { name: 'Polski' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Ustawienia', exact: true }).click()
    await expect(page.getByRole('radio', { name: 'Polski', exact: true })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'English', exact: true })).toBeVisible()
    await saveScreenshot(page, 'pl-settings-language.png')
  })

  for (const viewport of PHONE) {
    test(`keeps Polish controls inside ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await boot(page, { locale: 'pl', mode: 'technical' })
      await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
      const box = await geometry(page)
      expect(box.scrollW, `scroll ${box.scrollW} > ${box.innerW}`).toBeLessThanOrEqual(box.innerW + 1)
      const outside = await controlsOutsideViewport(page)
      expect(outside, outside.join(', ')).toEqual([])
      if (viewport.width === 320 || viewport.width === 390 || viewport.width === 768) {
        await saveScreenshot(page, `pl-${viewport.width}.png`)
      }
    })
  }

  for (const theme of REPRESENTATIVE_THEMES) {
    test(`renders Polish on ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await boot(page, { locale: 'pl', theme })
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
      const outside = await controlsOutsideViewport(page)
      expect(outside, outside.join(', ')).toEqual([])
      if (theme === 'warm-paper' || theme === 'dusk') {
        await saveScreenshot(page, `pl-theme-${theme}.png`)
      }
    })
  }

  test('stays inside the viewport at interface 150% and text 200%', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await boot(page, { locale: 'pl', a11y: { interfaceScale: 1.5, textScale: 2 } })
    await expect(page.locator('html')).toHaveAttribute('data-text-scale', '200')
    const outside = await controlsOutsideViewport(page)
    expect(outside, outside.join(', ')).toEqual([])
    const box = await geometry(page)
    expect(box.scrollW).toBeLessThanOrEqual(box.innerW + 1)
    await saveScreenshot(page, 'pl-scale-150-text-200.png')
  })

  test('opens Polish settings, accessibility, and markers', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await boot(page, { locale: 'pl' })
    await page.getByRole('button', { name: 'Ustawienia', exact: true }).click()
    await expect(page.getByRole('radio', { name: 'English', exact: true })).toBeVisible()
    await saveScreenshot(page, 'pl-settings.png')
    await page.getByRole('button', { name: 'Dostępność', exact: true }).click()
    await expect(page.getByText('Zwiększona widoczność kontrolek')).toBeVisible()
    await expect(page.getByText('Ogranicz ruch', { exact: true })).toBeVisible()
    await saveScreenshot(page, 'pl-a11y.png')
    await page.keyboard.press('Escape')
    const markers = page.getByRole('button', { name: 'Znaczniki', exact: true })
    if (await markers.count()) {
      await markers.first().click()
      await expect(page.getByText('Wczytaj nagranie, zanim dodasz znacznik.')).toBeVisible()
      const next = page.getByRole('button', { name: 'Następny znacznik', exact: true })
      await expect(next).toBeVisible()
      const clipped = await next.evaluate((el) => {
        const button = el.getBoundingClientRect()
        const panel = el.closest('[data-marker-sheet]')?.getBoundingClientRect()
        if (!panel) return true
        return button.right > panel.right + 1 || button.left < panel.left - 1
      })
      expect(clipped).toBe(false)
      await saveScreenshot(page, 'pl-markers.png')
    }
  })
})
