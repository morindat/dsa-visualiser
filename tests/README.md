# `tests/` — the test suite

| Command | What it runs | Why it is separate |
| --- | --- | --- |
| `npm run test` | everything | the full suite |
| `npm run test:core` | only `src/core/**` | proves the algorithm core is DOM-free (`NFR-M3`) |
| `npm run test:coverage` | everything + coverage | enforces ≥ 90 % lines on `src/core/` (`NFR-M1`) |
| `npx playwright test` | `tests/e2e/` | the one end-to-end walkthrough (`NFR-U1`) |

```
tests/
├── core/     pure unit + property tests (no DOM)
├── golden/   trace snapshot tests
└── e2e/      one Playwright walkthrough
```

Short unit tests can also sit **next to the module they test** as `src/**/*.test.ts` (that is where
`src/core/trace/step.test.ts` lives, and `test:core` picks it up). `tests/core/` is for suites that
span several modules.

## The testing philosophy in one line

The stable regression artefact is the **trace**, not a screenshot: a trace is serialisable and
deterministic, so a behaviour change is a readable text diff rather than a failing image (`NFR-C2`).
Beyond unit tests, every operation is checked against an **independent reference implementation**
and with `fast-check` property tests over degenerate shapes (`NFR-C1`).
