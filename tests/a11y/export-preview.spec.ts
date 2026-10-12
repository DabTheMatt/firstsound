import AxeBuilder from '@axe-core/playwright'
import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { boot, prepareAccess } from './support'

mkdirSync('/opt/cursor/artifacts', { recursive: true })

const PHONES = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
] as const

async function loadDemo(page: Page): Promise<void> {
  await page.locator('[data-settings-toggle]').click()
  await page.getByRole('dialog').getByRole('button', { name: /^(Generate demo sample|Wygeneruj sample demo)$/ }).click()
  await expect(page.locator('[data-export-open], [data-simple-export]').first()).toBeEnabled({ timeout: 20_000 })
  await page.keyboard.press('Escape')
}

async function openExport(page: Page): Promise<void> {
  const button = page.locator('[data-export-open]')
  if (!(await button.isVisible().catch(() => false))) {
    await page.locator('[data-settings-toggle]').click()
    await expect(button).toBeVisible()
  }
  await button.click()
  await expect(page.locator('[data-export-preview]')).toBeVisible()
}

function dialog(page: Page) {
  return page.locator('[role="dialog"][aria-labelledby="export-title"]')
}

function preview(page: Page) {
  return page.locator('[data-export-preview]')
}

async function playheadText(page: Page): Promise<string> {
  return page.locator('[title="Playhead"], [title="Głowica"]').first().innerText()
}

