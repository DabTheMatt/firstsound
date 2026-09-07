import type { ParamDef } from '../audio/parameters/types'
import type { Locale } from '../i18n/locale'

function spokenNumber(value: number, digits: number, locale: Locale): string {
  const abs = Math.abs(value)
  const formatted = abs.toFixed(digits).replace(/\.?0+$/, '') || '0'
  if (value < 0) return locale === 'pl' ? `minus ${formatted}` : `minus ${formatted}`
  if (value > 0 && (digits > 0 || Number.isInteger(value))) {
    return locale === 'pl' && value > 0 && !formatted.startsWith('+') ? formatted : formatted
  }
  return formatted
}

function withSign(value: number, digits: number, locale: Locale): string {
  const abs = Math.abs(value).toFixed(digits).replace(/\.?0+$/, '') || '0'
  if (value < 0) return locale === 'pl' ? `minus ${abs}` : `minus ${abs}`
  if (value > 0) return locale === 'pl' ? `plus ${abs}` : `plus ${abs}`
  return abs
}

function hzText(hz: number, locale: Locale): string {
  if (hz >= 1000) {
    const khz = hz / 1000
    const n = khz >= 10 ? khz.toFixed(1) : khz.toFixed(2)
    return locale === 'pl' ? `${n} kiloherców` : `${n} kilohertz`
  }
  const n = hz >= 100 ? Math.round(hz).toString() : hz.toFixed(1)
  return locale === 'pl' ? `${n} herców` : `${n} hertz`
}

function msText(ms: number, locale: Locale): string {
  const n = Math.abs(ms) >= 20 ? Math.round(ms).toString() : ms.toFixed(1)
  return locale === 'pl' ? `${n} milisekund` : `${n} milliseconds`
}

function pct(value: number): string {
  return String(Math.round(value))
}

export function formatAccessibleValue(value: number, def: ParamDef, locale: Locale): string {
  const unit = def.unit
  switch (unit) {
    case 'dB':
      return locale === 'pl'
        ? `${spokenNumber(value, 1, locale)} decybeli`
        : `${spokenNumber(value, 1, locale)} decibels`
    case 'Hz':
      return hzText(value, locale)
    case 'ms':
      return msText(value, locale)
    case 's':
      return locale === 'pl' ? `${spokenNumber(value, 3, locale)} sekund` : `${spokenNumber(value, 3, locale)} seconds`
    case 'st':
      return locale === 'pl'
        ? `${withSign(value, 2, locale)} półtonów`
        : `${withSign(value, 2, locale)} semitones`
    case '%':
      if (def.id === 'pan' || def.id === 'delayPan' || def.id === 'reverbPan') {
        if (Math.abs(value) < 0.5) return locale === 'pl' ? 'środek' : 'center'
        if (value < 0) {
          return locale === 'pl' ? `${pct(-value)} procent w lewo` : `${pct(-value)} percent left`
        }
        return locale === 'pl' ? `${pct(value)} procent w prawo` : `${pct(value)} percent right`
      }
      if (def.id === 'filterMix' || def.id === 'saturationMix' || def.id.includes('Wet')) {
        return locale === 'pl' ? `${pct(value)} procent wet` : `${pct(value)} percent wet`
      }
      return locale === 'pl' ? `${pct(value)} procent` : `${pct(value)} percent`
    case 'x':
      return locale === 'pl' ? `${spokenNumber(value, 2, locale)} razy` : `${spokenNumber(value, 2, locale)} times`
    default:
      break
  }

  if (def.id.endsWith('Ratio') || def.id === 'limiterRatio' || def.id === 'compressorRatio') {
    return locale === 'pl' ? `${spokenNumber(value, 1, locale)} do 1` : `${spokenNumber(value, 1, locale)} to 1`
  }
  if (def.id.endsWith('Q') || def.id.includes('PeakQ')) {
    return `Q ${spokenNumber(value, 2, locale)}`
  }
  if (def.id.includes('Freeze') || def.id.includes('Sync') || def.id.includes('Solo') || def.id.includes('Mono')) {
    const on = value > 0.5
    return on ? (locale === 'pl' ? 'włączone' : 'on') : locale === 'pl' ? 'wyłączone' : 'off'
  }

  const digits = def.step != null && def.step < 1 ? 2 : 1
  const n = spokenNumber(value, digits, locale)
  if (unit) return `${n} ${unit}`
  return n
}

export function formatPercentValue(amount: number, locale: Locale): string {
  const n = Math.round(Math.min(1, Math.max(0, amount)) * 100)
  return locale === 'pl' ? `${n} procent` : `${n} percent`
}
