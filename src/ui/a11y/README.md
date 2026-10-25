# `src/ui/a11y/`

Accessibility helpers targeting WCAG 2.1 AA (`NFR-U2`).

Expected files:

- `StepAnnouncer.tsx` — an `aria-live="polite"` region that announces the current step's narration
  and index as it changes, so a screen-reader user hears the same thing a sighted user sees.
- `VisuallyHidden.tsx` — text that is available to assistive technology but not painted.
- `nodeStateLabel.ts` — maps a node state (undiscovered / frontier / current / visited) to a short
  text label, so colour is never the sole carrier of meaning.

Keyboard commands must share the controller code path with the pointer controls — the accessible
route is the real route, not a parallel one.
