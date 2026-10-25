/**
 * Router — the tiny catalogue route resolver.
 *
 * WHAT GOES HERE
 *   Mapping a route (e.g. `#/tree/inorder`) to a `(structure, operation)` pair and
 *   back. Small, explicit and dependency-free.
 *
 * WHY THIS FILE EXISTS
 *   A2 Table 9 commits to "one tiny router for catalogue routes"; a routing
 *   *library* was rejected because it is not needed (Table 10). URLs make the
 *   workspace shareable and back/forward work, at the cost of ~30 lines here.
 *
 * RULES
 *   No React, D3 or DOM beyond reading/writing the location the app passes in.
 *   Deep links must resolve to the same state the sidebar would produce.
 *
 * STATUS
 *   Not implemented, and lowest priority — the vertical slice does not need it.
 */

export {}
