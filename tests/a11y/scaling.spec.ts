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
    await expect(page.locator('html')).toHaveAttribute('data-interface-scale', '125')
    await expect(page.locator('html')).toHaveAttribute('data-text-scale', '200')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('field.accessibility.v1') || '{}'))
    expect(stored.interfaceScale).toBe(1.25)
    expect(stored.textScale).toBe(2)
    expect(stored.version).toBe(1)
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

  test('stays inside a narrow viewport at maximum text size', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await boot(page, { a11y: { interfaceScale: 1.25, textScale: 2 } })
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible()
    expect(await controlsOutsideViewport(page)).toEqual([])
    await openAccess(page)
    await expect(page.getByRole('slider', { name: 'Interface Size' })).toBeVisible()
  })
})
