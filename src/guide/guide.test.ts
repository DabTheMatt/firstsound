import { describe, expect, it } from 'vitest'
import { blankSignal, boundInstance, diffGuideActions, freshBindings, projectSatisfies, type GuideSignal } from './actions'
import { visibleSteps } from './present'
import { INITIAL_GUIDE_STATE, canAdvance, readiness, reduceGuide, type GuideState } from './session'
import { AVAILABLE_CAPABILITIES, GUIDE_TASKS, taskAvailable, taskById } from './tasks'
import { dockSlot } from './targets'
import { LEARNING_TOPICS, topicById } from './topics'
import { GUIDE_TARGETS } from './types'

const caps = new Set(AVAILABLE_CAPABILITIES)

function withSignal(patch: Partial<GuideSignal>): GuideSignal {
  return { ...blankSignal(), sampleLoaded: true, duration: 8, regionStart: 0, regionEnd: 8, ...patch }
}

describe('guided task registry', () => {
  it('ships ten tasks across four categories', () => {
    expect(GUIDE_TASKS).toHaveLength(10)
    expect(new Set(GUIDE_TASKS.map((task) => task.category))).toEqual(
      new Set(['basic', 'improve', 'creative', 'understand']),
    )
    for (const task of GUIDE_TASKS) {
      expect(taskAvailable(task, caps)).toBe(true)
      expect(task.steps.length).toBeGreaterThan(1)
      expect(task.title.en.length).toBeGreaterThan(0)
      expect(task.title.pl.length).toBeGreaterThan(0)
      expect(task.description.en).not.toBe(task.description.pl)
      for (const topicId of task.topics) expect(topicById(topicId)).toBeTruthy()
      for (const step of task.steps) {
        if (step.target) expect(GUIDE_TARGETS).toContain(step.target)
        if (step.technical?.target) expect(GUIDE_TARGETS).toContain(step.technical.target)
        expect(new Set(task.steps.map((item) => item.id)).size).toBe(task.steps.length)
        for (const topicId of step.topics) expect(topicById(topicId)).toBeTruthy()
        for (const field of [step.title, step.instruction] as const) {
          expect(field.en.length).toBeGreaterThan(0)
          expect(field.pl.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('keeps learning topics shared and bilingual', () => {
    const ids = LEARNING_TOPICS.map((topic) => topic.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const topic of LEARNING_TOPICS) {
      expect(topic.summary.en.length).toBeGreaterThan(10)
      expect(topic.summary.pl.length).toBeGreaterThan(10)
      expect(topic.practical.pl.length).toBeGreaterThan(10)
      expect(topic.technical.en.length).toBeGreaterThan(10)
    }
  })
})

describe('guide action detection', () => {
  it('notices real edits and ignores a still project', () => {
    const base = withSignal({})
    expect(diffGuideActions(base, base)).toEqual([])
    expect(diffGuideActions(base, withSignal({ playing: true }))).toContain('playback.started')
    expect(
      diffGuideActions(base, withSignal({ selectionActive: true, regionStart: 1, regionEnd: 3 })),
    ).toContain('selection.created')
    expect(
      diffGuideActions(
        withSignal({ selectionActive: true, regionStart: 1, regionEnd: 4, duration: 8, bufferRev: 1 }),
        withSignal({ selectionActive: false, regionStart: 0, regionEnd: 3, duration: 3, bufferRev: 2 }),
      ),
    ).toContain('trim.completed')
    expect(diffGuideActions(base, withSignal({ fadeIn: 0.05 }))).toContain('fade.in')
    expect(diffGuideActions(base, withSignal({ fadeOut: 0.08 }))).toContain('fade.out')
    expect(diffGuideActions(base, withSignal({ gain: 2 }))).toContain('gain.changed')
    expect(diffGuideActions(base, withSignal({ toneId: 'clearer', eqFlat: false }))).toEqual(
      expect.arrayContaining(['eq.clarity', 'eq.changed']),
    )
    expect(diffGuideActions(base, withSignal({ toneId: 'warmer', eqFlat: false }))).toContain('eq.tone')
    const reverbOn = withSignal({ reverbOn: true, reverbPreset: 'small', reverbShape: 'preset:small', reverbAmount: 0.45 })
    expect(diffGuideActions(base, reverbOn)).toContain('reverb.enabled')
    expect(diffGuideActions(base, reverbOn)).not.toContain('reverb.shaped')
    expect(
      diffGuideActions(reverbOn, { ...reverbOn, reverbPreset: 'medium', reverbShape: 'preset:medium' }),
    ).toContain('reverb.shaped')
    expect(diffGuideActions(reverbOn, { ...reverbOn, reverbAmount: 0.7 })).toContain('reverb.amount')
    const delayOn = withSignal({ delayOn: true, delayPreset: 'short', delayShape: 'preset:short', delayAmount: 0.6 })
    expect(diffGuideActions(base, delayOn)).toEqual(expect.arrayContaining(['delay.enabled']))
    expect(diffGuideActions(base, delayOn)).not.toContain('delay.amount')
    expect(diffGuideActions(base, withSignal({ speed: 1.2 }))).toContain('speed.changed')
    expect(diffGuideActions(base, withSignal({ pitch: 2 }))).toContain('pitch.changed')
    expect(diffGuideActions(base, withSignal({ reversed: true }))).toContain('reverse.changed')
    expect(diffGuideActions(base, withSignal({ exportOpenedCount: 1, exportOpen: true }))).toContain('export.opened')
    expect(diffGuideActions(base, withSignal({ exportCompletedCount: 1 }))).toContain('export.completed')
    expect(diffGuideActions(base, withSignal({ compareCount: 1 }))).toContain('compare.used')
    expect(diffGuideActions(base, withSignal({ waveformTouches: 1 }))).toContain('waveform.touched')
  })

  it('treats an existing fade as already done and a fresh play as not stored', () => {
    expect(projectSatisfies('fade.in', withSignal({ fadeIn: 0.04 }))).toBe(true)
    expect(projectSatisfies('fade.in', withSignal({ fadeIn: 0 }))).toBe(false)
    expect(projectSatisfies('playback.started', withSignal({ playing: false }))).toBe(false)
    expect(projectSatisfies('trim.completed', withSignal({}))).toBe(false)
    expect(projectSatisfies('reverb.shaped', withSignal({ reverbOn: true, reverbPreset: 'medium' }))).toBe(true)
    expect(projectSatisfies('reverb.shaped', withSignal({ reverbOn: true, reverbPreset: 'small' }))).toBe(false)
  })
})

describe('guide session', () => {
  const env = { sampleLoaded: true, uiMode: 'simple' as const }

  function start(id: string, sample = true, mode: 'simple' | 'technical' | 'sensory' = 'simple'): GuideState {
    return reduceGuide(INITIAL_GUIDE_STATE, {
      type: 'start',
      taskId: id,
      env: { sampleLoaded: sample, uiMode: mode },
    })
  }

  it('asks for a sound and does not invent one', () => {
    const next = start('trim-recording', false)
    expect(next.view).toBe('need-sound')
    expect(next.taskId).toBe('trim-recording')
    const ready = reduceGuide(next, { type: 'sample-arrived', env })
    expect(ready.view).toBe('task')
  })

  it('asks before leaving the current mode', () => {
    const next = start('transform-sound', true, 'simple')
    expect(next.view).toBe('mode-ask')
    expect(reduceGuide(next, { type: 'stay-mode' }).view).toBe('task')
  })

  it('completes a step only after the real action', () => {
    let state = start('trim-recording')
    const step = taskById('trim-recording')!.steps[0]!
    expect(canAdvance(step, state, withSignal({}))).toBe(false)
    expect(reduceGuide(state, { type: 'next', signal: withSignal({}) })).toBe(state)
    state = reduceGuide(state, { type: 'actions', actions: ['playback.started'] })
    expect(readiness(step, state, withSignal({}))).toBe('done')
    const advanced = reduceGuide(state, { type: 'next', signal: withSignal({}) })
    expect(advanced.stepIndex).toBe(1)
    expect(advanced.taskActions).toContain('playback.started')
  })

  it('does not force an edit that is already in the project', () => {
    const state = start('smooth-edges')
    const fade = taskById('smooth-edges')!.steps[1]!
    expect(readiness(fade, state, withSignal({ fadeIn: 0.05 }))).toBe('already')
    expect(canAdvance(fade, state, withSignal({ fadeIn: 0.05 }))).toBe(true)
  })

  it('keeps audio progress when moving back, skipping, pausing, and restarting the guide', () => {
    let state = start('prepare-export')
    state = reduceGuide(state, { type: 'actions', actions: ['selection.created'] })
    state = reduceGuide(state, { type: 'next', signal: withSignal({ selectionActive: true }) })
    expect(state.stepIndex).toBe(1)
    state = reduceGuide(state, { type: 'skip', signal: withSignal({}) })
    expect(state.stepIndex).toBe(2)
    state = reduceGuide(state, { type: 'back' })
    expect(state.stepIndex).toBe(1)
    expect(state.notice).toBe('back-keeps-edits')
    expect(state.taskActions).toContain('selection.created')
    const minimized = reduceGuide(state, { type: 'minimize' })
    expect(minimized.panel).toBe('minimized')
    expect(minimized.stepIndex).toBe(1)
    const closed = reduceGuide(minimized, { type: 'close' })
    expect(closed.view).toBe('closed')
    expect(closed.taskId).toBe('prepare-export')
    const restarted = reduceGuide(closed, { type: 'restart' })
    expect(restarted.stepIndex).toBe(0)
    expect(restarted.taskActions).toEqual([])
    expect(restarted.view).toBe('task')
  })

  it('lets an informational step advance and blocks skip on a required step', () => {
    const state = start('understand-waveform')
    const first = taskById('understand-waveform')!.steps[0]!
    expect(first.completion.kind).toBe('manual')
    expect(reduceGuide(state, { type: 'next', signal: null }).stepIndex).toBe(1)
    expect(reduceGuide(state, { type: 'skip', signal: null })).toBe(state)
  })
})

describe('technical guided tasks', () => {
  const task = () => taskById('add-space')!

  function start(id: string, mode: 'simple' | 'technical' = 'technical'): GuideState {
    return reduceGuide(INITIAL_GUIDE_STATE, {
      type: 'start',
      taskId: id,
      env: { sampleLoaded: true, uiMode: mode },
    })
  }

  it('starts Add space in Technical without asking to switch modes', () => {
    const state = start('add-space', 'technical')
    expect(state.view).toBe('task')
    expect(state.stepIndex).toBe(0)
  })

  it('keeps Simple steps and adds Technical chain steps on the same task', () => {
    const state = start('add-space', 'simple')
    const signal = withSignal({})
    expect(visibleSteps(task(), 'simple', signal, state).map((step) => step.id)).toEqual([
      'listen',
      'find',
      'enable',
      'space',
      'amount',
      'compare',
    ])
    expect(visibleSteps(task(), 'technical', signal, state).map((step) => step.id)).toEqual([
      'listen',
      'tech-add',
      'tech-select',
      'tech-wet',
      'compare',
    ])
    expect(visibleSteps(task(), 'technical', withSignal({ reverbIds: 'reverb-1' }), state).map((step) => step.id)).toEqual([
      'listen',
      'tech-select',
      'tech-wet',
      'compare',
    ])
  })

  it('retargets after a mode switch without clearing finished steps', () => {
    let state = start('add-space', 'simple')
    state = reduceGuide(state, { type: 'actions', actions: ['playback.started'] })
    state = reduceGuide(state, { type: 'next', signal: withSignal({}), mode: 'simple' })
    expect(task().steps[state.stepIndex]?.id).toBe('find')
    const moved = reduceGuide(state, { type: 'retarget', mode: 'technical', signal: withSignal({}) })
    expect(moved.taskId).toBe('add-space')
    expect(moved.taskActions).toContain('playback.started')
    expect(task().steps[moved.stepIndex]?.id).toBe('tech-add')
    const present = reduceGuide(moved, {
      type: 'retarget',
      mode: 'technical',
      signal: withSignal({ reverbIds: 'reverb-1' }),
    })
    expect(task().steps[present.stepIndex]?.id).toBe('tech-select')
    expect(present.taskActions).toContain('playback.started')
  })

  it('binds one effect instance and refuses to guess between two', () => {
    const blank = blankSignal()
    expect(boundInstance('delay', withSignal({ delayIds: 'delay-1,delay-2' }), {})).toBeNull()
    expect(boundInstance('delay', withSignal({ delayIds: 'delay-1' }), {})).toBe('delay-1')
    expect(freshBindings(blank, withSignal({ delayIds: 'delay-1,delay-2' }), {}, new Set())).toBeNull()
    expect(freshBindings(blank, withSignal({ delayIds: 'delay-1' }), {}, new Set())?.delay).toBe('delay-1')
    expect(
      freshBindings(withSignal({ delayIds: 'delay-1' }), withSignal({ delayIds: 'delay-1,delay-2' }), {}, new Set(['delay']))
        ?.delay,
    ).toBe('delay-2')
    expect(
      freshBindings(withSignal({ delayIds: 'delay-1' }), withSignal({ delayIds: 'delay-1,delay-2' }), { delay: 'delay-1' }, new Set())
        ?.delay,
    ).toBeUndefined()
  })

  it('detects chain, selection, wet, and band edits as real actions', () => {
    const base = withSignal({})
    expect(diffGuideActions(base, withSignal({ reverbIds: 'reverb-1' }))).toContain('reverb.added')
    expect(
      diffGuideActions(withSignal({ reverbIds: 'reverb-1' }), withSignal({ reverbIds: 'reverb-1', focusedId: 'reverb-1' })),
    ).toContain('reverb.selected')
    expect(diffGuideActions(base, withSignal({ reverbWet: 0.2 }))).toContain('reverb.wet')
    expect(diffGuideActions(base, withSignal({ reverbWet: 0.2 }))).not.toContain('reverb.amount')
    expect(diffGuideActions(base, withSignal({ delayTime: 420 }))).toContain('delay.time')
    expect(diffGuideActions(base, withSignal({ eqShape: 'eq-1:2800:2.00:1.00:peaking' }))).toContain('eq.changed')
    expect(projectSatisfies('reverb.added', withSignal({ reverbIds: 'reverb-1' }))).toBe(false)
    expect(projectSatisfies('reverb.wet', withSignal({ reverbWet: 0.2 }))).toBe(true)
    expect(projectSatisfies('reverb.selected', withSignal({ reverbIds: 'reverb-1', focusedId: 'reverb-1' }))).toBe(true)
    expect(projectSatisfies('delay.time', withSignal({ delayTime: 800 }))).toBe(false)
  })
})

describe('guide layout', () => {
  it('docks away from a control in the lower half', () => {
    expect(dockSlot({ left: 20, top: 640, width: 72, height: 40 }, 800, 1280)).toBe('top-left')
    expect(dockSlot({ left: 40, top: 40, width: 80, height: 48 }, 800, 1280)).toBe('bottom-left')
    expect(dockSlot({ left: 16, top: 80, width: 900, height: 620 }, 800, 1280)).toBe('top-right')
    expect(dockSlot({ left: 8, top: 520, width: 360, height: 200 }, 844, 390)).toBe('top-left')
    expect(dockSlot(null, 700)).toBe('bottom-left')
  })
})
