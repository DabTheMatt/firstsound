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
    const paint = await page.locator('[data-marker-gem]').evaluate((node) => {
      const style = getComputedStyle(node)
      const line = getComputedStyle(node.closest('[data-user-marker]') ?? node, '::before')
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        animation: style.animationName,
        lineWidth: line.borderLeftWidth,
      }
    })
    expect(paint.outlineStyle).not.toBe('none')
    expect(parseFloat(paint.outlineWidth)).toBeGreaterThanOrEqual(2)
    expect(parseFloat(paint.lineWidth)).toBeGreaterThanOrEqual(2)
    expect(paint.animation === 'none' || paint.animation === '').toBe(true)
    const motion = await page.locator('[data-marker-popover]').evaluate((node) => getComputedStyle(node).animationName)
    expect(motion === 'none' || motion === '').toBe(true)
    await page.screenshot({ path: '/opt/cursor/artifacts/markers-high-visibility.png' })
  })

  test('places the diamond under the edit bar, drags it, and aligns suggestions', async ({ page }) => {
    await boot(page, { mode: 'technical' })
    await loadDemo(page)
    await openMarkers(page)
    await page.getByRole('button', { name: 'Add marker', exact: true }).click()
    await page.getByRole('textbox', { name: 'Time' }).fill('00:04.000')
    await page.getByRole('button', { name: 'Save marker' }).click()
    await page.keyboard.press('Escape')

    const fit = page.locator('[data-selection-toolbar]').getByRole('button', { name: 'Fit', exact: true })
    const flag = page.locator('[data-marker-flag]')
    const fitBox = await fit.boundingBox()
    const flagBox = await flag.boundingBox()
    expect(fitBox).not.toBeNull()
    expect(flagBox).not.toBeNull()
    expect(flagBox!.y).toBeGreaterThanOrEqual(fitBox!.y + fitBox!.height - 1)
    await page.screenshot({ path: '/opt/cursor/artifacts/markers-below-toolbar.png' })

    const centerX = async () =>
      flag.evaluate((node) => {
        const marker = node.closest('[data-user-marker]')
        if (!marker) return null
        const box = marker.getBoundingClientRect()
        return box.left + box.width / 2
      })
    const before = await centerX()
    expect(before).not.toBeNull()
    const startX = flagBox!.x + flagBox!.width / 2
    const startY = flagBox!.y + flagBox!.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 140, startY, { steps: 10 })
    await page.mouse.up()
    await expect.poll(centerX).toBeGreaterThan(before! + 40)

    await page.keyboard.press('Control+z')
    await expect.poll(centerX).toBeLessThan(before! + 6)
    const restored = await centerX()
    expect(Math.abs((restored ?? 0) - before!)).toBeLessThan(4)

    await openMarkers(page)
    await page.getByRole('button', { name: /^Suggestions/ }).click()
    const save = page.getByRole('button', { name: 'Save as marker' }).first()
    await expect(save).toBeVisible({ timeout: 20000 })
    const layout = await save.locator('xpath=ancestor::li[1]').evaluate((node) => {
      const spans = [...node.querySelectorAll('span')]
      const time = spans[0]
      const name = spans[1]
      const button = node.querySelector('button')
      if (!time || !name || !button) return null
      const timeBox = time.getBoundingClientRect()
      const nameBox = name.getBoundingClientRect()
      const buttonBox = button.getBoundingClientRect()
      return {
        gap: nameBox.left - timeBox.right,
        buttonBelowName: buttonBox.top >= nameBox.bottom - 2,
        buttonRight: buttonBox.right <= node.getBoundingClientRect().right + 1,
      }
    })
    expect(layout).not.toBeNull()
    expect(layout!.gap).toBeGreaterThanOrEqual(8)
    expect(layout!.buttonBelowName).toBe(true)
    expect(layout!.buttonRight).toBe(true)
    await page.screenshot({ path: '/opt/cursor/artifacts/markers-suggestions.png' })
  })

  test('edits from a double-click, stores a palette color, and previews a suggestion', async ({ page }) => {
    await boot(page, { mode: 'technical' })
    await loadDemo(page)
    await openMarkers(page)
    await page.getByRole('button', { name: 'Add marker', exact: true }).click()
    await page.getByRole('textbox', { name: 'Time' }).fill('00:04.000')
    await page.getByRole('button', { name: 'Save marker' }).click()
    await page.keyboard.press('Escape')

    await page.locator('[data-marker-flag]').dblclick()
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('region', { name: 'Markers' })).toBeHidden()
    await page.locator('[data-marker-label]').dblclick()
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible()
    await page.getByRole('option', { name: 'Cyan' }).click()
    await page.getByRole('button', { name: 'Save marker' }).click()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-marker-color="cyan"]')).toHaveCount(1)
    const sameInk = await page.evaluate(() => {
      const marker = document.querySelector('[data-marker-color="cyan"]')
      if (!marker) return false
      const ink = getComputedStyle(marker).getPropertyValue('--marker-ink').trim().toLowerCase()
      const track = getComputedStyle(document.documentElement).getPropertyValue('--track-cyan').trim().toLowerCase()
      return ink.length > 0 && ink === track
    })
    expect(sameInk).toBe(true)
    await page.screenshot({ path: '/opt/cursor/artifacts/markers-color.png' })

    await openMarkers(page)
    await page.getByRole('button', { name: 'Marker: Marker 1, 4 seconds.' }).dblclick()
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()

    await page.getByRole('button', { name: /^Suggestions/ }).click()
    const row = page.getByRole('button', { name: 'Save as marker' }).first().locator('xpath=ancestor::li[1]')
    await expect(row).toBeVisible({ timeout: 20000 })
    await row.hover()
    const preview = page.locator('[data-marker-preview]')
    await expect(preview).toBeVisible()
    await expect.poll(async () => preview.evaluate((node) => Number(getComputedStyle(node).opacity))).toBe(0.5)
    await page.screenshot({ path: '/opt/cursor/artifacts/markers-suggestion-preview.png' })
    await page.mouse.move(2, 2)
    await expect(preview).toHaveCount(0)
  })
})
