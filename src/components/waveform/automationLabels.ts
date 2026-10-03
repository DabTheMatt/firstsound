import type { FxLfoKind } from '../../audio/fx/lfo'
import type { Messages } from '../../i18n/messages'

export function automationEffectLabel(kind: FxLfoKind, modules: Messages['modules'], comb: string): string {
  if (kind === 'input') return modules.gain
  if (kind === 'mixer') return 'Mixer'
  if (kind === 'eqcf') return comb
  if (kind.startsWith('eq')) return `${modules.eq} ${kind.slice(2)}`
  return modules[kind as keyof Messages['modules']] ?? kind
}

/** Effect · parameter, using metadata labels. Strips a repeated effect prefix. */
export function automationLaneTitle(effect: string, parameter: string): string {
  const prefix = `${effect} `
  const name = parameter.startsWith(prefix) ? parameter.slice(prefix.length) : parameter
  return `${effect} · ${name}`
}