test.describe('Export preview', () => {
  test('previews, stops, and leaves the main transport alone', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await boot(page, { mode: 'technical', locale: 'en' })
    await loadDemo(page)

    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    await expect.poll(() => playheadText(page)).not.toBe('00:00.000')
    const moving = await playheadText(page)

    await openExport(page)
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    await expect.poll(() => playheadText(page)).not.toBe('00:00.000')
    expect(await playheadText(page)).not.toBe('00:00.000')
    const root = dialog(page)
    await expect(root.getByRole('heading', { name: 'Export preview' })).toBeVisible()
    await expect(preview(page).getByText('Processed audio, not the encoded file.')).toBeVisible()
    const start = preview(page).locator('[data-export-preview-start]')
    await expect(start).toBeDisabled()
    await expect(preview(page).getByText('Stop playback before starting export preview.')).toBeVisible()
    await preview(page).locator('[data-export-preview-pause]').click()
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
    const held = await playheadText(page)
    expect(held).not.toBe('00:00.000')
    expect(held >= moving || held !== '00:00.000').toBe(true)

    await expect(start).toBeEnabled()
    await start.click()
    await expect(preview(page)).toHaveAttribute('data-preview-state', 'playing', { timeout: 30_000 })
    await expect(preview(page).getByText('Preview playing')).toBeVisible()
    await expect(page.locator('.sr-only[aria-live="polite"]')).toContainText('Preview playing')
    expect(await playheadText(page)).toBe(held)
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()

    await preview(page).locator('[data-export-preview-stop]').click()
    await expect(preview(page)).toHaveAttribute('data-preview-state', 'ready')
    await expect(preview(page).getByText('Preview stopped')).toBeVisible()
    expect(await playheadText(page)).toBe(held)

    await start.click()
    await expect(preview(page)).toHaveAttribute('data-preview-state', 'playing', { timeout: 30_000 })
    await root.locator('select').nth(1).selectOption('48000')
    await expect(preview(page)).toHaveAttribute('data-preview-state', 'idle')
    expect(await playheadText(page)).toBe(held)

    await preview(page).locator('select').selectOption('5')
    await start.click()
    await expect(preview(page)).toHaveAttribute('data-preview-state', 'playing', { timeout: 30_000 })
    await page.keyboard.press('Escape')
    await expect(root).toBeHidden()
    expect(await playheadText(page)).toBe(held)
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()

    await openExport(page)
    await expect(preview(page)).toHaveAttribute('data-preview-state', 'idle')
    await page.screenshot({ path: '/opt/cursor/artifacts/export-preview-en.png' })
  })

  test('reaches stop from the keyboard and keeps space inside the dialog', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await boot(page, { mode: 'technical', locale: 'en' })
    await loadDemo(page)
    await openExport(page)
    const start = preview(page).locator('[data-export-preview-start]')
    await start.focus()
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
    await expect(preview(page)).toHaveAttribute('data-preview-state', 'playing', { timeout: 30_000 })
    await page.keyboard.press('Tab')
    await expect(preview(page).locator('[data-export-preview-stop]')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(preview(page)).toHaveAttribute('data-preview-state', 'ready')
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  })

  test('uses Polish labels and does not stop a preview when the language changes', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await boot(page, { mode: 'technical', locale: 'pl' })
    await loadDemo(page)
    await openExport(page)
    const root = dialog(page)
    await expect(root.getByRole('heading', { name: 'Odsłuch eksportu' })).toBeVisible()
    await expect(preview(page).getByRole('button', { name: 'Odsłuchaj' })).toBeVisible()
    await expect(preview(page).getByRole('button', { name: 'Zatrzymaj odsłuch' })).toBeVisible()
    await expect(preview(page).getByText('Przetworzone audio, nie zakodowany plik.')).toBeVisible()
    await preview(page).locator('[data-export-preview-start]').click()
    await expect(preview(page)).toHaveAttribute('data-preview-state', 'playing', { timeout: 30_000 })
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('[data-settings-toggle]')?.click()
    })
    await page.evaluate(() => {
      const english = [...document.querySelectorAll<HTMLElement>('[role="radio"]')].find((node) => node.textContent?.trim() === 'English')
      english?.click()
    })
    await expect(root.getByRole('heading', { name: 'Export preview' })).toBeVisible()
    await expect(preview(page)).toHaveAttribute('data-preview-state', 'playing')
    await page.screenshot({ path: '/opt/cursor/artifacts/export-preview-pl.png' })
    await page.keyboard.press('Escape')
    await expect(root).toBeHidden()
  })

  test('stays compact on phone widths', async ({ page }) => {
    for (const viewport of PHONES) {
      await page.setViewportSize(viewport)
      await boot(page, { mode: 'technical', locale: 'en' })
      await loadDemo(page)
      await openExport(page)
      await preview(page).scrollIntoViewIfNeeded()
      const box = await page.evaluate(() => {
        const root = document.querySelector('[data-export-dialog]')
        const section = root?.querySelector('[data-export-preview]')
        const start = section?.querySelector('[data-export-preview-start]')
        const stop = section?.querySelector('[data-export-preview-stop]')
        const startBox = start?.getBoundingClientRect()
        const stopBox = stop?.getBoundingClientRect()
        const panel = root?.getBoundingClientRect()
        return {
          scrollW: document.documentElement.scrollWidth,
          innerW: window.innerWidth,
          panelLeft: panel?.left ?? -1,
          panelRight: panel?.right ?? 9999,
          startH: startBox?.height ?? 0,
          stopH: stopBox?.height ?? 0,
          startRight: startBox?.right ?? 9999,
          stopRight: stopBox?.right ?? 9999,
          startLeft: startBox?.left ?? -1,
          stopLeft: stopBox?.left ?? -1,
        }
      })
      expect(box.scrollW, `${viewport.width}`).toBeLessThanOrEqual(box.innerW + 1)
      expect(box.panelLeft).toBeGreaterThanOrEqual(-1)
      expect(box.panelRight).toBeLessThanOrEqual(box.innerW + 1)
      expect(box.startH).toBeGreaterThanOrEqual(40)
      expect(box.stopH).toBeGreaterThanOrEqual(40)
      expect(box.startLeft).toBeGreaterThanOrEqual(box.panelLeft - 1)
      expect(box.stopLeft).toBeGreaterThanOrEqual(box.panelLeft - 1)
      expect(box.startRight).toBeLessThanOrEqual(box.panelRight + 1)
      expect(box.stopRight).toBeLessThanOrEqual(box.panelRight + 1)
      if (viewport.width === 320 || viewport.width === 390) {
        await page.screenshot({ path: `/opt/cursor/artifacts/export-preview-${viewport.width}.png` })
      }
    }
  })

  test('shows a plain preview in simple mode', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await boot(page, { mode: 'simple', locale: 'en' })
    await loadDemo(page)
    await page.locator('[data-simple-export]').click()
    const section = page.locator('[data-export-dialog] [data-export-preview]')
    await expect(section.getByRole('heading', { name: 'Export preview' })).toBeVisible()
    await expect(section.getByRole('button', { name: 'Preview', exact: true })).toBeEnabled()
    await expect(section.getByText('Playback speed is not part of the export render.')).toHaveCount(0)
    await section.locator('[data-export-preview-start]').click()
    await expect(section).toHaveAttribute('data-preview-state', 'playing', { timeout: 30_000 })
    await section.locator('[data-export-preview-stop]').click()
    await expect(section).toHaveAttribute('data-preview-state', 'ready')
    await page.screenshot({ path: '/opt/cursor/artifacts/export-preview-simple.png' })
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-export-dialog]')).toHaveCount(0)
  })

  test('stays calm in sensory mode and across themes, scale, and reduced motion', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await boot(page, { mode: 'sensory', locale: 'en', reducedMotion: 'reduce' })
    await loadDemo(page)
    await openExport(page)
    const motion = await preview(page).evaluate((el) => getComputedStyle(el).animationName)
    expect(motion === 'none' || motion === '').toBe(true)
    await expect(preview(page).locator('canvas, svg')).toHaveCount(0)
    await expect(preview(page).getByRole('button', { name: 'Preview', exact: true })).toBeVisible()
    await page.screenshot({ path: '/opt/cursor/artifacts/export-preview-sensory.png' })
    await page.keyboard.press('Escape')

    await page.setViewportSize({ width: 1280, height: 800 })
    await boot(page, { mode: 'technical', locale: 'en', reducedMotion: 'reduce' })
    await prepareAccess(page, {
      interfaceScale: 150,
      textScale: 200,
      switches: ['High Visibility Controls', 'Sensory Comfort'],
    })
    await loadDemo(page)
    await openExport(page)
    const axe = await new AxeBuilder({ page })
      .include('[role="dialog"][aria-labelledby="export-title"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(axe.violations, axe.violations.map((item) => item.id).join(', ')).toEqual([])
    await page.screenshot({ path: '/opt/cursor/artifacts/export-preview-scaled.png' })
    await page.keyboard.press('Escape')

    for (const theme of ['studio-dark', 'soft-slate', 'warm-paper', 'dusk'] as const) {
      await boot(page, { mode: 'technical', locale: 'en', theme })
      await loadDemo(page)
      await openExport(page)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(preview(page).getByRole('heading', { name: 'Export preview' })).toBeVisible()
      if (theme === 'warm-paper' || theme === 'dusk') {
        await page.screenshot({ path: `/opt/cursor/artifacts/export-preview-${theme}.png` })
      }
      await page.keyboard.press('Escape')
    }
  })
})
