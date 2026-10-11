import { expect, test } from '@playwright/test'
import { boot, controlsOutsideViewport, loadDemo, openAccess } from './support'

test.describe('interface and text scaling', () => {
  test('keeps the two sizes independent and restores defaults', async ({ page }) => {
    await boot(page)
    await openAccess(page)
    const dialog = page.getByRole('dialog', { name: 'FIELD ACCESS' })
    await dialog.getByRole('button', { name: 'Interface Size 125%' }).click()
    await dialog.getByRole('button', { name: 'Text Size 200%' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-interface-scale', '125')
    await expect(page.locator('html')).toHaveAttribute('data-text-scale', '200')
    const scales = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      return {
        interfaceScale: style.getPropertyValue('--field-interface-scale').trim(),
        textScale: style.getPropertyValue('--field-text-scale').trim(),
      }
    })
    expect(scales).toEqual({ interfaceScale: '1.25', textScale: '2' })
    await page.reload()
    await page.getByRole('button', { name: /^(Settings|Menu)$/ }).first().waitFor()
    await expect(page.locator('html')).toHaveAttribute('data-interface-scale', '100')
    await expect(page.locator('html')).toHaveAttribute('data-text-scale', '100')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('field.accessibility.v1') || '{}'))
    expect(stored.interfaceScale).toBeUndefined()
    expect(stored.textScale).toBeUndefined()
    await openAccess(page)
    await page.getByRole('button', { name: 'Restore accessibility defaults' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-interface-scale', '100')
    await expect(page.locator('html')).toHaveAttribute('data-text-scale', '100')
  })

  test('does not restart playback when either size changes', async ({ page }) => {
    await boot(page)
    await loadDemo(page)
    await page.getByRole('button', { name: 'Play', exact: true }).first().click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
    await openAccess(page)
    const dialog = page.getByRole('dialog', { name: 'FIELD ACCESS' })
    await dialog.getByRole('button', { name: 'Interface Size 150%' }).click()
    await dialog.getByRole('button', { name: 'Text Size 175%' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-interface-scale', '150')
    await expect(page.locator('html')).toHaveAttribute('data-text-scale', '175')
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
  })

  test('keeps the waveform playhead fraction when the layout scale changes', async ({ page }) => {
    await boot(page)
    await loadDemo(page)
    const editor = page.getByRole('region', { name: /^Waveform,/ })
    await editor.focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    const before = await editor.locator('[class*="playhead"]').first().evaluate((el) => (el as HTMLElement).style.left)
    expect(before.endsWith('%')).toBe(true)
    expect(parseFloat(before)).toBeGreaterThan(0)
    await openAccess(page)
    const dialog = page.getByRole('dialog', { name: 'FIELD ACCESS' })
    await dialog.getByRole('button', { name: 'Interface Size 150%' }).click()
    await dialog.getByRole('button', { name: 'Text Size 200%' }).click()
    await page.keyboard.press('Escape')
    const after = await editor.locator('[class*="playhead"]').first().evaluate((el) => (el as HTMLElement).style.left)
    expect(after).toBe(before)
  })

  test('keeps scaling controls reachable at the maximum sizes', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await boot(page, { a11y: { interfaceScale: 1.5, textScale: 2, largerInterface: true } })
    await openAccess(page)
    const dialog = page.getByRole('dialog', { name: 'FIELD ACCESS' })
    await expect(dialog.getByRole('slider', { name: 'Interface Size' })).toBeVisible()
    await expect(dialog.getByRole('slider', { name: 'Text Size' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Restore accessibility defaults' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Back', exact: true })).toBeVisible()
    const titleSize = await dialog.getByRole('heading', { name: 'FIELD ACCESS' }).evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(titleSize).toBeGreaterThan(24)
    const overflow = await page.evaluate(() => {
      const root = document.documentElement
      return root.scrollWidth > root.clientWidth + 2
    })
    expect(overflow).toBe(false)
  })

  test('keeps sensory labels below the header at maximum sizes', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await boot(page, { mode: 'sensory', a11y: { interfaceScale: 1.5, textScale: 2 } })
    const overlap = await page.evaluate(() => {
      const header = document.querySelector('[data-region="sensory"] header')
      const rails = [...document.querySelectorAll('[data-region="sensory"] [class*="rail"]')]
      if (!header || rails.length === 0) return 'missing'
      const headerBottom = header.getBoundingClientRect().bottom
      const covered = rails.filter((rail) => rail.getBoundingClientRect().top + 1 < headerBottom)
      return covered.length === 0 ? 'ok' : 'covered'
    })
    expect(overlap).toBe('ok')
  })

  test('grows the play control with the text and keeps it level with Loop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await boot(page, { a11y: { interfaceScale: 1.5, textScale: 2 } })
    const box = await page.evaluate(() => {
      const play = document.querySelector('[data-guide-target="transport.play"]')
      const loop = document.querySelector('[aria-label="Loop selection"]')
      if (!(play instanceof HTMLElement) || !(loop instanceof HTMLElement)) return null
      const playBox = play.getBoundingClientRect()
      const loopBox = loop.getBoundingClientRect()
      const icon = play.querySelector('svg')?.getBoundingClientRect()
      return {
        play: playBox.height,
        icon: icon?.width ?? 0,
        delta: Math.abs(playBox.top + playBox.height / 2 - (loopBox.top + loopBox.height / 2)),
      }
    })
    expect(box).not.toBeNull()
    expect(box!.play).toBeGreaterThan(60)
    expect(box!.icon).toBeGreaterThan(30)
    expect(box!.delta).toBeLessThan(3)
  })

  test('reset application restores interface and text size', async ({ page }) => {
    await boot(page, { a11y: { interfaceScale: 1.5, textScale: 2 } })
    await expect(page.locator('html')).toHaveAttribute('data-text-scale', '200')
    await page.getByRole('button', { name: 'Reset application' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-interface-scale', '100')
    await expect(page.locator('html')).toHaveAttribute('data-text-scale', '100')
  })

  test('stays inside a narrow viewport at maximum text size', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await boot(page, { a11y: { interfaceScale: 1.25, textScale: 2 } })
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible()
    expect(await controlsOutsideViewport(page)).toEqual([])
    await openAccess(page)
    await expect(page.getByRole('slider', { name: 'Interface Size' })).toBeVisible()
  })
})
