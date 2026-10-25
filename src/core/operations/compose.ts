/**
 * Trace composition — building a multi-phase trace out of single-operation ones.
 *
 * WHAT GOES HERE
 *   `concatSteps(parts)` joins step lists into one trace, renumbering `index` so
 *   the result is a valid 0-based sequence. `withProgress(steps, label)` prefixes
 *   each step's narration, which is how a construction phase says "insert 11
 *   (2 of 9)" instead of an anonymous walk.
 *
 * WHY THIS FILE EXISTS
 *   "Insert the dataset one value at a time, then run the operation" is a
 *   *composition* of two pure algorithms, not a third algorithm. Keeping the join
 *   here means the per-value generators stay unchanged and independently tested,
 *   and every composed trace keeps each step's own `operation` id — which is what
 *   lets the pseudocode pane follow the instruction actually executing (ADR-6).
 *
 * RULES
 *   Pure list manipulation over `Step`; no model knowledge, no React/D3/DOM, no
 *   clock, so composition is as deterministic as the parts (NFR-C2).
 */

import type { Step } from '../trace/step'

/**
 * Concatenates step lists into one trace. `index` is rewritten to the position in
 * the combined list; every other field, including `operation`, is preserved.
 */
export function concatSteps(parts: readonly (readonly Step[])[]): Step[] {
  const combined: Step[] = []
  for (const part of parts) {
    for (const step of part) {
      combined.push({ ...step, index: combined.length })
    }
  }
  return combined
}

/** Prefixes each step's narration with a per-step label, e.g. `Insert 11 (2 of 9): `. */
export function withProgress(
  steps: readonly Step[],
  label: (position: number) => string,
): Step[] {
  return steps.map((step, position) => ({
    ...step,
    narration: `${label(position)}${step.narration}`,
  }))
}
