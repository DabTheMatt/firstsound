import { expect, test, type Page } from '@playwright/test'
import { boot } from './support'

async function loadDemoKeys(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await dialog.getByRole('button', { name: 'Generate demo sample' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('region', { name: /^Waveform,/ })).toBeVisible({ timeout: 60_000 })
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
}

const KEYBOARD_FIRST = {
  reduceMotion: false,
  enhancedFocus: false,
  largerInterface: false,
  lowVision: false,
  showDescriptions: true,
  screenReaderOptimizations: false,
  shortcutsEnabled: true,
  dragFreeEditing: false,
  keyboardFirst: true,
}

test.describe('keyboard scopes', () => {
  test('navigates workspaces, the chain, EQ, and automation from the keyboard', async ({ page }) => {
    await boot(page, { a11y: KEYBOARD_FIRST })
    await loadDemoKeys(page)
    await page.keyboard.press('Control+Shift+KeyK')
    const nav = page.getByRole('dialog', { name: 'Workspace navigation' })
    await expect(nav).toBeVisible()
    await nav.getByRole('button', { name: 'EQ', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(nav).toBeHidden()
    await expect(page.getByRole('tab', { name: 'EQ', exact: true })).toHaveAttribute('aria-selected', 'true')

    const eq = page.locator('[data-drag-free="eq"]')
    await expect(eq).toBeVisible()
    const effect = page.locator('[data-effect-tab]').nth(1)
    await effect.focus()
    await page.keyboard.press('ArrowDown')
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-effect-tab'))
    expect(focused).toBeTruthy()
    await page.locator('[data-effect-tab]').first().focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-inspector]')).toBeVisible()

    await page.keyboard.press('Control+Shift+KeyK')
    await expect(nav).toBeVisible()
    await nav.getByRole('button', { name: 'Automation', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('tab', { name: 'Auto', exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('[data-drag-free="automation"]')).toBeVisible()

    await page.getByRole('button', { name: 'Settings', exact: true }).focus()
    await page.keyboard.press('Enter')
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await settings.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).focus()
    await page.keyboard.press('Enter')
    const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
    await expect(help).toBeVisible()
    await expect(help.getByText('Ctrl+Shift+K')).toBeVisible()
    await expect(help.getByRole('heading', { name: 'Transport' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(help).toBeHidden()
  })

  test('edits a sensory parameter from the keyboard', async ({ page }) => {
    await boot(page, { mode: 'sensory', a11y: KEYBOARD_FIRST })
    await page.getByRole('button', { name: 'Menu', exact: true }).focus()
    await page.keyboard.press('Enter')
    const menu = page.getByRole('dialog')
    await menu.getByRole('button', { name: 'Generate demo sample' }).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Escape')
    const slider = page.locator('[data-region="sensory"] [role="slider"]').first()
    await expect(slider).toBeVisible({ timeout: 60_000 })
    const before = await slider.getAttribute('aria-valuenow')
    await slider.focus()
    await page.keyboard.press('ArrowRight')
    await expect(slider).not.toHaveAttribute('aria-valuenow', before ?? '')
  })

  test('completes a guided waveform step from the keyboard', async ({ page }) => {
    await boot(page)
    await loadDemoKeys(page)
    const guide = page.getByRole('button', { name: 'Guide me' }).first()
    await guide.focus()
    await page.keyboard.press('Enter')
    const task = page.getByRole('button', { name: /Understand the waveform/ })
    await task.focus()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Next', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Height is amplitude' })).toBeVisible()
    const stayed = await page.evaluate(() => {
      const active = document.activeElement
      return Boolean(active && active.closest('[role="region"][aria-labelledby]') && !active.closest('[data-region="waveform"]'))
    })
    expect(stayed).toBe(true)
    const wave = page.getByRole('region', { name: /^Waveform,/ })
    await wave.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText('Done — you touched the waveform.', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Show me where' }).focus()
    await page.keyboard.press('Enter')
    await expect.poll(async () => page.evaluate(() => {
      const active = document.activeElement
      return Boolean(active && active.closest('[data-region="waveform"], [data-guide-target="waveform.main"]'))
    })).toBe(true)
  })

  test('does not play or edit while typing or composing a shortcut in a field', async ({ page }) => {
    await boot(page)
    await loadDemoKeys(page)
    await page.locator('[data-export-open]').focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Export' })
    const name = dialog.getByRole('textbox')
    await name.focus()
    const before = await name.inputValue()
    await page.keyboard.type('take')
    await page.keyboard.press('Space')
    await page.keyboard.press('Control+Shift+KeyK')
    await expect(name).toHaveValue(`${before}take `)
    await expect(page.getByRole('dialog', { name: 'Workspace navigation' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})
