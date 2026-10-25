/**
 * `stackPush` — array-backed stack operation generator.
 *
 * WHAT IT DOES
 *   Emits the beats of one push, so the O(1) end-only cost is visible:
 *
 *     line 2  check capacity (and report the occasional resize honestly)
 *     line 3  grow the array when it is full (a copy, O(n), amortised away)
 *     line 4  advance `top` into the next cell
 *     line 5  write the new entry into that cell
 *     line 6  return
 *
 *   Between lines 4 and 5 the top pointer points at a *pending* slot. The stack
 *   renderer draws that slot dashed, which is the visual difference between "room
 *   reserved" and "value stored".
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `stackPush`.
 *
 * HOW IT IS SHARED
 *   Pure `(structure, request) -> { trace, summary, finalState }`. Every delta is
 *   applied through `applyStackDelta`, the same reducer the trace store replays,
 *   so the animation and the reconstructed stack cannot drift.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic (NFR-C2).
 *   Cost: amortised O(1) time, O(1) auxiliary space.
 */

import {
  CAPACITY_FIELD,
  MIN_STACK_CAPACITY,
  TOP_POINTER,
  applyStackDelta,
  nextStackEntryId,
  stackValues,
  type StackModel,
} from '../../model/stack'
import type { StructureValue } from '../../model/order'
import type { GenerateSummary, NodeId, Step } from '../../trace/step'

export const OPERATION_ID = 'stackPush'

export type StackPushRequest = { value: StructureValue }

export type StackPushResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: StackModel
  pushedId: NodeId
}

export function stackPush(
  initial: StackModel,
  request: StackPushRequest,
): StackPushResult {
  const steps: Step[] = []
  const newId = nextStackEntryId(initial)
  const oldTop = initial.top
  const newTop = oldTop + 1
  const required = initial.entries.length + 1
  const resized = required > initial.capacity
  const newCapacity = resized
    ? Math.max(MIN_STACK_CAPACITY, initial.capacity * 2)
    : initial.capacity

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

  // line 2 — capacity check. A push on the boundary is where the O(n) copy hides.
  record(
    2,
    resized
      ? `The array is full: size ${initial.entries.length} = capacity ${initial.capacity}. A resize is needed before the write.`
      : `There is room in the array: size ${initial.entries.length} < capacity ${initial.capacity}. No resize is needed.`,
    {},
    { nodes: [], edges: [] },
    [],
  )

  // line 3 — grow the array. This copy is O(n); the doubling is what makes the
  // amortised cost O(1) over a sequence of pushes.
  if (resized) {
    record(
      3,
      `Grow the capacity from ${initial.capacity} to ${newCapacity} by copying the entries. This one copy is O(n), which doubling amortises over later pushes.`,
      {
        updated: [
          {
            id: CAPACITY_FIELD,
            from: initial.capacity,
            to: newCapacity,
          },
        ],
      },
      { nodes: [], edges: [] },
      [],
    )
  }

  // line 4 — advance top into the pending cell. No entry is there yet.
  record(
    4,
    `Advance top from ${oldTop} to ${newTop}. The new cell is reserved but still empty.`,
    { updated: [{ id: TOP_POINTER, from: oldTop, to: newTop }] },
    { nodes: [], edges: [] },
    [newTop],
  )

  // line 5 — write the entry.
  record(
    5,
    `Write ${String(request.value)} into slot ${newTop}; it is now the top entry.`,
    { created: [{ id: newId, value: request.value }] },
    { nodes: [newId], active: newId, edges: [] },
    [newTop],
  )

  // line 6 — return.
  record(
    6,
    `Pushed ${String(request.value)}. Only the top cell changed, so the push is O(1)${
      resized ? ' apart from the one resize copy' : ''
    }.`,
    {},
    { nodes: [newId], active: newId, edges: [] },
    [newTop],
  )

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons: 0,
      conclusion: resized
        ? `Pushed ${String(request.value)} in amortised O(1); this push triggered one O(n) resize to capacity ${newCapacity}.`
        : `Pushed ${String(request.value)} onto the stack in O(1); top is now slot ${newTop}.`,
    },
    finalState: state,
    pushedId: newId,
  }
}
