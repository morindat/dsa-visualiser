# `src/test/`

Test-support code shared by the whole Vitest suite. It is **not** part of any layer and is never
imported by application code.

- `setup.ts` — registers `@testing-library/jest-dom` matchers; referenced by
  `test.setupFiles` in `vite.config.ts`.

`environment: 'jsdom'` is enabled globally because the pane tests need a DOM. Core tests must still
be written so they would pass without it — that is the whole point of the `npm run test:core` script
(`NFR-M2`, `NFR-M3`).

Do not put test *cases* here; they live next to the module they test (`src/**/*.test.ts`) or under
`tests/`. Adding a file to this directory requires no lint-config change because `src/test/**` is
already classified as the `test-support` element.
