# `tests/e2e/`

One end-to-end Playwright walkthrough — deliberately **only one** (`NFR-U1`, `Table 10`).

The walkthrough should follow the single graded path: open the catalogue, pick linked-list insert,
enter a dataset, generate the trace, then step forward, step back and scrub, asserting that the
structure view, the pseudocode highlight and the auxiliary panel stay in sync.

Why so little: the algorithm and rendering layers are already covered by fast unit, property and
golden-trace tests. Playwright exists to prove the pieces are *wired together in a real browser*,
and multi-browser support is what fits `NFR-Po1`.
