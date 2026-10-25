/**
 * `stackPop` — array-backed stack operation generator.
 *
 * WHAT IT DOES
 *   Emits a readable trace for one pop, including the empty-stack case:
 *
 *     line 2  check whether the stack is empty
 *     line 3  return null on underflow (an outcome, not an exception)
 *     line 4  read the top value
 *     line 5  move `top` down one slot
 *     line 6  drop the entry that is now above the top
 *     line 7  return the value
 *
 *   The order of lines 5 and 6 is deliberate: the pointer moves first and the
 *   abandoned cell is removed second, so the animation shows the top stepping
 *   down before the cell disappears.
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `stackPop`.
 *
 * RULES
 *   Pure; no React, D3, `render/`, `ui/`, timers or DOM. Deterministic (NFR-C2).
 *   Cost: O(1) time, O(1) auxiliary space. Underflow is total.
 */

import {
  TOP_POINTER,
  applyStackDelta,
  stackPeekEntry,
  stackValues,
  type StackModel,
} from '../../model/stack'
import type { StructureValue } from '../../model/order'
import type { GenerateSummary, Step } from '../../trace/step'

export const OPERATION_ID = 'stackPop'

export type StackPopResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: StackModel
  /** The popped value, or `null` when the stack was empty. */
  popped: StructureValue | null
}

export function stackPop(initial: StackModel): StackPopResult {
  const steps: Step[] = []

  let state = initial

  const record = (
    codeLine: number,
    narration: string,
    delta: Step['delta'],
    highlight: Step['highlight'],
    activeIndices: number[],
  ): void => {
    state = applyStackDelta(state, delta)
    steps.push({
      index: steps.length,
      operation: OPERATION_ID,
      codeLine,
      narration,
      highlight,
      delta,
      aux: {
        kind: 'stack',
        values: stackValues(state),
        indices: activeIndices,
        comparisons: 0,
      },
    })
  }

  const topEntry = stackPeekEntry(initial)

  // line 2 — underflow guard.
  if (topEntry === undefined) {
    record(
      2,
      'The stack is empty (top = -1), so there is nothing to pop.',
      {},
      { nodes: [], edges: [] },
      [],
    )
    record(
      3,
      'Return null. Pop on an empty stack is an outcome, not an exception; the stack is unchanged.',
      {},
      { nodes: [], edges: [] },
      [],
    )

    return {
      trace: steps,
      summary: {
        steps: steps.length,
        comparisons: 0,
        conclusion:
          'Pop on an empty stack returned null; underflow is an outcome, not an exception.',
      },
      finalState: state,
      popped: null,
    }
  }

  const oldTop = initial.top
  const newTop = oldTop - 1
  const value = topEntry.value
  const newTopEntry = newTop < 0 ? undefined : state.entries[newTop]

  // line 2 — the guard passes.
  record(
    2,
    `The stack is not empty: top is slot ${oldTop}, holding ${String(value)}.`,
    {},
    { nodes: [topEntry.id], active: topEntry.id, edges: [] },
    [oldTop],
  )

  // line 4 — read the value (no structural change yet).
  record(
    4,
    `Read the top value ${String(value)}; it will be returned after the pointer moves.`,
    {},
    { nodes: [topEntry.id], active: topEntry.id, edges: [] },
    [oldTop],
  )

  // line 5 — move top down. The old entry is still in the array, now above top.
  record(
    5,
    `Move top from ${oldTop} down to ${newTop}. The old top cell is now above the stack and will be removed.`,
    { updated: [{ id: TOP_POINTER, from: oldTop, to: newTop }] },
    { nodes: [topEntry.id], active: topEntry.id, edges: [] },
    newTop < 0 ? [] : [newTop],
  )

  // line 6 — drop the abandoned entry.
  record(
    6,
    newTopEntry === undefined
      ? `Remove ${String(value)} from slot ${oldTop}. The stack is empty again.`
      : `Remove ${String(value)} from slot ${oldTop}. ${String(newTopEntry.value)} is now the top.`,
    { removed: [topEntry.id] },
    newTopEntry === undefined
      ? { nodes: [], edges: [] }
      : { nodes: [newTopEntry.id], active: newTopEntry.id, edges: [] },
    newTop < 0 ? [] : [newTop],
  )

  // line 7 — return the value.
  record(
    7,
    `Return ${String(value)}. O(1): only the top cell and the top pointer were touched.`,
    {},
    newTopEntry === undefined
      ? { nodes: [], edges: [] }
      : { nodes: [newTopEntry.id], active: newTopEntry.id, edges: [] },
    newTop < 0 ? [] : [newTop],
  )

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons: 0,
      conclusion:
        newTopEntry === undefined
          ? `Popped ${String(value)} in O(1); the stack is now empty.`
          : `Popped ${String(value)} in O(1); the top is now ${String(newTopEntry.value)}.`,
    },
    finalState: state,
    popped: value,
  }
}
