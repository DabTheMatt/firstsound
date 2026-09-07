import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ModuleType } from '../audio/chain/chain'
import type { ParamId } from '../audio/parameters/types'
import type { SensoryAxisId } from '../sensory/sensoryParameters'
import { applyDocumentLocale, initialLocale, persistLocale, type Locale } from './locale'
import { messagesFor, paramLabel as lookupParam, type FeelingCopy, type Messages } from './messages'

type I18nValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Messages
  paramLabel: (id: ParamId) => string
  moduleName: (type: ModuleType) => string
  feeling: (id: SensoryAxisId) => FeelingCopy
}

function valueFor(locale: Locale, setLocale: (locale: Locale) => void): I18nValue {
  const t = messagesFor(locale)
  return {
    locale,
    setLocale,
    t,
    paramLabel: (id) => lookupParam(locale, id),
    moduleName: (type) => t.modules[type],
    feeling: (id) => t.sensory.feelings[id],
  }
}

const I18nContext = createContext<I18nValue>(valueFor('en', () => {}))

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const next = initialLocale()
    applyDocumentLocale(next)
    return next
  })
  const value = useMemo(
    () =>
      valueFor(locale, (next) => {
        persistLocale(next)
        applyDocumentLocale(next)
        setLocaleState(next)
      }),
    [locale],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  return useContext(I18nContext)
}
