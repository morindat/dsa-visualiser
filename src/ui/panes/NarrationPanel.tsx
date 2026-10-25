/**
 * NarrationPanel — the visible, plain-English description of the current step.
 *
 * WHAT IT DOES
 *   Shows `step.narration` inside the visualisation stage, next to the transport
 *   bar. When the step carries a `milestone` (a composed-trace boundary), the
 *   panel switches to warning styling and labels itself as a phase boundary. That
 *   is what makes the heap build → extract pause visible, not only audible through
 *   the screen-reader live region.
 *
 * WHY THIS FILE EXISTS
 *   The trace has always carried one sentence per step, but only the hidden
 *   `StepAnnouncer` read it. A sighted learner needs the same explanation, and a
 *   phase change needs to look like a stopping point rather than an ordinary step.
 *
 * RULES
 *   Presentation only: no step index, no timer, no algorithm. Styling uses the
 *   semantic tokens in `src/index.css`.
 */

export type NarrationPanelProps = {
  /** The current step's sentence; empty before a trace is loaded. */
  text: string
  /** Set for a composed-trace boundary such as the heap build → extract pause. */
  milestone?: string
  /** False before any trace is loaded, so "no step" is not shown as blank. */
  hasStep: boolean
  /** `stage` sits inside the visualisation frame; `panel` is the standalone card. */
  variant?: 'panel' | 'stage'
}

export function NarrationPanel({
  text,
  milestone,
  hasStep,
  variant = 'panel',
}: NarrationPanelProps) {
  const isBoundary = milestone !== undefined
  const isStage = variant === 'stage'

  return (
    <section
      aria-label="Narration"
      data-tour="narration"
      className={
        isStage
          ? `border-t px-4 py-2.5 ${
              isBoundary
                ? 'border-warn/40 bg-warn/10'
                : 'border-line bg-surface/45'
            }`
          : `rounded-xl border p-3 ${
              isBoundary
                ? 'border-warn/60 bg-warn/10'
                : 'border-line bg-surface'
            }`
      }
    >
      <div className="mb-1 flex flex-wrap items-baseline gap-2">
        <h2 className="text-[11px] font-semibold tracking-wide text-muted">
          Narration
        </h2>
        {isBoundary && (
          <span className="rounded border border-warn/60 bg-warn/15 px-2 py-0.5 text-[11px] font-semibold text-warn">
            Phase boundary · playback paused
          </span>
        )}
      </div>
      <p
        className={`text-sm leading-6 ${
          isBoundary ? 'font-medium text-warn' : 'text-ink'
        }`}
      >
        {hasStep
          ? text
          : 'Load a trace, then press Visualise to start the walkthrough.'}
      </p>
    </section>
  )
}
