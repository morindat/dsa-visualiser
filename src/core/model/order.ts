/**
 * Value ordering — the one total order the ordered structures share.
 *
 * WHAT GOES HERE
 *   `compareValues(a, b)`, the three-way comparator (`-1 | 0 | 1`) used by the BST
 *   and by the heap. Both structures are built on "does a come before b?", so the
 *   answer must be decided once. If the BST and the heap each rolled their own,
 *   a BST built by the heap and searched by the tree could disagree.
 *
 * WHY IT IS A SEPARATE MODULE
 *   The type of a structure value is the frozen contract's `string | number`
 *   (trace/step.ts). A comparator for that contract type is a supporting module,
 *   not a sixth structure: it stores nothing, has no state and no reducer, and it
 *   is imported by both `bst.ts` and `binaryHeap.ts` (module map: `core-model` may
 *   import `core-model`).
 *
 * WHY THE MIXED CASE IS DEFINED RATHER THAN REJECTED
 *   Validation accepts numbers and short words (app/validate.ts), so a single
 *   structure can legitimately hold both. JavaScript's own `<` would compare a
 *   number with a string by coercing both to strings (`10 < "9"`) — surprising,
 *   and worse, its result depends on the operation rather than on the data. We
 *   therefore define a total order: numbers by numeric value, strings by code
 *   unit, and numbers before strings when the two kinds are mixed. It is stable,
 *   it is total (exactly one of `-1`, `0`, `1` for any pair), and it is documented
 *   here so a test can assert it instead of a reader having to guess.
 *
 * RULES
 *   Pure and side-effect free. No React, D3, `render/`, `ui/` or DOM. Deterministic
 *   — no locale-sensitive `localeCompare`, so the same pair always compares the
 *   same way on every machine (NFR-C2).
 */

/** The value type a structure stores (trace/step.ts). */
export type StructureValue = string | number

/**
 * Total three-way order over structure values.
 *
 * @returns `-1` when `a` sorts before `b`, `1` when it sorts after, `0` when equal.
 */
export function compareValues(a: StructureValue, b: StructureValue): number {
  if (typeof a === 'number' && typeof b === 'number') {
    if (a < b) return -1
    if (a > b) return 1
    return 0
  }

  if (typeof a === 'string' && typeof b === 'string') {
    // Code-unit order (`<`) rather than `localeCompare`, because the latter is
    // locale-dependent and would make traversal output differ between machines.
    if (a < b) return -1
    if (a > b) return 1
    return 0
  }

  // Mixed kinds: numbers sort before strings. Either rule is defensible; what
  // matters is that there is exactly one of them and it is stated.
  return typeof a === 'number' ? -1 : 1
}

/** `true` when `a` and `b` are the same value under the shared order. */
export function valuesEqual(a: StructureValue, b: StructureValue): boolean {
  return compareValues(a, b) === 0
}
