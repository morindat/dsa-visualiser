# `src/ui/panes/`

The three synchronised views, plus the complexity card. All of them are pure functions of the same
`(trace, index)` — there is no second source of truth (`ADR-1`).

Expected files:

- `StructurePane.tsx` — hosts the appropriate `render/renderers/*` component for the structure.
- `PseudocodePane.tsx` — the single authored listing for the operation, highlighting
  `step.codeLine` (`FR3`, `FR9`). The listing and its line map come from the catalogue record.
- `AuxStatePane.tsx` — selects **one panel component per `aux.kind`** (`array` / `stack` / `queue`
  / `heap` / `visited` / `recursion`) (`FR10`).
- `ComplexityPanel.tsx` — the theoretical bound from `OperationMeta` shown next to the observed
  step and comparison counts (`FR11`).
- `NarrationPanel.tsx` — one plain-English sentence per step (`step.narration`).

Each panel is wrapped in `ErrorBoundary.tsx` so one failure cannot blank the others (`ER13`).
