# `src/ui/shell/`

The workbench frame that everything else is mounted inside: a top toolbar, an auto-hiding
catalogue sidebar on the left, the collapsible inputs guide above a visualisation stage, and an
inspector rail holding pseudocode, auxiliary state and complexity. On a wide screen (`≥ 1280 px`)
the frame is viewport-height and the rail scrolls; below that the page scrolls normally. On compact
screens the catalogue becomes a drawer with a scrim instead of squeezing the stage (`NFR-Po2`).

Expected files (names are a suggestion, not fixed by A2):

- `WorkspaceShell.tsx` — layout + mount points; receives already-built nodes plus the sidebar
  auto-hide/pin state. It owns only layout state (hover/focus/mobile drawer).
- `ToolButton.tsx` — compact toolbar button with an icon and an accessible label.

Keeps no algorithm state: the step index belongs to `app/controller.ts` (`ADR-4`).
