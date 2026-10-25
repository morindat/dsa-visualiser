/**
 * Web Worker entry point — the worker side of trace generation.
 *
 * WHAT GOES HERE
 *   The worker's `onmessage` handler: receive a `GenerateRequest`, call the
 *   matching generator in `core/operations/`, and post back a
 *   `GenerateResponse` or a `GenerateError`. No DOM, no React.
 *
 * WHY THIS FILE EXISTS
 *   This is the I/O adapter that crosses the browser boundary (A2 §5.1). Keeping
 *   it a thin pass-through is what allows the algorithm core to stay pure: all the
 *   work happens in `core/`, and this file only marshals data. The same trace
 *   value is produced whether generation ran here or in a test (`NFR-M3`).
 *
 * RULES
 *   Structured-clone-safe messages only; never import `render/` or `ui/`. The
 *   worker must not touch the DOM.
 *
 * STATUS
 *   Not implemented. Added after the Step contract is frozen.
 */

export {}
