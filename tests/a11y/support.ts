import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export const REPRESENTATIVE_THEMES = ['studio-dark', 'soft-slate', 'warm-paper', 'dusk'] as const

export const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
] as const

type Boot = {
  mode?: 'simple' | 'technical' | 'sensory'
  theme?: string
  a11y?: Record<string, boolean>
  reducedMotion?: 'reduce' | 'no-preference'
}

export async function boot(page: Page, init: Boot = {}): Promise<void> {
  if (init.reducedMotion) await page.emulateMedia({ reducedMotion: init.reducedMotion })
  await page.addInitScript((state) => {
    localStorage.setItem('field.uiLocale', 'en')
    localStorage.setItem('firstsound.uiMode', state.mode ?? 'technical')
    localStorage.setItem('field.theme', state.theme ?? 'studio-dark')
    localStorage.setItem('field.technicalInterface', 'workspace')
    if (state.a11y) localStorage.setItem('field.a11y', JSON.stringify(state.a11y))
  }, init)
  await page.goto('/')
  await page.locator('#root').waitFor()
  // Phone layouts hide the mode radiogroup. Settings (Technical) or Menu (Sensory) is always present.
  await page.getByRole('button', { name: /^(Settings|Menu)$/ }).first().waitFor({ timeout: 20_000 })
}

/** axe WCAG tags. A clean result is not a conformance claim. */
export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const summary = results.violations
    .map((violation) => {
      const targets = violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(' '))
        .join(' | ')
      return `${violation.id} (${violation.impact}): ${violation.help} — ${targets}`
    })
    .join('\n')
  expect(results.violations, summary || 'axe violations').toEqual([])
}

export async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
}

export async function openAccess(page: Page): Promise<void> {
  await openSettings(page)
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Accessibility', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'FIELD ACCESS' })).toBeVisible()
}

export async function loadDemo(page: Page): Promise<void> {
  await openSettings(page)
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await dialog.getByRole('button', { name: 'Generate demo sample' }).click()
  await expect(page.getByRole('region', { name: /^Waveform,/ })).toBeVisible({ timeout: 60_000 })
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
}

export async function controlsOutsideViewport(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll('button, [role="slider"], [role="tab"], [role="switch"], input, select')]
    return nodes
      .filter((el) => {
        if (!(el instanceof HTMLElement)) return false
        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
        if (el.closest('[hidden], [aria-hidden="true"]')) return false
        const rect = el.getBoundingClientRect()
        if (rect.width < 2 || rect.height < 2) return false
        const outside = rect.right > window.innerWidth + 2 || rect.left < -2
        if (!outside) return false
        let node: HTMLElement | null = el.parentElement
        while (node) {
          const parent = getComputedStyle(node)
          const box = node.getBoundingClientRect()
          const sticksOut = rect.right > box.right + 2 || rect.left < box.left - 2
          const scrollable = parent.overflowX === 'auto' || parent.overflowX === 'scroll'
          if (sticksOut && scrollable && node.scrollWidth > node.clientWidth + 1) return false
          if (sticksOut && (parent.overflowX === 'hidden' || parent.overflowX === 'clip')) return true
          node = node.parentElement
        }
        return true
      })
      .map((el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 80))
  })
}
