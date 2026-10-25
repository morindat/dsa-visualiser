# `src/render/` — rendering / view-model layer

Geometry and structure-specific SVG. This layer is split out of `ui/` for one reason: it is the
single place where a visualisation library could otherwise leak a **second source of truth**
(§5.1, `ADR-2`).

```
render/
├── layout/      pure geometry maths: hierarchy.ts, force.ts, scales.ts
└── renderers/   one component per structure: list.tsx, stack.tsx, heap.tsx, tree.tsx, graph.tsx
```

## The rule: D3 computes, React renders

D3 is a **computation library** here, never the DOM owner. Renderers are pure functions of
`(stateAtI, step) -> SVG`, and React owns every element. D3 is imported through submodules only —
`d3-hierarchy`, `d3-force`, `d3-scale`, `d3-shape`, `d3-interpolate`. `d3-selection` is deliberately
**not installed**: installing it would make "D3 owns the DOM" the path of least resistance
(`ADR-2`).

Two consequences:

- **No step index and no timers here.** Renderers receive the state and the step; they never seek.
- **Layout is view state only.** A vertex position must never be read by an algorithm, or moving a
  node could change a traversal result and break determinism (`A1 §6.3`, `NFR-C2`). `d3-force`
  mutates its input by design, so positions are computed from a *copy* and never written back.

Motion is expressed as CSS transitions on `transform`/`opacity`, or computed with
`d3-interpolate` and passed to React as values — never applied to the DOM directly. It is removed
entirely under `prefers-reduced-motion` (`NFR-U2`).
