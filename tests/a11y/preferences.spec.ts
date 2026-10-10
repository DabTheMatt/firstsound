import { expect, test } from '@playwright/test'
import { boot, controlsOutsideViewport, loadDemo, openAccess } from './support'

const ALL_ON = {
  reduceMotion: true,
  enhancedFocus: true,
  largerInterface: true,
  lowVision: false,
  showDescriptions: true,
  screenReaderOptimizations: false,
  shortcutsEnabled: true,
}

test.describe('FIELD ACCESS preferences', () => {
  test('applies each preference on its own', async ({ page }) => {
    await boot(page)
    await openAccess(page)
    await page.getByRole('switch', { name: 'Reduced Motion' }).check()
    await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'on')
    await page.getByRole('switch', { name: 'Reduced Motion' }).uncheck()
    await page.getByRole('switch', { name: 'Enhanced Focus Visibility' }).check()
    await expect(page.locator('html')).toHaveAttribute('data-focus', 'enhanced')
    await page.getByRole('switch', { name: 'Enhanced Focus Visibility' }).uncheck()
    await page.getByRole('switch', { name: 'Larger Controls' }).check()
    await expect(page.locator('html')).toHaveAttribute('data-ui-scale', 'large')
  })

  test('combines the three preferences and keeps them after reload', async ({ page }) => {
    await boot(page, { a11y: ALL_ON })
    await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-focus', 'enhanced')
    await expect(page.locator('html')).toHaveAttribute('data-ui-scale', 'large')
    await page.reload()
    await page.getByRole('radiogroup', { name: 'Interface mode' }).waitFor()
    await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-focus', 'enhanced')
    await expect(page.locator('html')).toHaveAttribute('data-ui-scale', 'large')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('field.a11y') || '{}'))
    expect(stored.reduceMotion).toBe(true)
    expect(stored.enhancedFocus).toBe(true)
    expect(stored.largerInterface).toBe(true)
  })

  test('does not stop playback when a preference changes', async ({ page }) => {
    await boot(page)
    await loadDemo(page)
    await page.getByRole('button', { name: 'Play', exact: true }).first().click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
    await openAccess(page)
    await page.getByRole('switch', { name: 'Reduced Motion' }).check()
    await page.getByRole('switch', { name: 'Enhanced Focus Visibility' }).check()
    await page.getByRole('switch', { name: 'Larger Controls' }).check()
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
  })

  test('follows the operating-system reduced-motion preference and the FIELD switch', async ({ page }) => {
    await boot(page, { mode: 'sensory', reducedMotion: 'reduce' })
    await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'on')
    const os = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    expect(os).toBe(true)
    const transition = await page.locator('button').first().evaluate((el) => getComputedStyle(el).transitionProperty)
    expect(transition).toBe('none')
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.getByRole('button', { name: 'Accessibility', exact: true }).click()
    const motion = page.getByRole('switch', { name: 'Reduced Motion' })
    await expect(motion).not.toBeChecked()
    await motion.check()
    await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'on')
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('keeps a keyboard focus ring in representative themes', async ({ page }) => {
    for (const theme of ['studio-dark', 'soft-slate', 'warm-paper', 'dusk'] as const) {
      await boot(page, { theme, a11y: { ...ALL_ON, reduceMotion: false } })
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await page.getByRole('button', { name: 'Settings', exact: true }).focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      const ring = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el) return { style: 'none', width: '0px' }
        const style = getComputedStyle(el)
        return { style: style.outlineStyle, width: style.outlineWidth }
      })
      expect(ring.style, theme).not.toBe('none')
      expect(parseFloat(ring.width), theme).toBeGreaterThanOrEqual(2)
    }
  })

  test('larger controls do not push primary actions off a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await boot(page, { a11y: ALL_ON })
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible()
    expect(await controlsOutsideViewport(page)).toEqual([])
  })
})
