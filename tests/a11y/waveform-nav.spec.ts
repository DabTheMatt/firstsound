import { expect, test } from '@playwright/test'
import { boot, loadDemo } from './support'

const WAVE_NAV = {
  reduceMotion: false,
  enhancedFocus: false,
  largerInterface: false,
  lowVision: false,
  showDescriptions: true,
  screenReaderOptimizations: false,
  shortcutsEnabled: true,
  dragFreeEditing: false,
  keyboardFirst: false,
  accessibleWaveform: true,
}

test.describe('accessible waveform navigation', () => {
  test('keeps keyboard access when the preference is off and remembers it when turned on', async ({ page }) => {
    await boot(page)
    await expect(page.locator('html')).toHaveAttribute('data-wave-nav', 'off')
    await expect(page.getByRole('button', { name: 'Open waveform navigation' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Settings', exact: true }).focus()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Accessibility', exact: true }).focus()
    await page.keyboard.press('Enter')
    const pref = page.getByRole('switch', { name: 'Accessible Waveform Navigation' })
    await expect(pref).not.toBeChecked()
    await pref.focus()
    await page.keyboard.press('Space')
    await expect(page.locator('html')).toHaveAttribute('data-wave-nav', 'on')
    await page.keyboard.press('Escape')
    await page.reload()
    await page.getByRole('button', { name: 'Settings', exact: true }).waitFor()
    await expect(page.locator('html')).toHaveAttribute('data-wave-nav', 'on')
    await expect(page.getByRole('button', { name: 'Open waveform navigation' })).toBeVisible()
  })

  test('edits a selection from the keyboard without a click', async ({ page }) => {
    await boot(page, { a11y: WAVE_NAV })
    await loadDemo(page)
    const region = page.getByRole('region', { name: /^Waveform,/ })
    const described = await region.evaluate((el) => {
      const id = el.getAttribute('aria-describedby')
      return id ? document.getElementById(id)?.textContent ?? '' : ''
    })
    expect(described).toMatch(/Duration/)
    expect(described).toMatch(/Playhead/)
    expect(described).toMatch(/selection/i)
    expect(described).toMatch(/Sample rate/)
    expect(described).toMatch(/kilohertz/)

    const open = page.getByRole('button', { name: 'Open waveform navigation' })
    await open.focus()
    await page.keyboard.press('Enter')
    const panel = page.locator('[data-accessible-waveform]')
    await expect(panel.getByRole('button', { name: 'Go to start', exact: true })).toBeFocused()
    await expect(panel.locator('[aria-live]')).toHaveCount(0)

    const step = panel.getByRole('button', { name: 'Step forward, 100 milliseconds', exact: true })
    await step.focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await panel.getByRole('button', { name: 'Set start at playhead', exact: true }).focus()
    await page.keyboard.press('Enter')
    await step.focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await panel.getByRole('button', { name: 'Set end at playhead', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(panel).toContainText(/Selection from/)

    await panel.getByRole('button', { name: 'Preview selection', exact: true }).focus()
    await page.keyboard.press('Enter')
    await panel.getByRole('button', { name: 'Trim', exact: true }).focus()
    await page.keyboard.press('Enter')
    const undo = panel.getByRole('button', { name: 'Undo', exact: true })
    await expect(undo).toBeEnabled()
    await undo.focus()
    await page.keyboard.press('Enter')
    await panel.getByRole('button', { name: 'Export selection', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Export sample' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Export sample' })).toBeHidden()
  })

  test('offers navigation in simple and sensory without a second waveform', async ({ page }) => {
    await boot(page, { mode: 'simple', a11y: WAVE_NAV })
    await loadDemo(page)
    await page.getByRole('button', { name: 'Open waveform navigation' }).focus()
    await page.keyboard.press('Enter')
    const simple = page.locator('[data-accessible-waveform]')
    await expect(simple.getByRole('button', { name: 'Trim', exact: true })).toBeVisible()
    await expect(simple.getByRole('button', { name: 'Fade in', exact: true })).toBeVisible()
    await expect(simple.getByRole('button', { name: 'Inspect signal', exact: true })).toHaveCount(0)

    await boot(page, { mode: 'sensory', a11y: WAVE_NAV })
    const menu = page.getByRole('button', { name: 'Menu', exact: true })
    await menu.focus()
    await page.keyboard.press('Enter')
    const menuDialog = page.getByRole('dialog')
    await menuDialog.getByRole('button', { name: 'Generate demo sample' }).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Open waveform navigation' }).focus()
    await page.keyboard.press('Enter')
    const sensory = page.locator('[data-accessible-waveform]')
    await expect(sensory.getByRole('button', { name: 'Go to start', exact: true })).toBeVisible()
    await expect(sensory.getByRole('button', { name: 'Trim', exact: true })).toHaveCount(0)
    await expect(page.locator('canvas').first()).toBeVisible()
  })
})
