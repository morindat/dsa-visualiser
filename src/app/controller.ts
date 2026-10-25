/**
 * Session controller — the single owner of the step index and the single timer.
 *
 * WHAT IT DOES
 *   The `PlaybackController` the UI talks to: `load`, `play`, `pause`,
 *   `stepForward`, `stepBack`, `restart`, `seek`. Each command is idempotent and
 *   clamped to `0 … trace.length - 1`, and each publishes the new snapshot to its
 *   subscribers (the UI reads it through `useSyncExternalStore`).
 *
 * WHY THIS FILE EXISTS
 *   There is exactly one mutable value in the whole app — the index — and exactly
 *   one timer (ADR-4, ER12). Having them here is what makes playback a pure
 *   function of `(trace, index)` everywhere else, and makes step-back, scrub and
 *   exact replay nearly free (ADR-1). The timer drives the index from *elapsed
 *   time*, not tick counts, so a slow frame drops steps instead of changing the
 *   logical playback rate.
 *
 * STRUCTURE-AGNOSTIC BY DESIGN
 *   The controller does not know about lists, heaps, trees or graphs. `LoadInput`
 *   carries a `structureId`, and `app/reducers.ts` supplies the reducer the trace
 *   must be replayed with. Adding a structure therefore changes the registry, not
 *   this file — which is the property NFR-S2 asks for. The models are tagged with
 *   their id in `StructureState`, so the render layer gets a type-safe model.
 *
 * RULES
 *   The only layer that knows about time, and only PLAYING owns a timer. It must
 *   not import React or the DOM — it is a plain object, unit-testable in Node.
 *   `reconstruct` is always a fresh copy, so nothing can corrupt a checkpoint.
 */

import type { GenerateSummary, Step } from '../core/trace/step'
import { createTraceStore, type TraceStore } from '../core/trace/store'
import { reducerFor, wrapState, type StructureState } from './reducers'
import { canPlay, type Phase } from './stateMachine'

export type ControllerSnapshot = {
  phase: Phase
  index: number
  trace: readonly Step[]
  summary: GenerateSummary | null
  structureId: string | null
  operationId: string | null
  error: string | null
}

export type LoadInput = {
  /** The structure before step 0. Which model it is follows from `structureId`. */
  initial: unknown
  steps: readonly Step[]
  summary: GenerateSummary
  structureId: string
  operationId: string
}

export type PlaybackController = {
  subscribe(listener: () => void): () => void
  getSnapshot(): ControllerSnapshot
  /** The structure at the current index, or `null` before a trace is loaded. */
  getState(): StructureState | null
  load(input: LoadInput): void
  fail(message: string): void
  play(): void
  pause(): void
  stepForward(): void
  stepBack(): void
  restart(): void
  seek(index: number): void
  /** Current wall-clock milliseconds between steps while playing. */
  getStepMs(): number
  /** Change the playback rate; an active PLAYING timer is re-anchored. */
  setStepMs(stepMs: number): void
}

export type ControllerOptions = {
  /** Wall-clock milliseconds between steps while playing. */
  stepMs?: number
  /** How often the timer wakes up to recompute the index. */
  tickMs?: number
  /** Injectable clock, so tests are deterministic. */
  now?: () => number
}

