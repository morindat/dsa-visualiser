/**
 * Web Worker client — the main-thread side of trace generation.
 *
 * WHAT GOES HERE
 *   Creates the worker, posts a `GenerateRequest`, and resolves with a
 *   `GenerateResponse` (`{ trace, summary }`) or a `GenerateError`. Terminates the
 *   worker on reset.
 *
 * WHY THIS FILE EXISTS
 *   Trace generation must stay off the main thread for large inputs so the UI keeps
 *   responding (NFR-P4). Because a `Step` is plain serialisable data, the *same*
 *   generator runs in the worker and in tests with no code change (ADR-1). The
 *   worker is terminated on reset so no background computation outlives a session.
 *
 * RULES
 *   Messages must be structured-clone safe — no functions, no class instances, no
 *   DOM nodes. No React, D3 or DOM; only `core/` types and the worker boundary.
 *
 * STATUS
 *   Not implemented. Added after the Step contract is frozen; small inputs may run
 *   on the main thread first.
 */

export {}
