import { expect, test } from '@playwright/test'
import { boot, controlsOutsideViewport, expectNoAxeViolations, loadDemo, openAccess } from './support'

const ON = {
  attentionFocus: true,
  attentionStrength: 'clear',
  attentionHighlight: true,
  attentionReduce: true,
}

test.describe('attention focus', () => {
  test('is off until turned on, then survives reload and restore', async ({ page }) => {
    await boot(page)
    await expect(page.locator('html')).toHaveAttribute('data-attention', 'off')
    await expect(page.locator('html')).toHaveAttribute('data-attention-strength', 'subtle')
    await openAccess(page)
    const toggle = page.getByRole('switch', { name: 'Attention Focus' })
    await expect(toggle).not.toBeChecked()
    await expect(page.getByRole('heading', { name: 'Cognitive & attention' })).toBeVisible()
    await toggle.check()
    await page.getByRole('radio', { name: 'Clear' }).check()
    await expect(page.locator('html')).toHaveAttribute('data-attention', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-attention-strength', 'clear')
    await expect(page.locator('html')).toHaveAttribute('data-attention-highlight', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-attention-reduce', 'on')
    await page.reload()
    await page.getByRole('button', { name: /^(Settings|Menu)$/ }).first().waitFor()
    await expect(page.locator('html')).toHaveAttribute('data-attention', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-attention-strength', 'clear')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('field.accessibility.v1') || '{}'))
    expect(stored.attentionFocus).toBe(true)
    expect(stored.attentionStrength).toBe('clear')
    await openAccess(page)
    await page.getByRole('button', { name: 'Restore accessibility defaults' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-attention', 'off')
    await expect(page.locator('html')).toHaveAttribute('data-attention-strength', 'subtle')
    await expectNoAxeViolations(page)
  })

  test('keeps keyboard focus visible and does not trap or hide controls', async ({ page }) => {
    await boot(page, { a11y: ON })
    await expect(page.locator('html')).toHaveAttribute('data-attention', 'on')
    const settings = page.getByRole('button', { name: 'Settings', exact: true })
    await settings.focus()
    await expect(settings).toBeFocused()
    const ring = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el) return { style: 'none', width: '0px', hidden: false, inert: false }
      const style = getComputedStyle(el)
      const main = document.querySelector('main')
      return {
        style: style.outlineStyle,
        width: style.outlineWidth,
        hidden: main?.getAttribute('aria-hidden') ?? '',
        inert: main?.hasAttribute('inert') ?? false,
      }
    })
    expect(ring.style).not.toBe('none')
    expect(parseFloat(ring.width)).toBeGreaterThan(0)
    expect(ring.hidden).not.toBe('true')
    expect(ring.inert).toBe(false)
    await page.keyboard.press('Tab')
    const moved = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || '')
    expect(moved.length).toBeGreaterThan(0)
    const reach = await page.evaluate(() => {
      const signature = () =>
        [...document.querySelectorAll('button, [role="slider"], [role="tab"], input, select')]
          .map((node) => {
            const style = getComputedStyle(node)
            return [
              node.getAttribute('aria-label') || (node as HTMLElement).innerText || node.tagName,
              style.pointerEvents,
              node.getAttribute('aria-hidden') ?? '',
              node.hasAttribute('inert') ? '1' : '0',
            ].join('|')
          })
          .sort()
          .join('\n')
      const on = signature()
      document.documentElement.dataset.attention = 'off'
      const off = signature()
      document.documentElement.dataset.attention = 'on'
      return { same: on === off, mainHidden: document.querySelector('main')?.getAttribute('aria-hidden') ?? '', mainInert: document.querySelector('main')?.hasAttribute('inert') ?? false }
    })
    expect(reach.same).toBe(true)
    expect(reach.mainHidden).not.toBe('true')
    expect(reach.mainInert).toBe(false)
  })

  test('does not stop playback when attention focus is toggled', async ({ page }) => {
    await boot(page)
    await loadDemo(page)
    await page.getByRole('button', { name: 'Play', exact: true }).first().click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
    await openAccess(page)
    await page.getByRole('switch', { name: 'Attention Focus' }).check()
    await page.getByRole('radio', { name: 'Subtle' }).check()
    await expect(page.getByRole('button', { name: 'Pause', exact: true }).first()).toBeVisible()
    const context = await page.locator('html').getAttribute('data-attention-context')
    expect(context).toBe('dialog')
  })

  test('does not cover primary controls on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await boot(page, { a11y: { ...ON, interfaceScale: 1.5, textScale: 2 } })
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible()
    expect(await controlsOutsideViewport(page)).toEqual([])
    const overlay = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('body *')]
      return nodes.some((node) => {
        const style = getComputedStyle(node)
        return style.position === 'fixed' && style.pointerEvents !== 'none' && node.getAttribute('data-attention-overlay') != null
      })
    })
    expect(overlay).toBe(false)
  })

  test('marks the waveform region without hiding transport', async ({ page }) => {
    await boot(page, { a11y: ON })
    await loadDemo(page)
    await expect(page.locator('[data-attention-region="waveform"]')).toHaveAttribute('data-attention-live', 'true')
    await expect(page.locator('[data-transport]').first()).toBeVisible()
    const play = page.getByRole('button', { name: 'Play', exact: true }).first()
    await expect(play).toBeVisible()
    const opacity = await play.evaluate((el) => getComputedStyle(el).opacity)
    expect(Number(opacity)).toBeGreaterThan(0.9)
  })
})
