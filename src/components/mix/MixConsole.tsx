import { MAX_MIX_LAYERS, MIX_LAYER_INSERTS, MIX_LAYER_FOCUSES, detectLayerFocus } from '../../audio/mix/layers'
import type { MixLayerRecipe } from '../../audio/mix/layers'
import { engine, useEngine } from '../../hooks/useEngine'
import styles from './MixConsole.module.css'

const RECIPES: { recipe: MixLayerRecipe; label: string; hint: string }[] = [
  { recipe: 'copy', label: 'Copy', hint: 'Duplicate the sample and mix it in' },
  { recipe: 'delay', label: 'Delay', hint: 'Subtle delay copy' },
  { recipe: 'reverb', label: 'Reverb', hint: 'Space copy' },
  { recipe: 'lows', label: 'Lows', hint: 'Low-frequency copy' },
  { recipe: 'highs', label: 'Highs', hint: 'High-frequency copy' },
  { recipe: 'split', label: 'Split', hint: 'Original → lows + highs' },
]

export function MixConsole() {
  const snap = useEngine()
  const layers = snap.mixLayers
  const canAdd = layers.length < MAX_MIX_LAYERS

  return (
    <div className={styles.console} aria-label="Effects mix center">
      <header className={styles.head}>
        <div>
          <h2 className={styles.title}>Mix center</h2>
          <p className={styles.lead}>
            Copies of the sample, each with its own EQ and insert. Mix how much of each layer you hear.
          </p>
        </div>
        <div className={styles.recipes} role="group" aria-label="Add mix layer">
          {RECIPES.map((item) => (
            <button
              key={item.recipe}
              type="button"
              className={styles.recipe}
              title={item.hint}
              disabled={!canAdd && item.recipe !== 'split'}
              onClick={() => engine.addMixLayer(item.recipe)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>
      <div className={styles.strips}>
        {layers.map((layer) => {
          const focus = detectLayerFocus(layer.eq)
          const audible = !layer.muted && (layers.every((item) => !item.solo || item.muted) || layer.solo)
          return (
            <article
              key={layer.id}
              className={`${styles.strip} ${audible ? '' : styles.stripOff} ${layer.solo ? styles.stripSolo : ''}`}
            >
              <header className={styles.stripHead}>
                <input
                  className={styles.name}
                  value={layer.name}
                  aria-label="Layer name"
                  onChange={(event) => engine.setMixLayer(layer.id, { name: event.target.value })}
                />
              </header>
              <label className={styles.faderWrap}>
                <span className={styles.faderValue}>{Math.round(layer.mix)}</span>
                <input
                  className={styles.fader}
                  type="range"
                  min={0}
                  max={150}
                  step={1}
                  value={layer.mix}
                  aria-label={`${layer.name} mix`}
                  onChange={(event) => engine.setMixLayer(layer.id, { mix: Number(event.target.value) })}
                />
                <span className={styles.faderLabel}>Mix</span>
              </label>
              <div className={styles.toggles}>
                <button
                  type="button"
                  className={layer.muted ? styles.toggleOn : styles.toggle}
                  aria-pressed={layer.muted}
                  onClick={() => engine.setMixLayer(layer.id, { muted: !layer.muted })}
                >
                  M
                </button>
                <button
                  type="button"
                  className={layer.solo ? styles.toggleSolo : styles.toggle}
                  aria-pressed={layer.solo}
                  onClick={() => engine.setMixLayer(layer.id, { solo: !layer.solo })}
                >
                  S
                </button>
              </div>
              <label className={styles.insert}>
                <span>Insert</span>
                <select
                  value={layer.insert}
                  aria-label={`${layer.name} insert`}
                  onChange={(event) =>
                    engine.setMixLayer(layer.id, {
                      insert: event.target.value as (typeof MIX_LAYER_INSERTS)[number]['value'],
                    })
                  }
                >
                  {MIX_LAYER_INSERTS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.focus} role="group" aria-label={`${layer.name} band focus`}>
                {MIX_LAYER_FOCUSES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={focus === item.value ? styles.focusOn : styles.focusBtn}
                    aria-pressed={focus === item.value}
                    onClick={() => engine.setMixLayerFocus(layer.id, item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.ghost}
                  disabled={!canAdd}
                  onClick={() => engine.duplicateMixLayer(layer.id)}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className={styles.ghost}
                  disabled={layers.length <= 1}
                  onClick={() => engine.removeMixLayer(layer.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
