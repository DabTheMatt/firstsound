import { expect, test } from '@playwright/test'
import { boot, controlsOutsideViewport, expectNoAxeViolations, prepareAccess, REPRESENTATIVE_THEMES, VIEWPORTS } from './support'

test.describe('themes and reflow', () => {
  for (const theme of REPRESENTATIVE_THEMES) {
    test(`scans ${theme}`, async ({ page }) => {
      await boot(page, { theme })
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      if (theme === 'warm-paper') {
        await expect(page.locator('html')).toHaveAttribute('style', /color-scheme:\s*light/)
      }
      await expectNoAxeViolations(page)
    })
  }

  test('scans the high-contrast low vision preference', async ({ page }) => {
    await boot(page)
    await prepareAccess(page, {
      switches: ['Enhanced Focus Visibility', 'Larger Controls'],
      checks: ['High Contrast / Low Vision Theme'],
    })
    await expect(page.locator('html')).toHaveAttribute('data-low-vision', 'on')
    await expectNoAxeViolations(page)
  })

  for (const viewport of VIEWPORTS) {
    test(`keeps controls inside ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await boot(page)
      await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible()
      const outside = await controlsOutsideViewport(page)
      expect(outside, outside.join(', ')).toEqual([])
    })
  }
})
