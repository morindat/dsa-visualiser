# `tests/golden/`

Golden-trace snapshot tests. Each test runs a `(structure, operation, dataset)` triple and compares
the emitted trace against the committed fixture in `src/data/golden/*.json`, byte for byte.

This is the regression net that replaces screenshot testing (`NFR-C2`):

- the output is stable — no wall-clock, no randomness, fixed neighbour order;
- a change is a **readable text diff**, so a reviewer can see *which* step changed and why;
- the same trace is what exact replay consumes, so a passing golden test means replay is correct.

When an intentional behaviour change is made, regenerate the relevant fixture and commit it as part
of the same change — never leave a golden file that no longer describes the code.
