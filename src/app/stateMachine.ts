/**
 * Playback state machine.
 *
 * WHAT GOES HERE
 *   The explicit phases `IDLE → READY → PLAYING ⇄ PAUSED → FINISHED`, plus `ERROR`.
 *   The guards live here; the controller applies the transitions.
 *
 * WHY THIS FILE EXISTS
 *   Naming the states turns "phase and index cannot disagree" into a property
 *   instead of a hope: READY, PLAYING, PAUSED and FINISHED all hold a valid trace,
 *   so every control is clamped index arithmetic. Only PLAYING owns a timer, and
 *   play is idempotent, so rapid input cannot start a second animation loop
 *   (ADR-4, ER12).
 *
 * RULES
 *   Pure transition logic — no React, D3 or DOM. `erasableSyntaxOnly` is on, so
 *   phases are a `const` tuple + union type, not a TS `enum`.
 */

export const PHASES = [
  'IDLE',
  'READY',
  'PLAYING',
  'PAUSED',
  'FINISHED',
  'ERROR',
] as const

export type Phase = (typeof PHASES)[number]

/** The phases that hold a valid trace, so every control is clamped index maths. */
export function holdsTrace(phase: Phase): boolean {
  return (
    phase === 'READY' ||
    phase === 'PLAYING' ||
    phase === 'PAUSED' ||
    phase === 'FINISHED'
  )
}

/** Play is only meaningful from READY or PAUSED; it is a no-op anywhere else. */
export function canPlay(phase: Phase): boolean {
  return phase === 'READY' || phase === 'PAUSED'
}

export function isPlaying(phase: Phase): boolean {
  return phase === 'PLAYING'
}

export const PHASE_LABEL: Record<Phase, string> = {
  IDLE: 'Idle',
  READY: 'Ready',
  PLAYING: 'Playing',
  PAUSED: 'Paused',
  FINISHED: 'Finished',
  ERROR: 'Error',
}
