import { expect, test } from '@playwright/test'
import { boot, loadDemo } from './support'

const DRAG_FREE = {
  reduceMotion: false,
  enhancedFocus: false,
  largerInterface: false,
  lowVision: false,
  showDescriptions: true,
  screenReaderOptimizations: false,
  shortcutsEnabled: true,
  dragFreeEditing: true,
}

test.describe('drag-free editing', () => {
  test('keeps the preference off until the keyboard turns it on', async ({ page }) => {
    await boot(page)
    await expect(page.locator('html')).toHaveAttribute('data-drag-free', 'off')
    await page.getByRole('button', { name: 'Settings', exact: true }).focus()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Accessibility', exact: true }).focus()
    await page.keyboard.press('Enter')
    const drag = page.getByRole('switch', { name: 'Drag-Free Editing' })
    await expect(drag).not.toBeChecked()
    await drag.focus()
    await page.keyboard.press('Space')
    await expect(drag).toBeChecked()
    await expect(page.locator('html')).toHaveAttribute('data-drag-free', 'on')
    await page.keyboard.press('Escape')
    await page.reload()
    await page.getByRole('button', { name: 'Settings', exact: true }).waitFor()
    await expect(page.locator('html')).toHaveAttribute('data-drag-free', 'off')
  })

  test('edits a selection from the keyboard and cancels trim', async ({ page }) => {
    await boot(page, { a11y: DRAG_FREE })
    await loadDemo(page)
    const panel = page.locator('[data-drag-free="wave"]')
    await panel.scrollIntoViewIfNeeded()
    const edit = panel.getByRole('button', { name: 'Edit times', exact: true })
    await edit.focus()
    await page.keyboard.press('Enter')
    const start = panel.getByRole('textbox', { name: /Selection start/ })
    await expect(start).toBeFocused()
    await start.fill('00:00.200')
    await panel.getByRole('textbox', { name: /Selection end/ }).fill('00:01.200')
    await panel.getByRole('button', { name: 'Apply', exact: true }).first().focus()
    await page.keyboard.press('Enter')
    await expect(panel).toContainText('00:00.200')
    await expect(panel).toContainText('00:01.200')

    const trim = panel.getByRole('button', { name: 'Trim', exact: true })
    await trim.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Trim' })
    await expect(dialog).toContainText('removes the audio outside')
    await expect(dialog.getByRole('button', { name: 'Trim selection' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trim).toBeFocused()
    await expect(panel).toContainText('00:00.200')
  })

  test('turns an EQ slot on from the keyboard', async ({ page }) => {
    await boot(page, { a11y: DRAG_FREE })
    await loadDemo(page)
    await page.getByRole('tab', { name: 'EQ', exact: true }).click()
    const eq = page.locator('[data-drag-free="eq"]')
    const edit = eq.getByRole('button', { name: 'Edit selected band' })
    if (await edit.isDisabled()) {
      await page.getByRole('button', { name: /Add effect|Add after/ }).first().click()
      await page.getByRole('menuitem', { name: 'EQ', exact: true }).click()
    }
    await edit.focus()
    await page.keyboard.press('Enter')
    const band = eq.getByRole('button', { name: /EQ band 1, Off/ })
    await band.focus()
    await page.keyboard.press('Enter')
    const type = eq.getByRole('combobox', { name: /Filter type/ })
    await type.focus()
    await type.selectOption('peaking')
    await expect(eq.getByRole('button', { name: /EQ band 1, Bell/ })).toBeVisible()
    const frequency = eq.getByRole('textbox', { name: /^Frequency/ })
    await frequency.fill('630')
    await frequency.press('Enter')
    await expect(frequency).toHaveValue(/630/)
  })

  test('adds and edits an automation point from the keyboard', async ({ page }) => {
    await boot(page, { a11y: DRAG_FREE })
    await loadDemo(page)
    await page.getByRole('tab', { name: 'Auto', exact: true }).click()
    const auto = page.locator('[data-drag-free="automation"]')
    await expect(auto.getByRole('button', { name: 'Add point at playhead' })).toBeDisabled()
    const modulate = page.getByRole('button', { name: 'Modulate Gain', exact: true })
    await modulate.focus()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Automation', exact: true }).click()
    await page.getByRole('button', { name: 'Add automation', exact: true }).click()
    const add = auto.getByRole('button', { name: 'Add point at playhead' })
    await expect(add).toBeEnabled()
    await add.focus()
    await page.keyboard.press('Enter')
    const edit = auto.getByRole('button', { name: 'Edit point', exact: true })
    await edit.focus()
    await page.keyboard.press('Enter')
    await expect(auto.getByRole('button', { name: /Automation point 1/ })).toBeVisible()
  })

  test('moves an effect with the keyboard', async ({ page }) => {
    await boot(page, { a11y: DRAG_FREE })
    await loadDemo(page)
    await page.getByRole('button', { name: /Add effect|Add after/ }).first().click()
    await page.getByRole('menuitem', { name: 'Delay', exact: true }).click()
    await page.getByRole('button', { name: /Add effect|Add after/ }).first().click()
    await page.getByRole('menuitem', { name: 'Reverb', exact: true }).click()
    const move = page.getByRole('button', { name: /Move Delay/ }).first()
    await expect(move).toBeEnabled()
    const before = await move.getAttribute('aria-label')
    await move.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: /Move Delay/ }).first()).not.toHaveAttribute('aria-label', before ?? '')
  })
})
