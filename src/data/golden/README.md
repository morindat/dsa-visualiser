# `src/data/golden/`

Recorded traces used as **golden-trace regression fixtures** (`NFR-C2`). One JSON file per
`(structure, operation, dataset)` triple. A behaviour change then shows up as a readable text diff
instead of an opaque failing screenshot — which is why screenshot testing is deliberately avoided.

Why determinism matters here: trace generation must use no wall-clock, no randomness and a fixed
neighbour order, so the same triple always produces a **byte-identical** trace. That is the same
property that makes exact replay of any step possible (`ADR-1`).

Ad-hoc dumps do **not** belong here — `.gitignore` sends `trace-dumps/` and `*.trace.json` to the
bin, while committed fixtures live under this directory.
