/**
 * Structure registry — how the session layer stays structure-agnostic.
 *
 * WHAT GOES HERE
 *   The list of structure ids the app can run, a discriminated `StructureState`
 *   union, and the registry that maps a structure id to the reducer its trace must
 *   be replayed with.
 *
 * WHY THIS FILE EXISTS
 *   The trace store replays deltas through a *structure-owned* reducer: only the
 *   list knows what a list delta means (A2 §4.8). The session controller must not
 *   import every model and branch on the structure, or it would have to change
 *   every time a structure is added. Instead `LoadInput` carries a `structureId`
 *   string and the controller asks this registry for the reducer — one lookup, no
 *   structure-specific code in the controller.
 *
 * WHY THE CASTS ARE CONTAINED HERE
 *   `TraceStore` replays an `unknown` state, so the reducer boundary needs one cast
 *   per structure. Keeping all four casts in this file means the rest of the app
 *   works with the discriminated `StructureState` union and never casts at all: a
 *   renderer that switches on `state.structureId` gets the right model type from
 *   the union.
 *
 * RULES
 *   Pure lookups. No React, D3 or DOM; no timer. Imports only core models and the
 *   trace contract, so `core/` stays unaware of `app/`.
 */

import { applyBstDelta, type BinarySearchTree } from '../core/model/bst'
import { applyGraphDelta, type GraphModel } from '../core/model/graph'
import { applyHeapDelta, type BinaryHeap } from '../core/model/binaryHeap'
import { applyListDelta, type LinkedListModel } from '../core/model/linkedList'
import { applyStackDelta, type StackModel } from '../core/model/stack'
import type { StructureDelta } from '../core/trace/step'

/** Every structure the catalogue can offer. The order is the sidebar order. */
export const STRUCTURE_IDS = ['list', 'stack', 'heap', 'bst', 'graph'] as const

export type StructureId = (typeof STRUCTURE_IDS)[number]

export function isStructureId(value: string): value is StructureId {
  return (STRUCTURE_IDS as readonly string[]).includes(value)
}

/**
 * The reconstructed model tagged with the structure it belongs to. The tag is what
 * lets a renderer pick the right component and the right model type without a cast
 * (see the union members below).
 */
export type StructureState =
  | { structureId: 'list'; model: LinkedListModel }
  | { structureId: 'stack'; model: StackModel }
  | { structureId: 'heap'; model: BinaryHeap }
  | { structureId: 'bst'; model: BinarySearchTree }
  | { structureId: 'graph'; model: GraphModel }

/** A reducer over an `unknown` state — the shape the trace store needs. */
export type AnyStructureReducer = (
  state: unknown,
  delta: StructureDelta,
) => unknown

/**
 * One reducer per structure, each delegating to the model that owns the delta
 * semantics. The casts are safe because a trace is generated from, and loaded
 * with, the same structure id.
 */
const REDUCERS: Record<StructureId, AnyStructureReducer> = {
  list: (state, delta) => applyListDelta(state as LinkedListModel, delta),
  stack: (state, delta) => applyStackDelta(state as StackModel, delta),
  heap: (state, delta) => applyHeapDelta(state as BinaryHeap, delta),
  bst: (state, delta) => applyBstDelta(state as BinarySearchTree, delta),
  graph: (state, delta) => applyGraphDelta(state as GraphModel, delta),
}

/** The reducer for a structure id. Throws on an unknown id, so a typo fails loudly. */
export function reducerFor(structureId: string): AnyStructureReducer {
  if (!isStructureId(structureId)) {
    throw new Error(`Unknown structure "${structureId}"`)
  }
  return REDUCERS[structureId]
}

/** Tags a reconstructed model with its structure id, for the render layer. */
export function wrapState(structureId: string, model: unknown): StructureState {
  switch (structureId) {
    case 'list':
      return { structureId: 'list', model: model as LinkedListModel }
    case 'stack':
      return { structureId: 'stack', model: model as StackModel }
    case 'heap':
      return { structureId: 'heap', model: model as BinaryHeap }
    case 'bst':
      return { structureId: 'bst', model: model as BinarySearchTree }
    case 'graph':
      return { structureId: 'graph', model: model as GraphModel }
    default:
      throw new Error(`Unknown structure "${structureId}"`)
  }
}
