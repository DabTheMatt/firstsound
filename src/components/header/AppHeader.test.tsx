import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppViewSwitch } from '../../app/AppViewSwitch'
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
        viewSwitch={<AppViewSwitch view="workspace" onChange={() => undefined} />}
        guideLabel="Guide me"
        onOpenGuide={() => undefined}
      />
    </I18nProvider>,
  )
}

describe('technical header menu', () => {
  it('shows Workspace once, beside SHED', () => {
    const html = headerMarkup()
    expect(html.match(/>Workspace</g)).toHaveLength(1)
    expect(html).toContain('data-app-view="workspace"')
    expect(html).toContain('>SHED<')
    expect(html.match(/>Guide me</g)).toHaveLength(1)
  })
})
