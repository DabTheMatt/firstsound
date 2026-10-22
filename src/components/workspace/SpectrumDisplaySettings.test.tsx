import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../../i18n'
import { SpectrumDisplaySettings } from './SpectrumDisplaySettings'

function markup(surface: 'eq' | 'fft'): string {
  return renderToStaticMarkup(
    <I18nProvider>
      <SpectrumDisplaySettings surface={surface} />
    </I18nProvider>,
  )
}

describe('EQ graph menu', () => {
  it('puts column count, fall, and follow on the EQ menu', () => {
    const eq = markup('eq')
    expect(eq).toContain('Columns')
    expect(eq).toContain('Fall')
    expect(eq).toContain('Follow')
    expect(eq).toContain('Peak')
    expect(eq).toContain('Normal')
    expect(eq).toContain('>32<')
    const fft = markup('fft')
    expect(fft).not.toContain('Columns')
    expect(fft).not.toContain('Follow')
  })
})
