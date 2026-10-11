import { expect, test } from '@playwright/test'
import { boot, expectNoAxeViolations, loadDemo, openAccess, openSettings } from './support'

test.describe('axe states', () => {
  test('scans the initial technical workspace', async ({ page }) => {
    await boot(page)
    await expect(page.getByRole('tab', { name: 'Waveform', exact: true })).toBeVisible()
    await expectNoAxeViolations(page)
  })

  test('scans Simple, including edit, sound, and effects', async ({ page }) => {
    await boot(page, { mode: 'simple' })
    await expect(page.getByRole('tab', { name: 'Edit' })).toBeVisible()
    await page.getByRole('tab', { name: 'Sound' }).click()
    await page.getByRole('tab', { name: 'Effects' }).click()
    await expectNoAxeViolations(page)
  })

  test('scans Sensory', async ({ page }) => {
    await boot(page, { mode: 'sensory' })
    await expect(page.getByRole('radio', { name: 'Sensory' })).toBeChecked()
    await expectNoAxeViolations(page)
  })

  test('scans Settings and the Accessibility Center', async ({ page }) => {
    await boot(page)
    await openAccess(page)
    await expect(page.getByRole('switch', { name: 'Reduced Motion' })).toBeVisible()
    await expect(page.getByRole('switch', { name: 'Enhanced Focus Visibility' })).toBeVisible()
    await expect(page.getByRole('switch', { name: 'Larger Controls' })).toBeVisible()
    await expectNoAxeViolations(page)
  })

  test('scans the manual dialog', async ({ page }) => {
    await boot(page)
    await openSettings(page)
    await page.getByRole('button', { name: 'Manual', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Manual' })).toBeVisible()
    await expectNoAxeViolations(page)
  })

  test('scans Guided Tasks, the export dialog, and Focus Mode', async ({ page }) => {
    await boot(page)
    await loadDemo(page)

    await page.getByRole('button', { name: 'Guide me' }).first().click()
    await expect(page.getByRole('region', { name: 'Guided Tasks' })).toBeVisible()
    await expectNoAxeViolations(page)

    await page.getByRole('button', { name: /Understand the waveform/ }).click()
    await expect(page.getByRole('heading', { name: 'Time runs left to right' })).toBeVisible()
    await expect(page.getByText('Step 1 of 6', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Show me where' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Learn more' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeDisabled()
    await expectNoAxeViolations(page)

    await page.getByRole('button', { name: 'Exit', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Guided Tasks' })).toBeHidden()

    await page.getByRole('button', { name: 'Export', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Export' })).toBeVisible()
    await expectNoAxeViolations(page)
    await page.keyboard.press('Escape')

    await page.getByRole('tab', { name: 'EQ', exact: true }).click()
    await page.getByRole('button', { name: 'Enter Focus Mode' }).click()
    await expect(page.getByRole('button', { name: 'Exit Focus Mode' })).toBeVisible()
    await expectNoAxeViolations(page)
  })
})
