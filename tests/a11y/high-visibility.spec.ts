import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { boot, controlsOutsideViewport, expectNoAxeViolations, loadDemo, openAccess } from './support'

mkdirSync('/opt/cursor/artifacts', { recursive: true })

const HV = { highVisibility: true }

test.describe('high visibility controls', () => {
  test('is off until turned on, and a reload starts from the defaults', async ({ page }) => {
    await boot(page)
    await expect(page.locator('html')).toHaveAttribute('data-high-visibility', 'off')
    await openAccess(page)
    const toggle = page.getByRole('switch', { name: 'High Visibility Controls' })
    await expect(toggle).not.toBeChecked()
    await toggle.check()
    await expect(page.locator('html')).toHaveAttribute('data-high-visibility', 'on')
    await page.screenshot({ path: '/opt/cursor/artifacts/hv-access-on.png' })
    await page.getByRole('button', { name: 'Restore accessibility defaults' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-high-visibility', 'off')
    await expectNoAxeViolations(page)
    await page.reload()
    await page.getByRole('button', { name: /^(Settings|Menu)$/ }).first().waitFor()
    await expect(page.locator('html')).toHaveAttribute('data-high-visibility', 'off')
    const stored = await page.evaluate(() => localStorage.getItem('field.accessibility.v1'))
    expect(stored).toBeNull()
  })

  test('keeps a keyboard focus ring on representative themes', async ({ page }) => {
    for (const theme of ['studio-dark', 'soft-slate', 'warm-paper', 'dusk'] as const) {
      await boot(page, { theme, a11y: HV })
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(page.locator('html')).toHaveAttribute('data-high-visibility', 'on')
      await page.getByRole('button', { name: 'Settings', exact: true }).focus()
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

  test('thickens the playhead without moving its time anchor', async ({ page }) => {
    await boot(page, { a11y: HV })
    await loadDemo(page)
    const playhead = page.locator('[data-playhead]').first()
    await expect(playhead).toBeVisible()
    const box = await playhead.evaluate((el) => {
      const style = getComputedStyle(el)
      return {
        width: parseFloat(style.width),
        anchor: (el as HTMLElement).style.left,
        transform: style.transform,
        events: style.pointerEvents,
      }
    })
    expect(box.width).toBeGreaterThanOrEqual(3)
    expect(box.anchor.endsWith('%')).toBe(true)
    expect(box.transform).not.toBe('none')
    expect(box.events).toBe('none')
    await page.screenshot({ path: '/opt/cursor/artifacts/hv-playhead-studio-dark.png' })
  })

  test('does not overflow a narrow screen with larger controls', async ({ page }) => {
    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 700 })
      await boot(page, { a11y: { highVisibility: true, largerInterface: true } })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, String(width)).toBeLessThanOrEqual(1)
      const outside = await controlsOutsideViewport(page)
      expect(outside.filter((name) => name !== 'Settings'), String(width)).toEqual([])
      if (width === 320 || width === 390) {
        await page.screenshot({ path: `/opt/cursor/artifacts/hv-mobile-${width}.png` })
      }
    }
  })

  test('stays inside the page at the interface and text sizes', async ({ page }) => {
    const pairs = [
      { interfaceScale: 1, textScale: 1 },
      { interfaceScale: 1.25, textScale: 1.5 },
      { interfaceScale: 1.5, textScale: 2 },
    ] as const
    for (const pair of pairs) {
      await page.setViewportSize({ width: 390, height: 844 })
      await boot(page, { a11y: { highVisibility: true, ...pair } })
      await expect(page.locator('html')).toHaveAttribute('data-high-visibility', 'on')
      await expect(page.locator('html')).toHaveAttribute('data-interface-scale', String(pair.interfaceScale * 100))
      await expect(page.locator('html')).toHaveAttribute('data-text-scale', String(pair.textScale * 100))
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${pair.interfaceScale}/${pair.textScale}`).toBeLessThanOrEqual(1)
      if (pair.interfaceScale === 1.5) {
        await page.screenshot({ path: '/opt/cursor/artifacts/hv-scale-150-200.png' })
        await page.setViewportSize({ width: 320, height: 700 })
        const narrow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(narrow).toBeLessThanOrEqual(1)
        await page.screenshot({ path: '/opt/cursor/artifacts/hv-scale-320-150-200.png' })
      }
    }
  })

  test('scans Simple, Sensory, and Focus with high visibility on', async ({ page }) => {
    await boot(page, { mode: 'simple', a11y: HV })
    await expectNoAxeViolations(page)
    await boot(page, { mode: 'sensory', a11y: HV })
    await expectNoAxeViolations(page)
    await boot(page, { a11y: HV })
    await loadDemo(page)
    await page.getByRole('tab', { name: 'EQ', exact: true }).click()
    await page.getByRole('button', { name: 'Enter Focus Mode' }).click()
    await expect(page.getByRole('button', { name: 'Exit Focus Mode' })).toBeVisible()
    await expectNoAxeViolations(page)
  })
})
