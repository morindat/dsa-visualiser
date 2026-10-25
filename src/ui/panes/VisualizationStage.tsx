/**
 * VisualizationStage — the main working surface.
 *
 * The structure view fills the available height; the narration, optional practice
 * card and transport bar are stacked at its foot inside the same frame. That keeps
 * the explanation and the controls next to the picture instead of in a page footer
 * that competes with the visualisation for vertical space.
 */

import type { ReactNode } from 'react'
import type { ControllerSnapshot } from '../../app/controller'
import { PHASE_LABEL, type Phase } from '../../app/stateMachine'
import { ChevronDownIcon } from '../icons'

export type VisualizationStageProps = {
  structure: ReactNode
  narration: ReactNode
  practice?: ReactNode
  controls: ReactNode
  structureLabel: string
  operationLabel: string
  snapshot: ControllerSnapshot
  /** Shown when the inputs guide is collapsed. */
  onEditInputs?: () => void
}

const PHASE_TONE: Record<Phase, string> = {
  IDLE: 'border-line bg-raised text-muted',
  READY: 'border-line bg-raised text-ink-dim',
  PLAYING: 'border-accent/50 bg-accent/15 text-accent',
  PAUSED: 'border-warn/50 bg-warn/15 text-warn',
  FINISHED: 'border-good/50 bg-good/15 text-good',
  ERROR: 'border-bad/50 bg-bad/15 text-bad',
}

export function VisualizationStage({
  structure,
  narration,
  practice,
  controls,
  structureLabel,
  operationLabel,
  snapshot,
  onEditInputs,
}: VisualizationStageProps) {
  const total = snapshot.trace.length
  const stepLabel =
    total === 0 ? 'no trace' : `${snapshot.index + 1} / ${total}`

  return (
    <section
      aria-label="Visualization"
      data-tour="stage"
      className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-muted">
            <span className="text-ink-dim">{structureLabel}</span>
            <span className="mx-1 text-subtle">/</span>
            Visualising
          </p>
          <h2 className="truncate text-sm font-semibold tracking-tight text-ink">
            {operationLabel}
          </h2>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span
            className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${PHASE_TONE[snapshot.phase]}`}
          >
            {PHASE_LABEL[snapshot.phase]}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-muted">
            {stepLabel}
          </span>
          {onEditInputs !== undefined && (
            <button
              type="button"
              onClick={onEditInputs}
              className="inline-flex items-center gap-1 rounded-md border border-line bg-base-deep/60 px-2 py-1 text-[11px] font-medium text-ink-dim hover:border-line-strong hover:text-ink"
            >
              Inputs
              <ChevronDownIcon size={11} />
            </button>
          )}
        </div>
      </header>

      <div className="stage-grid min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
        {structure}
      </div>

      {practice}
      {narration}
      {controls}
    </section>
  )
}
