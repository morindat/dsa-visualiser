# `src/ui/` — presentation layer

React components only. The UI **renders from `(trace, index)`** and never runs an algorithm: by the
time a trace is loaded, every control is index arithmetic, which is what makes step-back, scrubbing
and exact replay nearly free (`ADR-1`, `ADR-4`).

```
ui/
├── shell/          the workbench frame, toolbar button and titlebar brand
├── sidebar/        structure catalogue navigation
├── guide/          guided operation entry + validation feedback (collapsible)
├── panes/          structure view, pseudocode, auxiliary state, complexity, stage
├── controls/       play / pause / step / scrub / restart / speed
├── practice/       predict-the-next-step practice panel
├── tour/           first-run minimap tour
├── overlays/       keyboard shortcut dialog
├── theme/          dark/light theme hook and palette switch
├── hooks/          persistent state + media-query helpers
├── a11y/           ARIA live-region step announcements
├── icons.tsx       shared inline SVG icon set
└── ErrorBoundary.tsx   per-panel failure containment (ER13)
```

## Rules

- **One mutable value.** The step index lives in `app/controller.ts`; components receive it as a
  prop and call controller commands. No component keeps its own index or timer (`ADR-4`).
- **Same code path for mouse and keyboard.** Buttons and keyboard shortcuts must dispatch the same
  controller command, so the accessible path is the real path (`NFR-U2`).
- **Colour is never the only signal.** Every node state (undiscovered / frontier / current /
  visited) also carries a label or a shape, using the semantic Tailwind tokens in `src/index.css`
  (`NFR-U2`).
- **Theme through tokens, not raw hex.** Both themes re-point the same `--color-*` variables, so a
  component never knows whether the page is dark or light. Typography uses IBM Plex Sans with IBM
  Plex Mono for code and numerals.
- **Panel failures stay local.** Each pane/panel sits behind `ErrorBoundary.tsx` so one bad render
  cannot take down the session (`ER13`).
- **The frame stays quiet.** The catalogue auto-hides in explore mode, the inputs guide collapses to
  a summary, and narration plus transport live inside the stage so the visualisation owns the
  viewport.
