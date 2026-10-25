/**
 * `stackPeek` — array-backed stack operation generator.
 *
 * WHAT IT DOES
 *   Reads the top without changing the structure:
 *
 *     line 2  check whether the stack is empty
 *     line 3  return null on underflow
 *     line 4  return the top value
 *
 * WHY IT EXISTS
 *   Peek is the operation that proves "the top is the only reachable end": it does
 *   one comparison and one read, never a walk. Its trace is therefore two or three
 *   steps regardless of stack size.
 *
 * RULES
 *   Pure; no React, D3, `render/`, `ui/`, timers or DOM. Deterministic (NFR-C2).
 *   Cost: O(1) time, O(1) auxiliary space. The trace carries an empty delta: peek
 *   really does change nothing.
 */

import {
  applyStackDelta,
  stackPeekEntry,
  stackValues,
  type StackModel,
} from '../../model/stack'
import type { StructureValue } from '../../model/order'
import type { GenerateSummary, Step } from '../../trace/step'

export const OPERATION_ID = 'stackPeek'

export type StackPeekResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: StackModel
  /** The top value, or `null` when the stack was empty. */
  peeked: StructureValue | null
}

export function stackPeek(initial: StackModel): StackPeekResult {
  const steps: Step[] = []

  let state = initial

  const record = (
    codeLine: number,
    narration: string,
    highlight: Step['highlight'],
    activeIndices: number[],
  ): void => {
    state = applyStackDelta(state, {})
    steps.push({
      index: steps.length,
      operation: OPERATION_ID,
      codeLine,
      narration,
      highlight,
      delta: {},
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
      'The stack is empty (top = -1), so there is no top value to read.',
      { nodes: [], edges: [] },
      [],
    )
    record(
      3,
      'Return null. Peek on an empty stack is a reported outcome; the stack is unchanged.',
      { nodes: [], edges: [] },
      [],
    )

    return {
      trace: steps,
      summary: {
        steps: steps.length,
        comparisons: 0,
        conclusion:
          'Peek on an empty stack returned null; the stack is unchanged.',
      },
      finalState: state,
      peeked: null,
    }
  }

  // line 2 — the guard passes.
  record(
    2,
    `The stack is not empty: top is slot ${initial.top}, holding ${String(topEntry.value)}.`,
    { nodes: [topEntry.id], active: topEntry.id, edges: [] },
    [initial.top],
  )

  // line 4 — read the top value.
  record(
    4,
    `Return the top value ${String(topEntry.value)}. Peek is O(1) and changes nothing.`,
    { nodes: [topEntry.id], active: topEntry.id, edges: [] },
    [initial.top],
  )

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons: 0,
      conclusion: `Peeked ${String(topEntry.value)} in O(1); the stack is unchanged.`,
    },
    finalState: state,
    peeked: topEntry.value,
  }
}
