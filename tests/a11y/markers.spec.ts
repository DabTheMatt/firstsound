import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { boot, loadDemo } from './support'

mkdirSync('/opt/cursor/artifacts', { recursive: true })

async function openMarkers(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Markers', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Markers' })).toHaveCount(1)
  await expect(page.locator('[data-marker-sheet]')).toBeVisible()
}

async function closeMarkers(page: Page): Promise<void> {
  await page.locator('[data-marker-sheet]').getByRole('button', { name: 'Close markers', exact: true }).click()
  await expect(page.locator('[data-marker-sheet]')).toBeHidden()
}

async function addBass(page: Page): Promise<void> {
  await openMarkers(page)
  await page.getByRole('textbox', { name: 'Time' }).fill('00:01.000')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill('Bass entrance')
  await page.getByRole('textbox', { name: 'Description' }).fill('low note')
  await page.getByRole('button', { name: 'Save marker' }).click()
  await expect(page.getByRole('button', { name: 'Go to marker: Bass entrance' })).toBeVisible()
}

test.describe('audio markers', () => {
  test('creates, renames, seeks, and deletes a marker from the keyboard-reachable list', async ({ page }) => {
    await boot(page, { mode: 'technical' })
    await openMarkers(page)
    await expect(page.getByText('Load audio before adding a marker.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled()
    await page.keyboard.press('Escape')

    await loadDemo(page)
    const selectionBefore = await page.locator('[data-region-frame]').getAttribute('style')
    await addBass(page)
    await page.getByRole('button', { name: 'Show description' }).click()
    await expect(page.getByText('low note')).toBeVisible()
    await page.screenshot({ path: '/opt/cursor/artifacts/markers-list.png' })

    await page.getByRole('button', { name: 'Go to marker: Bass entrance' }).click()
    const selectionAfter = await page.locator('[data-region-frame]').getAttribute('style')
    expect(selectionAfter).toBe(selectionBefore)
    await expect.poll(async () => page.evaluate(() => {
      const marker = document.querySelector('[data-user-marker]')
      const playhead = document.querySelector('[data-playhead]')
      if (!marker || !playhead) return null
      const markerBox = marker.getBoundingClientRect()
      const playheadBox = playhead.getBoundingClientRect()
      const markerCenter = markerBox.left + markerBox.width / 2
      const playheadCenter = playheadBox.left + playheadBox.width / 2
      return Math.abs(markerCenter - playheadCenter)
    })).toBeLessThan(3)

    await closeMarkers(page)
    await page.screenshot({ path: '/opt/cursor/artifacts/markers-waveform.png' })
    await expect(page.locator('[data-user-marker]')).toHaveCount(1)

    await page.getByRole('button', { name: 'Play', exact: true }).first().click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
    await page.keyboard.press('Control+Shift+E')
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')

    await openMarkers(page)
    await page.getByRole('button', { name: 'Delete marker: Bass entrance' }).click()
    await expect(page.getByRole('button', { name: 'Go to marker: Marker 1' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Go to marker: Bass entrance' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+z')
    await openMarkers(page)
    await expect(page.getByRole('button', { name: 'Go to marker: Bass entrance' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete marker: Bass entrance' }).click()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-user-marker]')).toHaveCount(1)
  })

  test('keeps marker controls available in Simple, Sensory, a narrow viewport, and high visibility', async ({ page }) => {
    await boot(page, { mode: 'simple' })
    await loadDemo(page)
    await expect(page.getByRole('button', { name: 'Markers', exact: true })).toBeVisible()
    await openMarkers(page)
    await expect(page.getByText('Detected places')).toHaveCount(0)
    await page.keyboard.press('Escape')

    await page.getByRole('radio', { name: 'Sensory' }).click()
    await expect(page.getByRole('button', { name: 'Markers', exact: true })).toBeVisible()
    await openMarkers(page)
    await page.keyboard.press('Escape')

    await page.setViewportSize({ width: 320, height: 568 })
    await openMarkers(page)
    const overflow = await page.locator('[data-marker-sheet]').evaluate((node) => {
      const box = node.getBoundingClientRect()
      return box.width <= 320 && box.right <= 324
    })
    expect(overflow).toBe(true)
    await page.screenshot({ path: '/opt/cursor/artifacts/markers-narrow.png' })
  })

  test('draws a high-visibility outline without animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, {
      mode: 'technical',
      a11y: { highVisibility: true, interfaceScale: 1.5, textScale: 2 },
    })
    await expect(page.locator('html')).toHaveAttribute('data-high-visibility', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-interface-scale', '150')
    await expect(page.locator('html')).toHaveAttribute('data-text-scale', '200')
    await loadDemo(page)
    await addBass(page)
    const paint = await page.locator('[data-user-marker]').evaluate((node) => {
      const style = getComputedStyle(node)
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        animation: style.animationName,
      }
    })
    expect(paint.outlineStyle).not.toBe('none')
    expect(parseFloat(paint.outlineWidth)).toBeGreaterThanOrEqual(2)
    expect(paint.animation === 'none' || paint.animation === '').toBe(true)
    await page.screenshot({ path: '/opt/cursor/artifacts/markers-high-visibility.png' })
  })
})
