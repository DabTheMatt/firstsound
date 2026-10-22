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
