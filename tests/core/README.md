# `tests/core/`

Pure unit and property tests for the algorithm core. These tests must pass **with no DOM**: no
`document`, no `window`, no React, no D3. If one needs a browser, the architecture has been broken —
fix the import, not the test (`NFR-M2`, `NFR-M3`).

What belongs here:

- **Invariant tests** — assert the structure invariant at *every step* of *every* trace: BST
  ordering, LIFO for stacks, FIFO for queues, the min-heap property at each parent/child index,
  acyclic parent links, no self-loops.
- **Reference-implementation tests** — reconstruct the structure from a trace and compare it to an
  independent implementation of the same operation (`NFR-C1`).
- **Property tests with `fast-check`** — randomised inputs, including degenerate shapes (already
  sorted, all-equal, single element, empty).
- **Validation tests** — malformed input is reported, never repaired (`ADR-7`, `FR6`).

Run just this layer with `npm run test:core`.
