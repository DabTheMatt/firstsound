import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { engine } from '../../hooks/useEngine'
import { I18nProvider } from '../../i18n'
import { AppHeader } from './AppHeader'

function headerMarkup(): string {
  return renderToStaticMarkup(
    <I18nProvider>
      <AppHeader
        snap={engine.getSnapshot()}
        settingsOpen={false}
        lfoCenterOpen={false}
        onToggleSettings={() => undefined}
        onToggleLfoCenter={() => undefined}
        onLoadSample={() => undefined}
        onRecord={() => undefined}
        onReset={() => undefined}
        compact={false}
        guideLabel="Guide me"
        onOpenGuide={() => undefined}
      />
    </I18nProvider>,
  )
}

describe('technical header menu', () => {
  it('does not offer Workspace, Activity, or SHED', () => {
    const html = headerMarkup()
    expect(html).not.toContain('>Workspace<')
    expect(html).not.toContain('data-app-view="workspace"')
    expect(html).not.toContain('data-app-view="activity"')
    expect(html).not.toContain('>Activity<')
    expect(html).not.toContain('>SHED<')
    expect(html).not.toContain('data-app-view="shed"')
    expect(html.match(/>Guide me</g)).toHaveLength(1)
    expect(html).toContain('>Help<')
    expect(html).not.toContain('>?')
  })
})
