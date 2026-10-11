import { expect, test } from '@playwright/test'
import { boot, controlsOutsideViewport, expectNoAxeViolations, loadDemo, openAccess, prepareAccess, VIEWPORTS } from './support'

test.describe('predictable layout', () => {
  test('is off until turned on, clears on reload, and restores from the accessibility defaults', async ({ page }) => {
    await boot(page)
    await expect(page.locator('html')).toHaveAttribute('data-predictable', 'off')
    await expect(page.locator('html')).toHaveAttribute('data-stable-panels', 'off')
    await openAccess(page)
    const toggle = page.getByRole('switch', { name: 'Predictable Layout' })
    await expect(toggle).not.toBeChecked()
    await expect(page.getByRole('heading', { name: 'Cognitive & attention' })).toBeVisible()
    await expect(page.getByText('Keep tools and panels in consistent locations while you work.')).toBeVisible()
    await toggle.check()
    await expect(page.locator('html')).toHaveAttribute('data-predictable', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-stable-panels', 'off')
    await expect(page.locator('html')).toHaveAttribute('data-remember-layout', 'off')
    await expect(page.locator('html')).toHaveAttribute('data-reduce-layout', 'off')
    await page.getByRole('switch', { name: 'Stable Panels', exact: true }).check()
    await page.getByRole('switch', { name: 'Remember Workspace Layout', exact: true }).check()
    await page.getByRole('switch', { name: 'Reduce Layout Movement', exact: true }).check()
    await expect(page.locator('html')).toHaveAttribute('data-stable-panels', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-remember-layout', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-reduce-layout', 'on')
    await page.reload()
    await page.getByRole('button', { name: /^(Settings|Menu)$/ }).first().waitFor()
    await expect(page.locator('html')).toHaveAttribute('data-predictable', 'off')
    await expect(page.locator('html')).toHaveAttribute('data-stable-panels', 'off')
    const stored = await page.evaluate(() => localStorage.getItem('field.accessibility.v1'))
    expect(stored).toBeNull()
    await openAccess(page)
    await page.getByRole('switch', { name: 'Predictable Layout', exact: true }).check()
    await page.getByRole('button', { name: 'Restore accessibility defaults' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-predictable', 'off')
    await expectNoAxeViolations(page)
  })

  test('keeps workspace order, transport, and focus while editing', async ({ page }) => {
    await boot(page)
    await loadDemo(page)
    const tabs = page.getByRole('tablist', { name: 'Technical workspaces' }).getByRole('tab')
    await expect(tabs).toHaveText(['Wave', 'EQ', 'FFT', 'Auto', 'Hearing'])
    const transport = page.locator('[data-stable-region="transport"]')
    const before = await transport.boundingBox()
    await page.getByRole('tab', { name: 'EQ' }).click()
    await expect(page.getByRole('tab', { name: 'EQ' })).toHaveAttribute('aria-selected', 'true')
    await expect(tabs).toHaveText(['Wave', 'EQ', 'FFT', 'Auto', 'Hearing'])
    const after = await transport.boundingBox()
    expect(before && after && Math.abs(before.y - after.y)).toBeLessThan(2)
    expect(before && after && Math.abs(before.x - after.x)).toBeLessThan(2)
    const eq = page.getByRole('tab', { name: 'EQ' })
    await eq.focus()
    await expect(eq).toBeFocused()
    await page.getByRole('tab', { name: 'Wave' }).click()
    await page.getByRole('tab', { name: 'Wave' }).focus()
    await expect(page.getByRole('tab', { name: 'Wave' })).toBeFocused()
    const chain = await page.locator('[data-stable-region="effects"] button').allTextContents()
    await page.locator('[data-stable-region="effects"] button').first().click()
    await expect(page.locator('[data-stable-region="effects"] button')).toHaveText(chain)
  })

  test('remembers the workspace and restores the default layout without clearing audio prefs', async ({ page }) => {
    await boot(page)
    await prepareAccess(page, { switches: ['Predictable Layout', 'Remember Workspace Layout'] })
    await page.getByRole('tab', { name: 'FFT' }).click()
    await expect
      .poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('field.layout.v1') || '{}').technicalWorkspace))
      .toBe('fft')
    await page.reload()
    await page.getByRole('button', { name: /^(Settings|Menu)$/ }).first().waitFor()
    await expect(page.getByRole('tab', { name: 'Wave' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-predictable', 'off')
    const memory = await page.evaluate(() => JSON.parse(localStorage.getItem('field.layout.v1') || '{}'))
    expect(memory.technicalWorkspace).toBe('fft')
    expect(memory.gain).toBeUndefined()
    await openAccess(page)
    await page.getByRole('button', { name: 'Restore workspace layout' }).click()
    await expect(page.getByRole('tab', { name: 'Wave' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-predictable', 'off')
  })

  test('does not stop playback when the preference or workspace changes', async ({ page }) => {
    await boot(page)
    await loadDemo(page)
    await page.getByRole('button', { name: 'Play', exact: true }).first().click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
    await page.getByRole('tab', { name: 'Auto' }).click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
    await openAccess(page)
    await page.getByRole('switch', { name: 'Predictable Layout' }).check()
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
  })

  test('keeps essential controls reachable across viewports and text scales', async ({ page }) => {
    test.setTimeout(180_000)
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await boot(page)
      await prepareAccess(page, {
        interfaceScale: 150,
        textScale: 200,
        switches: ['Predictable Layout', 'Stable Panels', 'Remember Workspace Layout', 'Reduce Layout Movement'],
      })
      await expect(page.locator('html')).toHaveAttribute('data-interface-scale', '150')
      await expect(page.locator('html')).toHaveAttribute('data-text-scale', '200')
      await expect(page.getByRole('button', { name: /^(Settings|Menu)$/ }).first()).toBeVisible()
      expect(await controlsOutsideViewport(page), `${viewport.width}x${viewport.height}`).toEqual([])
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${viewport.width}`).toBeLessThanOrEqual(1)
    }
  })

  test('restores settings focus and does not hide controls from the accessibility tree', async ({ page }) => {
    await boot(page)
    const settings = page.getByRole('button', { name: 'Settings', exact: true })
    await settings.focus()
    await settings.click()
    await page.keyboard.press('Escape')
    await expect(settings).toBeFocused()
    const hidden = await page.evaluate(() => {
      const main = document.querySelector('main')
      const transport = document.querySelector('[data-stable-region="transport"]')
      return {
        mainHidden: main?.getAttribute('aria-hidden') ?? '',
        transportHidden: transport?.getAttribute('aria-hidden') ?? '',
        positiveTab: [...document.querySelectorAll('[tabindex]')].some((node) => Number(node.getAttribute('tabindex')) > 0),
      }
    })
    expect(hidden.mainHidden).not.toBe('true')
    expect(hidden.transportHidden).not.toBe('true')
    expect(hidden.positiveTab).toBe(false)
  })

  test('keeps the preference reachable when the page is zoomed', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await boot(page)
    await prepareAccess(page, { interfaceScale: 125, textScale: 150, switches: ['Predictable Layout'] })
    await page.evaluate(() => {
      document.documentElement.style.zoom = '1.5'
    })
    await openAccess(page)
    const toggle = page.getByRole('switch', { name: 'Predictable Layout' })
    await expect(toggle).toBeVisible()
    const box = await toggle.boundingBox()
    expect(box && box.width).toBeGreaterThan(20)
    expect(box && box.y).toBeGreaterThanOrEqual(0)
  })

  test('reset all leaves the accessibility preference in place', async ({ page }) => {
    await boot(page)
    await prepareAccess(page, { switches: ['Predictable Layout'] })
    await openAccess(page)
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await page.getByRole('button', { name: 'Reset all' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-predictable', 'on')
    const stored = await page.evaluate(() => localStorage.getItem('field.accessibility.v1'))
    expect(stored).toBeNull()
  })
})
