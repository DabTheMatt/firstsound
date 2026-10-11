import { describe, expect, it } from 'vitest'
import { getAttentionContext, type AttentionInput } from './context'
import { attentionSelectors } from './selectors'

function input(patch: Partial<AttentionInput> = {}): AttentionInput {
  return {
    uiMode: 'technical',
    workspace: 'wave',
    modal: null,
    guideActive: false,
    guideTarget: null,
    operation: null,
    selectionActive: false,
    inspectorKind: 'module',
    effectId: 'gain-1',
    effectType: 'gain',
    eqBandId: null,
    eqInstanceId: null,
    automationPointId: null,
    automationLaneId: 'gain',
    lfoEditing: false,
    sensoryAxisId: null,
    assistedOpen: false,
    ...patch,
  }
}

describe('attention context priority', () => {
  it('emphasizes an open marker editor and keeps transport live', () => {
    const ctx = getAttentionContext(input({ markerEditing: true, selectionActive: true }))
    expect(ctx.kind).toBe('marker')
    const marks = attentionSelectors(ctx)
    expect(marks.hit.join(' ')).toContain('data-marker-editor')
    expect(marks.live.join(' ')).toContain('data-transport')
  })

  it('stays on the waveform when only the input module is selected', () => {
    expect(getAttentionContext(input()).kind).toBe('waveform')
  })

  it('prefers an open export dialog over a guided target and a selected band', () => {
    const ctx = getAttentionContext(
      input({
        modal: 'export',
        guideActive: true,
        guideTarget: 'technical.eq',
        eqBandId: 'eqb_a',
        workspace: 'eq',
      }),
    )
    expect(ctx.kind).toBe('export')
    expect(attentionSelectors(ctx).hit).toContain('[data-export-dialog]')
  })

  it('prefers the guided target over an explicit fade', () => {
    const ctx = getAttentionContext(
      input({ guideActive: true, guideTarget: 'edit.fadeIn', operation: 'fade-in' }),
    )
    expect(ctx.kind).toBe('guided')
    expect(ctx.activeTaskTarget).toBe('edit.fadeIn')
    expect(attentionSelectors(ctx).hit.some((item) => item.includes('edit\\.fadeIn') || item.includes('edit.fadeIn'))).toBe(true)
  })

  it('uses trim before a leftover waveform selection', () => {
    const ctx = getAttentionContext(input({ operation: 'trim', selectionActive: true }))
    expect(ctx.kind).toBe('trim')
    expect(attentionSelectors(ctx).hit).toContain('[data-guide-target="edit.trim"]')
  })

  it('uses fade, then selection, then the selected effect', () => {
    expect(getAttentionContext(input({ operation: 'fade-out', selectionActive: true })).kind).toBe('fade')
    expect(getAttentionContext(input({ operation: 'selection', effectType: 'reverb', effectId: 'reverb-2' })).kind).toBe('selection')
    expect(getAttentionContext(input({ effectType: 'reverb', effectId: 'reverb-2' })).kind).toBe('effect')
  })

  it('follows the EQ band id and the effect instance id', () => {
    const ctx = getAttentionContext(
      input({
        workspace: 'eq',
        effectType: 'eq',
        effectId: 'eq-2',
        eqInstanceId: 'eq-2',
        eqBandId: 'eqb_low',
      }),
    )
    expect(ctx.kind).toBe('eq')
    expect(ctx.selectedBandId).toBe('eqb_low')
    expect(ctx.selectedEffectId).toBe('eq-2')
    const hit = attentionSelectors(ctx).hit.join(' ')
    expect(hit).toContain('eqb_low')
    expect(hit).toContain('eq-2')
    expect(hit).not.toContain('eq-1')
    expect(hit).not.toContain('eqb_high')
  })

  it('does not highlight a different reverb instance', () => {
    const ctx = getAttentionContext(input({ effectType: 'reverb', effectId: 'reverb-b', workspace: 'wave' }))
    const hit = attentionSelectors(ctx).hit.join(' ')
    expect(ctx.kind).toBe('effect')
    expect(hit).toContain('reverb-b')
    expect(hit).not.toContain('reverb-a')
  })

  it('follows the selected automation point id', () => {
    const ctx = getAttentionContext(
      input({
        workspace: 'auto',
        inspectorKind: 'automation',
        automationPointId: 'pt-2',
        automationLaneId: 'reverbWet',
      }),
    )
    expect(ctx.kind).toBe('automation')
    const hit = attentionSelectors(ctx).hit.join(' ')
    expect(hit).toContain('pt-2')
    expect(hit).toContain('reverbWet')
    expect(hit).not.toContain('pt-1')
  })

  it('maps workspaces when nothing more specific is selected', () => {
    expect(getAttentionContext(input({ workspace: 'fft', effectType: 'gain' })).kind).toBe('fft')
    expect(getAttentionContext(input({ workspace: 'hearing' })).kind).toBe('hearing')
    expect(getAttentionContext(input({ uiMode: 'sensory', workspace: 'sensory', inspectorKind: null, effectId: null, effectType: null })).kind).toBe('sensory')
    expect(
      getAttentionContext(
        input({ uiMode: 'sensory', workspace: 'sensory', inspectorKind: null, effectId: null, effectType: null, sensoryAxisId: 'warmth' }),
      ).kind,
    ).toBe('sensory')
    expect(attentionSelectors(getAttentionContext(input({ uiMode: 'sensory', workspace: 'sensory', sensoryAxisId: 'warmth', inspectorKind: null, effectId: null, effectType: null }))).hit.join(' ')).toContain('warmth')
  })

  it('keeps LFO editing above the selected effect and below a modal', () => {
    expect(getAttentionContext(input({ lfoEditing: true, effectType: 'delay', effectId: 'delay-1' })).kind).toBe('lfo')
    expect(getAttentionContext(input({ lfoEditing: true, modal: 'settings' })).kind).toBe('dialog')
  })

  it('does not treat the default gain module as the effect context', () => {
    expect(getAttentionContext(input({ selectionActive: true })).kind).toBe('selection')
    expect(getAttentionContext(input({ workspace: 'eq', effectType: 'eq', effectId: 'eq-1', eqBandId: null, eqInstanceId: 'eq-1' })).kind).toBe('eq')
  })
})