export function createPlaybackController(
  options: ControllerOptions = {},
): PlaybackController {
  let stepMs = options.stepMs ?? 700
  const tickMs = options.tickMs ?? 80
  const now = options.now ?? ((): number => performance.now())

  const listeners: (() => void)[] = []
  let store: TraceStore<unknown> | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let playStartedAt = 0
  let indexAtPlayStart = 0
  /** Step indices marked as phase boundaries; playback pauses on them. */
  let milestones: number[] = []

  let snapshot: ControllerSnapshot = {
    phase: 'IDLE',
    index: 0,
    trace: [],
    summary: null,
    structureId: null,
    operationId: null,
    error: null,
  }

  const publish = (patch: Partial<ControllerSnapshot>): void => {
    snapshot = { ...snapshot, ...patch }
    for (const listener of listeners) {
      listener()
    }
  }

  const lastIndex = (): number => snapshot.trace.length - 1
  const clamp = (index: number): number =>
    Math.max(0, Math.min(index, lastIndex()))

  const stopTimer = (): void => {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  const tick = (): void => {
    const advance = Math.floor((now() - playStartedAt) / stepMs)
    const next = clamp(indexAtPlayStart + advance)

    // Stop ON a boundary step instead of stepping over it. This is what gives the
    // heap build a visible pause before extraction starts. `>` (not `>=`) means
    // pressing Play again resumes past the boundary rather than re-pausing.
    const boundary = milestones.find(
      (milestone) => milestone > snapshot.index && milestone <= next,
    )
    if (boundary !== undefined) {
      stopTimer()
      publish({ index: boundary, phase: 'PAUSED' })
      return
    }

    if (next >= lastIndex()) {
      stopTimer()
      publish({ index: next, phase: 'FINISHED' })
    } else if (next !== snapshot.index) {
      publish({ index: next })
    }
  }

  const play = (): void => {
    if (!canPlay(snapshot.phase) || snapshot.trace.length === 0) return

    // Replaying from the end starts over rather than doing nothing.
    const start = snapshot.index >= lastIndex() ? 0 : snapshot.index
    indexAtPlayStart = start
    playStartedAt = now()
    stopTimer()
    publish({ phase: 'PLAYING', index: start })
    timer = setInterval(tick, tickMs)
  }

  const pause = (): void => {
    if (snapshot.phase !== 'PLAYING') return
    stopTimer()
    publish({ phase: snapshot.index >= lastIndex() ? 'FINISHED' : 'PAUSED' })
  }

  /** Any manual jump stops the timer and lands in PAUSED (or FINISHED at the end). */
  const moveTo = (index: number): void => {
    if (snapshot.trace.length === 0) return
    stopTimer()
    const next = clamp(index)
    publish({ index: next, phase: next >= lastIndex() ? 'FINISHED' : 'PAUSED' })
  }

  return {
    subscribe(listener) {
      listeners.push(listener)
      return () => {
        const at = listeners.indexOf(listener)
        if (at !== -1) listeners.splice(at, 1)
      }
    },

    getSnapshot() {
      return snapshot
    },

    getState() {
      if (store === null || snapshot.structureId === null) return null
      return wrapState(snapshot.structureId, store.reconstruct(snapshot.index))
    },

    load(input) {
      stopTimer()
      milestones = []

      // An unknown structure id is a programming error (the catalogue and the
      // registry are out of step), so it is reported through the error phase
      // rather than thrown at the caller.
      let reducer: ReturnType<typeof reducerFor>
      try {
        reducer = reducerFor(input.structureId)
      } catch (error) {
        publish({
          phase: 'ERROR',
          error: error instanceof Error ? error.message : String(error),
        })
        return
      }

      store = createTraceStore<unknown>(input.initial, input.steps, reducer)
      milestones = input.steps.reduce<number[]>((indices, step, index) => {
        if (step.milestone !== undefined) indices.push(index)
        return indices
      }, [])
      publish({
        phase: 'READY',
        index: 0,
        trace: input.steps,
        summary: input.summary,
        structureId: input.structureId,
        operationId: input.operationId,
        error: null,
      })
    },

    fail(message) {
      stopTimer()
      publish({ phase: 'ERROR', error: message })
    },

    play,
    pause,

    stepForward() {
      moveTo(snapshot.index + 1)
    },

    stepBack() {
      moveTo(snapshot.index - 1)
    },

    restart() {
      if (snapshot.trace.length === 0) return
      stopTimer()
      publish({ index: 0, phase: 'READY' })
    },

    seek(index) {
      moveTo(index)
    },

    getStepMs() {
      return stepMs
    },

    setStepMs(next) {
      if (!Number.isFinite(next) || next <= 0) return
      stepMs = next
      // Re-anchor an active playback so the new rate applies from this moment,
      // not from the original Play press (A3 control inventory: "the new rate
      // applies from the next step").
      if (snapshot.phase === 'PLAYING') {
        indexAtPlayStart = snapshot.index
        playStartedAt = now()
      }
    },
  }
}
