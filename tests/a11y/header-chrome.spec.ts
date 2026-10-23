import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { boot, openAccess } from './support'

mkdirSync('/opt/cursor/artifacts', { recursive: true })

async function closeModeHelp(page: import('@playwright/test').Page, name: string): Promise<void> {
  const dialog = page.getByRole('dialog', { name })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).toBeHidden()
}

test('drops the extra sensory and simple rows and matches Guide me to Help', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await boot(page, { mode: 'sensory' })

  await expect(page.getByRole('button', { name: /^Markers, / })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Atmosphere:/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /parameter strings/i })).toHaveCount(0)

  const pair = await page.evaluate(() => {
    const guide = [...document.querySelectorAll('button')].find((node) => node.textContent?.trim() === 'Guide me')
    const help = document.querySelector('[data-intro-help]')
    if (!(guide instanceof HTMLElement) || !(help instanceof HTMLElement)) return null
    const read = (node: HTMLElement) => {
      const style = getComputedStyle(node)
      const box = node.getBoundingClientRect()
      return {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        color: style.color,
        textTransform: style.textTransform,
        borderTopWidth: style.borderTopWidth,
        height: Math.round(box.height),
        top: Math.round(box.top),
      }
    }
    return { guide: read(guide), help: read(help) }
  })
  expect(pair).not.toBeNull()
  expect(pair!.guide).toEqual(pair!.help)
  await page.screenshot({ path: '/opt/cursor/artifacts/sensory-header.png' })

  await page.getByRole('radio', { name: 'Simple' }).click()
  await closeModeHelp(page, 'Simple')
  await expect(page.getByRole('button', { name: /^Markers, / })).toHaveCount(0)
  await page.screenshot({ path: '/opt/cursor/artifacts/simple-header.png' })

  await page.getByRole('radio', { name: 'Technical' }).click()
  await closeModeHelp(page, 'Technical')
  await expect(page.getByRole('button', { name: 'Markers, 0' })).toBeVisible()
})

test('keeps a MacBook Pro header on one row and hides memory and UI load', async ({ page }) => {
  async function bar() {
    return page.evaluate(() => {
      const header = document.querySelector('header[data-stable-region="navigation"]')
      if (!(header instanceof HTMLElement)) return null
      const box = header.getBoundingClientRect()
      const controls = [...header.querySelectorAll('button, [role="radio"]')]
        .filter((node) => node instanceof HTMLElement && node.getClientRects().length > 0)
        .map((node) => {
          const rect = node.getBoundingClientRect()
          return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
        })
      const tops = controls.map((rect) => rect.top)
      let overlap = false
      for (let i = 0; i < controls.length; i++) {
        for (let j = i + 1; j < controls.length; j++) {
          const a = controls[i]
          const b = controls[j]
          if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlap = true
        }
      }
      return {
        display: getComputedStyle(header).display,
        height: Math.round(box.height),
        text: header.innerText.replace(/\s+/g, ' '),
        rowSpan: tops.length ? Math.max(...tops) - Math.min(...tops) : 0,
        overlap,
      }
    })
  }

  for (const width of [1512, 1728]) {
    await page.setViewportSize({ width, height: 982 })
    await boot(page, { mode: 'technical' })
    const layout = await bar()
    expect(layout).not.toBeNull()
    expect(layout!.display).toBe('flex')
    expect(layout!.height).toBeLessThan(56)
    expect(layout!.rowSpan).toBeLessThan(20)
    expect(layout!.overlap).toBe(false)
    expect(layout!.text).not.toMatch(/Mem /)
    expect(layout!.text).not.toMatch(/UI \d+%/)
    expect(layout!.text).not.toMatch(/00:00/)
    expect(layout!.text).toContain('LOAD SAMPLE')
    expect(layout!.text).toContain('TECHNICAL')
  }

  await page.screenshot({ path: '/opt/cursor/artifacts/header-mbp-native.png' })

  await page.setViewportSize({ width: 1920, height: 1080 })
  await expect.poll(async () => (await bar())?.text ?? '').toMatch(/Mem /)
  const wide = await bar()
  expect(wide!.display).toBe('flex')
  expect(wide!.height).toBeLessThan(56)
  expect(wide!.text).toMatch(/UI \d+%/)
  expect(wide!.text).toMatch(/00:00/)
})

test('explains every accessibility switch from its tooltip', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await boot(page, { mode: 'technical' })
  await openAccess(page)
  const dialog = page.getByRole('dialog', { name: 'FIELD ACCESS' })
  const motion = dialog.getByRole('switch', { name: 'Reduced Motion' })
  await expect(motion).toHaveAttribute('data-explain', 'a11y.reduceMotion')
  await expect(motion).toHaveAttribute('title', /animation/i)
  const strength = dialog.getByRole('radio', { name: 'Subtle', exact: true })
  await expect(strength).toHaveAttribute('title', /Clear is easier to see/i)
  await page.getByText('More accessibility options', { exact: true }).click()
  const tips = dialog.getByRole('checkbox', { name: 'Tooltips / parameter descriptions' })
  await expect(tips.locator('xpath=ancestor::label[1]')).toHaveAttribute('data-explain', 'a11y.tips')
  await expect(tips).toHaveAttribute('title', /short description/i)
  await expect(dialog.getByText('Shows a short description when you point at a control.')).toBeVisible()
  await page.screenshot({ path: '/opt/cursor/artifacts/access-tooltips.png' })
})
