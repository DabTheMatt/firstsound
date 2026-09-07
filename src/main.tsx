import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.tsx'
import { I18nProvider } from './i18n'
import { bootstrapA11y } from './a11y'
import { bootstrapTheme } from './theme'
import './styles/global.css'

bootstrapTheme()
bootstrapA11y()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
