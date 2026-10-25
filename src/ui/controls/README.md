# `src/ui/controls/`

Playback: play, pause, step forward, step back, scrub, restart, speed and exact replay of any step.
Every control is an operation on the **single** step index owned by `app/controller.ts` (`ADR-4`).

Expected files:

- `PlaybackControls.tsx` — the transport bar inside the stage; each control calls a controller
  command. Shows milestone ticks under the scrubber and a 0.5×–3× speed selector.
- `useKeyboardShortcuts.ts` — `Space`, `←`/`P`, `→`/`N`, `R`, `Home`/`End`, `?` and `Esc`,
  dispatching the *same* controller commands as the buttons (`NFR-U2`).

`PLAYING` is the only state that owns a timer; play must be idempotent so rapid input cannot start
two animations (`ER12`, `ADR-4`). Changing speed re-anchors an active timer at the current step.
Typing in an input, select or textarea is ignored, and Space on a focused button is left to the
button so it does not fire twice.
