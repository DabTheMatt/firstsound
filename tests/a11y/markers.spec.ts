import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { boot, loadDemo, prepareAccess } from './support'

mkdirSync('/opt/cursor/artifacts', { recursive: true })

async function openMarkers(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Markers, / }).click()
  await expect(page.getByRole('region', { name: 'Markers' })).toBeVisible()
}

async function closeMarkers(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Close markers', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Markers' })).toBeHidden()
}

test.describe('audio markers popover', () => {
  test('keeps a closed toolbar popover and edits a marker without moving the workspace', async ({ page }) => {
    await boot(page, { mode: 'technical' })
    await expect(page.getByRole('button', { name: 'Markers, 0' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Markers' })).toHaveCount(0)
    await openMarkers(page)
    await expect(page.getByText('Load audio before adding a marker.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add marker', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Close markers', exact: true })).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('region', { name: 'Markers' })).toBeHidden()

    await loadDemo(page)
    const wave = page.locator('[data-waveform-editor]')
    const transport = page.locator('[data-transport]').first()
    const waveBefore = await wave.boundingBox()
    const transportBefore = await transport.boundingBox()
    const selectionBefore = await page.locator('[data-region-frame]').getAttribute('style')

    await openMarkers(page)
    await expect(page.locator('[data-marker-presentation="anchor"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Suggestions/ })).toHaveAttribute('aria-expanded', 'false')
    const waveOpen = await wave.boundingBox()
    const transportOpen = await transport.boundingBox()
    expect(waveOpen?.height).toBe(waveBefore?.height)
    expect(transportOpen?.y).toBe(transportBefore?.y)
    expect(transportOpen?.height).toBe(transportBefore?.height)

    await page.getByRole('button', { name: 'Add marker', exact: true }).click()
    await page.getByRole('textbox', { name: 'Name' }).fill('Bass entrance')
    await page.getByRole('textbox', { name: 'Description' }).fill('low note')
    await page.getByRole('textbox', { name: 'Time' }).fill('00:01.000')
    await page.getByRole('button', { name: 'Save marker' }).click()
    await expect(page.getByRole('button', { name: 'Marker: Bass entrance, 1 seconds.' })).toBeVisible()
    await page.screenshot({ path: '/opt/cursor/artifacts/markers-popover.png' })

    await page.getByRole('button', { name: 'Marker: Bass entrance, 1 seconds.' }).click()
    const selectionAfter = await page.locator('[data-region-frame]').getAttribute('style')
    expect(selectionAfter).toBe(selectionBefore)
    await expect.poll(async () => page.evaluate(() => {
      const marker = document.querySelector('[data-user-marker]')
      const playhead = document.querySelector('[data-playhead]')
      if (!marker || !playhead) return null
      const markerBox = marker.getBoundingClientRect()
      const playheadBox = playhead.getBoundingClientRect()
      return Math.abs(markerBox.left + markerBox.width / 2 - (playheadBox.left + playheadBox.width / 2))
    })).toBeLessThan(3)

    await closeMarkers(page)
    await page.screenshot({ path: '/opt/cursor/artifacts/markers-waveform.png' })
    await expect(page.locator('[data-user-marker]')).toHaveCount(1)

    await page.getByRole('button', { name: 'Play', exact: true }).first().click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
    await page.keyboard.press('Control+Shift+E')
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
    await expect(page.getByRole('region', { name: 'Markers' })).toHaveCount(0)
    await expect(page.locator('[data-user-marker]')).toHaveCount(2)

    await openMarkers(page)
    await page.getByRole('button', { name: 'Next marker', exact: true }).click()
    await page.getByRole('button', { name: 'Previous marker', exact: true }).click()
    await page.getByRole('button', { name: 'Marker actions: Bass entrance' }).click()
    await page.getByRole('menuitem', { name: 'Edit description' }).click()
    await expect(page.getByRole('textbox', { name: 'Description' })).toHaveValue('low note')
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.getByRole('button', { name: 'Marker actions: Bass entrance' }).click()
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Marker: Bass entrance, 1 seconds.' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+z')
    await openMarkers(page)
    await expect(page.getByRole('button', { name: 'Marker: Bass entrance, 1 seconds.' })).toBeVisible()
    await page.getByRole('button', { name: /^Suggestions/ }).click()
    await expect(page.getByRole('button', { name: /^Suggestions/ })).toHaveAttribute('aria-expanded', 'true')
  })

  test('fits Simple, Sensory, and narrow widths without a second close control', async ({ page }) => {
    await boot(page, { mode: 'simple' })
    await loadDemo(page)
    await expect(page.getByRole('button', { name: 'Markers, 0' })).toBeVisible()
    await openMarkers(page)
    await expect(page.getByRole('button', { name: /^Suggestions/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Close markers', exact: true })).toHaveCount(1)
    await page.keyboard.press('Escape')

    await page.getByRole('radio', { name: 'Sensory' }).click()
    await expect(page.getByRole('button', { name: 'Markers, 0' })).toBeVisible()
    await openMarkers(page)
    await page.keyboard.press('Escape')

    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 700 })
      await openMarkers(page)
      const box = await page.locator('[data-marker-popover]').boundingBox()
      expect(box).not.toBeNull()
      expect(box!.width).toBeLessThanOrEqual(width)
      expect(box!.x).toBeGreaterThanOrEqual(-1)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
      const transport = await page.locator('[data-transport]').first().boundingBox()
      if (transport && box) expect(box.y + box.height).toBeLessThanOrEqual(transport.y + 2)
      await page.keyboard.press('Escape')
    }
    await page.screenshot({ path: '/opt/cursor/artifacts/markers-narrow.png' })
  })

  test('draws a high-visibility outline without animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, { mode: 'technical' })
    await prepareAccess(page, { interfaceScale: 150, textScale: 200, switches: ['High Visibility Controls'] })
    await expect(page.locator('html')).toHaveAttribute('data-high-visibility', 'on')
    await loadDemo(page)
    await openMarkers(page)
    await page.getByRole('button', { name: 'Add marker', exact: true }).click()
    await page.getByRole('textbox', { name: 'Name' }).fill('Bass entrance')
    await page.getByRole('button', { name: 'Save marker' }).click()
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
    const motion = await page.locator('[data-marker-popover]').evaluate((node) => getComputedStyle(node).animationName)
    expect(motion === 'none' || motion === '').toBe(true)
    await page.screenshot({ path: '/opt/cursor/artifacts/markers-high-visibility.png' })
  })
})
