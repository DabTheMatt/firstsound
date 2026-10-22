import { expect, test } from '@playwright/test'
import { boot, loadDemo, openAccess, prepareAccess } from './support'

test.describe('sensory comfort', () => {
  test('toggles the master, keeps choices, and restores defaults', async ({ page }) => {
    await boot(page)
    await openAccess(page)
    const dialog = page.getByRole('dialog', { name: 'FIELD ACCESS' })
    const master = dialog.getByRole('switch', { name: 'Sensory Comfort' })
    await expect(master).not.toBeChecked()
    await expect(page.locator('html')).toHaveAttribute('data-sensory-comfort', 'off')
    await expect(page.locator('html')).toHaveAttribute('data-calm-meters', 'off')
    await expect(dialog.getByRole('radio', { name: 'Low' })).toBeEnabled()
    await master.check()
    await expect(page.locator('html')).toHaveAttribute('data-sensory-comfort', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-visual-activity', 'standard')
    await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'full')
    await expect(page.locator('html')).toHaveAttribute('data-calm-meters', 'off')
    await expect(page.locator('html')).toHaveAttribute('data-calm-spectrum', 'off')
    await expect(page.locator('html')).toHaveAttribute('data-visual-effects', 'full')
    await expect(page.locator('html')).toHaveAttribute('data-quiet-notices', 'off')
    await dialog.getByRole('switch', { name: 'Calm Spectrum' }).check()
    await dialog.getByRole('radio', { name: 'Low' }).check()
    await expect(page.locator('html')).toHaveAttribute('data-calm-spectrum', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-visual-activity', 'low')
    await page.reload()
    await page.getByRole('button', { name: 'Settings', exact: true }).first().waitFor()
    await expect(page.locator('html')).toHaveAttribute('data-sensory-comfort', 'off')
    await expect(page.locator('html')).toHaveAttribute('data-calm-spectrum', 'off')
    await openAccess(page)
    await page.getByRole('button', { name: 'Restore accessibility defaults' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-sensory-comfort', 'off')
    await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'off')
  })

  test('keeps reduced motion when sensory comfort is off, including the system request', async ({ page }) => {
    await boot(page, { reducedMotion: 'reduce' })
    await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-sensory-comfort', 'off')
    await expect(page.locator('html')).toHaveAttribute('data-decorative-motion', 'reduce')
    await expect(page.locator('html')).toHaveAttribute('data-calm-meters', 'off')
    const transition = await page.locator('button').first().evaluate((el) => getComputedStyle(el).transitionProperty)
    expect(transition).toBe('none')
  })

  test('does not stop playback while comfort, meters, spectrum, and motion change', async ({ page }) => {
    await boot(page)
    await loadDemo(page)
    await page.getByRole('button', { name: 'Play', exact: true }).first().click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
    await openAccess(page)
    const dialog = page.getByRole('dialog', { name: 'FIELD ACCESS' })
    await dialog.getByRole('switch', { name: 'Sensory Comfort' }).check()
    await dialog.getByRole('switch', { name: 'Calm Meters' }).click()
    await dialog.getByRole('switch', { name: 'Calm Spectrum' }).click()
    await dialog.getByRole('switch', { name: 'Reduced Motion' }).check()
    await page.keyboard.press('Escape')
    await page.getByRole('tab', { name: 'EQ' }).click()
    await page.getByRole('tab', { name: 'FFT' }).click()
    await page.getByRole('tab', { name: 'Wave' }).click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
  })

  test('keeps focus, high visibility, and large type with sensory comfort', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await boot(page, { theme: 'warm-paper' })
    await prepareAccess(page, {
      interfaceScale: 150,
      textScale: 200,
      switches: [
        'Sensory Comfort',
        'Reduce Decorative Motion',
        'Calm Meters',
        'Calm Spectrum',
        'Reduce Visual Effects',
        'Quiet Notifications',
        'Enhanced Focus Visibility',
        'High Visibility Controls',
      ],
      radios: ['Low'],
      checks: ['High Contrast / Low Vision Theme'],
    })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'warm-paper')
    await expect(page.locator('html')).toHaveAttribute('data-sensory-comfort', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-high-visibility', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-low-vision', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-focus', 'enhanced')
    const playhead = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--field-playhead-width').trim())
    expect(playhead).toBe('3px')
    await expect(page.locator('html')).toHaveAttribute('data-text-scale', '200')
    await expect(page.locator('html')).toHaveAttribute('data-interface-scale', '150')
    const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim())
    expect(accent.toLowerCase()).toBe('#ffe600')
    await page.getByRole('button', { name: 'Settings', exact: true }).focus()
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement as HTMLElement).outlineStyle)
    expect(ring).not.toBe('none')
    await openAccess(page)
    const dialog = page.getByRole('dialog', { name: 'FIELD ACCESS' })
    const master = dialog.getByRole('switch', { name: 'Sensory Comfort' })
    await master.scrollIntoViewIfNeeded()
    await expect(master).toBeVisible()
    await expect(master).toBeChecked()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)
    expect(overflow).toBe(false)
  })

  test('fits the comfort controls on narrow phones', async ({ page }) => {
    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 700 })
      await boot(page)
      await prepareAccess(page, { interfaceScale: 150, textScale: 200, switches: ['Sensory Comfort'] })
      await openAccess(page)
      const dialog = page.getByRole('dialog', { name: 'FIELD ACCESS' })
      const master = dialog.getByRole('switch', { name: 'Sensory Comfort' })
      await master.scrollIntoViewIfNeeded()
      await expect(master).toBeVisible()
      await expect(dialog.getByRole('switch', { name: 'Quiet Notifications' })).toBeEnabled()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)
      expect(overflow).toBe(false)
    }
  })
})
