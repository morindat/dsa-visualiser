/**
 * PlaybackControls — the transport bar inside the visualisation stage.
 *
 * WHAT IT DOES
 *   Play/pause, step, restart, scrub and change speed. Every control dispatches a
 *   controller command, so a button and a keyboard shortcut take the same code
 *   path (`NFR-U2`). Buttons disable themselves according to the phase and the
 *   index, so the UI cannot reach an invalid state.
 *
 * WHY THIS FILE EXISTS
 *   Playback is index arithmetic over one trace (`ADR-1`, `ADR-4`). The controls
 *   own no state of their own; they read the controller snapshot and call into it.
 *   The bar lives inside the stage rather than in a page footer, so it is always
 *   visible next to the thing it controls.
 *
 * RULES
 *   No timer here — PLAYING is the only phase that owns one, and it lives in
 *   `app/controller.ts`. Styling uses the semantic tokens in `src/index.css`.
 */

import type { ControllerSnapshot } from '../../app/controller'
import { holdsTrace } from '../../app/stateMachine'
import {
  GaugeIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  RestartIcon,
} from '../icons'

export type PlaybackControlsProps = {
  snapshot: ControllerSnapshot
  /** Wall-clock milliseconds between steps; the speed selector maps to this. */
  stepMs: number
  /** Practice mode asks a question before advancing; Play is then unavailable. */
  playDisabled?: boolean
  /** A short line shown under the transport bar when Play is unavailable. */
  note?: string
  onPlay(): void
  onPause(): void
  onStepForward(): void
  onStepBack(): void
  onRestart(): void
  onSeek(index: number): void
  onStepMsChange(stepMs: number): void
}

const SPEEDS = [
  { ms: 1400, label: '0.5×' },
  { ms: 700, label: '1×' },
  { ms: 467, label: '1.5×' },
  { ms: 350, label: '2×' },
  { ms: 233, label: '3×' },
] as const

const BUTTON =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs font-medium text-ink transition-colors hover:border-line-strong hover:bg-raised disabled:opacity-40'

const PRIMARY =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-accent bg-accent px-3.5 text-xs font-semibold text-accent-ink transition-colors hover:border-accent-strong hover:bg-accent-strong disabled:opacity-40'

export function PlaybackControls({
  snapshot,
  stepMs,
  playDisabled = false,
  note,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onRestart,
  onSeek,
  onStepMsChange,
}: PlaybackControlsProps) {
  const total = snapshot.trace.length
  const loaded = holdsTrace(snapshot.phase) && total > 0
  const playing = snapshot.phase === 'PLAYING'
  const atStart = snapshot.index === 0
  const atEnd = total === 0 || snapshot.index >= total - 1
  const milestones = snapshot.trace.reduce<number[]>((indices, step, index) => {
    if (step.milestone !== undefined) indices.push(index)
    return indices
  }, [])

  return (
    <div
      role="group"
      aria-label="Playback"
      data-tour="controls"
      className="border-t border-line bg-surface/80 px-3 py-2.5 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={BUTTON}
            onClick={onRestart}
            disabled={!loaded}
            aria-label="Restart"
            title="Restart (R)"
          >
            <RestartIcon size={14} />
            <span className="hidden sm:inline">Restart</span>
          </button>
          <button
            type="button"
            className={BUTTON}
            onClick={onStepBack}
            disabled={!loaded || atStart}
            aria-label="Previous step"
            title="Previous step (← or P)"
          >
            <PreviousIcon size={14} />
            <span className="hidden sm:inline">Prev</span>
          </button>
          <button
            type="button"
            className={PRIMARY}
            onClick={playing ? onPause : onPlay}
            disabled={!loaded || (playDisabled && !playing)}
            aria-label={playing ? 'Pause' : 'Play'}
            title={
              playDisabled && !playing
                ? 'Answer the prediction to continue'
                : playing
                  ? 'Pause (Space)'
                  : 'Play (Space)'
            }
          >
            {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>
          <button
            type="button"
            className={BUTTON}
            onClick={onStepForward}
            disabled={!loaded || atEnd}
            aria-label="Next step"
            title="Next step (→ or N)"
          >
            <NextIcon size={14} />
            <span className="hidden sm:inline">Next</span>
          </button>
        </div>

        <div className="flex min-w-44 flex-1 items-center gap-2">
          <span className="font-mono text-[11px] tabular-nums text-muted">
            {total === 0 ? '0' : snapshot.index + 1}
          </span>
          <div className="relative flex-1">
            <input
              type="range"
              min={0}
              max={Math.max(total - 1, 0)}
              value={snapshot.index}
              disabled={!loaded}
              onChange={(event) => onSeek(Number(event.target.value))}
              className="range relative z-10 block"
              aria-label="Scrub to a step"
            />
            {milestones.map((index) => (
              <span
                key={index}
                aria-hidden="true"
                title="Phase boundary"
                className="pointer-events-none absolute top-1/2 z-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-warn bg-warn/70"
                style={{
                  left: `${
                    total <= 1 ? 0 : (index / Math.max(total - 1, 1)) * 100
                  }%`,
                }}
              />
            ))}
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted">
            {total}
          </span>
        </div>

        <label className="flex items-center gap-1.5 text-[11px] text-muted">
          <GaugeIcon size={13} />
          <span className="sr-only">Playback speed</span>
          <select
            aria-label="Playback speed"
            value={stepMs}
            onChange={(event) => onStepMsChange(Number(event.target.value))}
            className="rounded border border-line bg-base-deep px-1.5 py-1 font-mono text-[11px] text-ink outline-none hover:border-line-strong focus:border-accent"
          >
            {SPEEDS.map((speed) => (
              <option key={speed.ms} value={speed.ms}>
                {speed.label}
              </option>
            ))}
          </select>
        </label>

        <div
          className="hidden items-center gap-1 xl:flex"
          aria-label="Keyboard shortcuts"
        >
          <kbd className="kbd">←</kbd>
          <kbd className="kbd">→</kbd>
          <kbd className="kbd">space</kbd>
        </div>
      </div>

      {note !== undefined && (
        <p className="mt-1.5 text-[11px] text-warn">{note}</p>
      )}
    </div>
  )
}
