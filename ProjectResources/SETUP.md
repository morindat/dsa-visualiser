# Project Setup and Rationale

**Project 3 — Interactive Data Structure and Algorithms Visualiser**
CS-3810 Design Practices in Computer Science · Team **PY**
Papaa Dennis Morindat (1020241748) · Yididiya Megenta (1020241852)

---

## 0. How to read this document

This is the engineering setup guide for the repository. It is not a tutorial: every
instruction is paired with the design decision it implements. The reason is that a setup
step whose purpose is unknown gets "cleaned up" six weeks later by someone who assumes it
is incidental. Almost nothing here is incidental — most of it exists to enforce one of the
three load-bearing decisions in Assignment 2.

**Target directory: `~/Code/project-3-PY`.** It is not empty — it already holds a
hand-written `README.md` and `.gitignore`. §4.1 is written around that fact, and §10 records
what in those files needs updating.

**This document is an engineering artefact, not a submission.** Nothing here needs to reach
the LaTeX deliverable. It exists so that the setup survives contact with two people and six
weeks of changes. It also does not restate A2: it cites it. If a `Table`/`ADR`/`Listing`
number here no longer matches `A2_PY.tex`, the citation is stale and should be fixed rather
than duplicated.

Each rationale cites the requirement or ADR it satisfies, using the identifiers from our
own documents:

| Source | Identifiers used below |
| --- | --- |
| Assignment 1 | `FR1–FR13`, `ER1–ER13`, `NFR-P1…P5`, `NFR-C1…C4`, `NFR-U1…U3`, `NFR-S1…S2`, `NFR-M1…M3`, `NFR-Po1…Po2`, `NFR-Se1…Se2` |
| Assignment 2 | `ADR-1…ADR-7`, `Table 5` (module map), `Table 9` (technology stack), `Table 10` (rejected alternatives), `Listing 16` (OperationMeta), `Listing 17` (Step record), `Listing 18` (source layout) |

If a step looks like ceremony, find its row in §6 (traceability) or §8 (gotchas). If it is
in neither, it is probably safe to delete — but check first.

---

## 1. The three decisions that determine the whole setup

Everything in §4 follows from these. Understanding them is more valuable than memorising
the commands, because the commands will drift as tools change and these will not.

### 1.1 An operation emits an immutable trace; the interface replays it (`ADR-1`)

An operation is **a generator of states, not a mutation of a live object graph**. Running
"Tree → Insert" on `[50, 30, 70, 45]` produces an ordered array of `Step` records
(`Listing 17`) *before anything is drawn*. The UI is then a pure function of
`(trace, index)`.

**Why this matters for setup.** It is the single decision that makes step-back, scrubbing,
and exact replay possible at all (A1 §5.3.4, `UC4`). The rejected alternative — re-running
the algorithm to reach step 7 — makes step-back `O(i)` and cannot represent a BFS frontier
without replaying history. It also forces the architecture: because the trace is plain
serialisable data, the algorithm layer needs no DOM, so it can run in Node for tests
(`NFR-M3`) and in a Web Worker for large inputs (`NFR-P4`).

**Consequences we must honour during setup:**
- The trace types must live in exactly one module, so generator and renderer cannot drift
  (`NFR-M3`, `ADR-6`). That is why the setup creates `src/core/trace/step.ts` early.
- Determinism must be real, not aspirational: no wall-clock, no randomness, no
  `Set`/`Map` iteration-order dependence in generation (`NFR-C2`). Otherwise golden-trace
  tests are meaningless.

### 1.2 React renders the SVG; D3 computes geometry (`ADR-2`)

D3 is used as a **computation library**, never as the DOM owner. `d3-selection` is not
used for the main visualisation.

**Why this matters.** Our doc names this "the single most important stack decision". If D3
owns the DOM while React owns the step index, there are two sources of truth: transitions
fight re-renders and elements go stale when you step *backwards*. Since our animation *is*
the graded output (`FR8`), that failure mode is unaffordable. The mechanical consequence is
that we import D3 **submodules only** — see §4.3, where this is backed by measurements.

**Consequences:** `d3-transition` and `d3-zoom` are not installed. Motion is expressed as
CSS transitions or computed by `d3-interpolate` and passed to React as values
(`NFR-U2`, `Table 10`).

### 1.3 Imports point only downwards, enforced mechanically (`NFR-M2`)

`core/` (models, trace, operations) may not import React, D3, `render/` or `ui/`. Layer
sizes and the permitted import direction are fixed in `Table 5` and `Listing 18`.

**Why this matters.** Our own documents say this is "enforced mechanically rather than by
convention", and the enforcement is an acceptance criterion, not a nicety. The reason is
that the boundary is the only thing keeping `NFR-M3` true: *if the core test suite ever
needs a DOM to pass, the architecture has already been broken*. Configuration drift here is
invisible until it is expensive.

**Consequences:** the ESLint boundary rule in §4.6 is not style policing, it is a
correctness check on the architecture. This is also why we run the core tests with
`environment: 'jsdom'` available but **write core tests that never touch the DOM** — the
suite passing in a DOM-free context is the proof.

---

## 2. The one thing that is *not* yet decided

`src/core/trace/step.ts` is the contract between the two of us. Assignment 2 §5.7 sets the
build order: **build one vertical slice (linked-list insert, all three panes, controller
working), freeze the `Step` contract, then add structures.** After freezing, each new
operation is additive (one generator + one pseudocode listing + one catalogue record).

Do not expand the structure catalogue before the contract is frozen. The type is the
interface between two people working in parallel; changing it after five operations exist
is invasive, changing it after one is trivial.

---

## 3. Prerequisites

```bash
node --version   # v20.19+ / v22.12+ / v24+ ; verified on v26.8.2
npm --version    # v10+          ; verified on v12.1.0
git --version
```

`NFR-Po1` requires the app to run in the last two versions of Chrome, Edge, Firefox and
Safari at a minimum viewport of 1280×720, deployable as static files with no backend. There
is therefore no runtime prerequisite beyond a browser — Node is a *build* dependency only.

---

## 4. Setup, step by step

### 4.1 Getting the scaffold into the repository

Target directory: `~/Code/project-3-PY`.

It is a git repository on `main`, tracking
`Ashoka-CS-3810-Design-Practices-in-CS/project-3-PY`, with a clean working tree and two
hand-written files that must survive:

| File | Size | Why losing it hurts |
| --- | --- | --- |
| `README.md` | 15.5 KB | The project README: problem statement, features, architecture, trace contract, data-structure table, tech stack, accessibility, performance budgets, team. |
| `.gitignore` | 2.1 KB | A curated 20-section ignore file that already anticipates this project — `trace-dumps/`, `*.trace.json`, `playwright-report/`, `coverage/`, `.eslintcache`, `vitest.config.ts.timestamp-*`. |

Both names are **also** produced by the template. That collision is the entire risk in this
step, and it is worse than it first appears.

#### The trap: "Ignore files and continue" still overwrites colliding files

```
Current directory is not empty. Please choose how to proceed:
  ❯ Cancel operation                       ← default; Enter here is a safe no-op
    Remove existing files and continue     ← deletes every entry except .git
    Ignore files and continue              ← does NOT protect files that collide
```

**"Ignore files and continue" only skips the deletion step.** The scaffold then copies its
own files in, and `fs.copyFileSync` overwrites any destination that already exists. Choosing
*ignore* therefore still replaces `README.md` and `.gitignore` with the template's versions.

Confirmed by running the real scaffold against a directory holding a sentinel `README.md`,
a sentinel `.gitignore`, and a non-colliding `A1_PY.pdf`, then selecting *Ignore files and
continue*:

| File | Result |
| --- | --- |
| `A1_PY.pdf` | **survived** — no filename collision in the template |
| `README.md` | **overwritten** → `# React + TypeScript + Vite` |
| `.gitignore` | **overwritten** → `# Logs` / `logs` / `*.log` |

So *ignore* protects files the template does not have, and silently destroys the ones it
does. Do not run `create-vite` in this directory.

#### Do this instead: scaffold in a scratch directory, copy in

This never presents the prompt, so there is nothing to misclick.

```bash
# 1. scaffold somewhere disposable
cd /tmp
npm create vite@latest dsviz -- --template react-ts --eslint --no-interactive

# 2. copy in only what we want. README.md and .gitignore are deliberately absent.
cd ~/Code/project-3-PY
for f in eslint.config.js index.html package.json public src \
         tsconfig.app.json tsconfig.json tsconfig.node.json vite.config.ts; do
  cp -r /tmp/dsviz/"$f" .
done
rm -rf /tmp/dsviz
```

**Why `.gitignore` is excluded.** There is nothing to merge in. The template's file covers
`node_modules`, `dist`, `logs`, editor directories and `.DS_Store`; ours already covers all
of that plus coverage output, Playwright reports, ESLint caches and generated trace dumps.
Adopting the template's would be a strict downgrade.

**Why `README.md` is excluded.** Ours is written and needs updating for Assignment 2, not
replacing. See §10.

Then fix the package name — npm requires lowercase, so `project-3-PY` is invalid and the
scaffold will have written `"name": "dsviz"`:

```jsonc
  "name": "project-3-py",
```

Confirm exactly what arrived before committing:

```bash
git status --short     # expect untracked scaffold files; no modified tracked files
```

Because the scaffold is applied by copy rather than by `create-vite` in place, the
emptiness-check trivia no longer matters: a directory containing only `.git` counts as empty,
and a directory containing `README.md` and `.gitignore` does not.

> **Never pass `--overwrite`.** It maps directly to *Remove existing files and continue* and
> calls `rmSync` on every entry except `.git`. On a repository holding graded artefacts it is
> unrecoverable from the working tree.

**Why `--eslint`.** `create-vite` defaults to **Oxlint** and ships a `.oxlintrc.json`.
`ADR-6` and `NFR-M1` name ESLint, and more importantly the import-boundary rule we rely on
in §4.6 is an ESLint plugin. Passing `--eslint` makes the scaffold generate
`eslint.config.js` with `@eslint/js`, `typescript-eslint`, `globals`,
`eslint-plugin-react-hooks` and `eslint-plugin-react-refresh` already wired up, so we only
have to add the boundary rule instead of rebuilding the config from nothing. Oxlint is
still available as an optional fast pass, but ESLint is the authority.

---

### 4.2 Tailwind CSS v4

```bash
npm install tailwindcss @tailwindcss/vite
```

`vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // NFR-P1: initial JS payload under 500 KB gzipped.
    chunkSizeWarningLimit: 500,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      // NFR-M1: 90% lines on the algorithm core only; presentational
      // components are excluded from the target.
      include: ['src/core/**'],
      thresholds: { lines: 90 },
    },
  },
})
```

The `coverage` block needs `@vitest/coverage-v8`, installed in §4.5.

`src/index.css` — replace the generated contents:

```css
@import "tailwindcss";

@theme {
  --color-node-undiscovered: oklch(0.85 0.01 250);
  --color-node-frontier: oklch(0.80 0.14 85);
  --color-node-current: oklch(0.70 0.16 250);
  --color-node-visited: oklch(0.72 0.15 150);
}
```

**Why there is no `tailwind.config.js` and no `postcss.config.js`.** Tailwind v4 changed its
setup: the `@tailwindcss/vite` plugin replaces the PostCSS pipeline, and content detection
is automatic. **The old `@tailwind base; @tailwind components; @tailwind utilities;`
directives are dead** — in v4 they produce no styles and no error. Copying a v3 tutorial
here yields a page that silently loses all styling.

**Why the palette lives in `@theme` and not in components.** `NFR-U2` requires that colour
is never the sole carrier of meaning, and our A1 analysis requires node state to be a
function of the algorithm's own variables (undiscovered / frontier / current / visited).
Defining those four tokens once, in one place, makes a mis-coloured node a *correctness
problem in one file* rather than a decoration decision spread across five renderers. This is
the "one design-token palette" commitment from `Table 9`, and the reason styling was chosen
over a component library in `Table 10`.

**Why `defineConfig` is imported from `vitest/config`.** It re-exports Vite's `defineConfig`
with the `test` key typed, which lets the Vitest configuration live in the one config file
we already have instead of a second `vitest.config.ts` that can drift out of sync.

**Why `chunkSizeWarningLimit` is 500.** It is `NFR-P1`'s budget expressed as a build-time
warning, so exceeding the payload target is visible in CI rather than only in a Lighthouse
run someone remembers to do.

---

### 4.3 D3 as submodules only

```bash
npm install d3-hierarchy d3-force d3-scale d3-shape d3-interpolate
npm install -D @types/d3-hierarchy @types/d3-force @types/d3-scale \
              @types/d3-shape @types/d3-interpolate
```

Note what is deliberately absent: **the `d3` meta-package and `d3-selection`.**

**Why submodules rather than `d3`.** `NFR-P1` caps the initial JavaScript payload at 500 KB
gzipped and states this "requires importing D3 submodules rather than the whole bundle".
Measured on Vite 8.3.1 / rolldown:

| What is bundled | Gzipped |
| --- | --- |
| Full `d3` package dist, no tree-shaking (upper bound) | **90.2 KB** |
| `import * as d3 from 'd3'`, tree-shaken to five used APIs | **24.9 KB** |
| The five submodules, same five APIs | **16.2 KB** |

So even in the *best* case for the namespace import, it costs 54% more than the submodules.
The honest caveat is that 16.2 KB versus 24.9 KB is not on its own a disaster — rolldown
tree-shakes a barrel import better than you might expect. The real argument is the 90.2 KB
figure: a namespace import is only as good as the bundler's ability to prove the unused
modules are side-effect free, and the moment that fails we have committed ~18% of the entire
`NFR-P1` budget on a library we use five functions from. Depending on tree-shaking for a
budget line is a worse position than not needing it.

**Why `d3-selection` is excluded.** This is the `ADR-2` rule, not a size argument. The
five submodules we do install (`hierarchy`, `force`, `scale`, `shape`, `interpolate`) are
all *pure functions that return data* — exactly the "D3 computes" half of the rule.
`d3-selection` is the "D3 owns the DOM" half, and installing it makes the forbidden
architecture the path of least resistance.

**The declared exception.** `ADR-2` allows D3 to own the DOM "inside isolated imperative
leaves such as an axis". If we add axes for a graph comparison view, that is the moment to
add `d3-axis` and `d3-selection` — as a deliberate, documented exception, in a leaf
component with no React children. Add them then, not now.

**Why `@types/*` are separate packages.** `d3-hierarchy` and friends are plain JavaScript.
Under `ADR-6` strict mode, an untyped D3 call resolves to `any` and silently disables type
checking exactly where our geometry code lives.

---

### 4.4 TypeScript strict mode

`tsconfig.app.json` — add the line that the template **does not** include:

```jsonc
    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
```

**Why this is not optional for us.** The scaffold leaves `strict` unset, which means
`noImplicitAny`, `strictNullChecks` and friends are all **off**. Verified: an implicit-`any`
function compiles clean on the template's config and errors `TS7006` once `strict` is added.

`ADR-6` gives the reason it matters *here specifically*: the `Step` record is the interface
between two people working in parallel, and types turn "a panel silently renders nothing
because a field was renamed" into a compile error. `NFR-M1` compounds it by requiring strict
mode while also excluding presentational components from the coverage target — the type
system is doing part of the work that tests would otherwise have to.

Also note `erasableSyntaxOnly` is on: TypeScript-only runtime constructs such as `enum` and
parameter properties are rejected. Prefer `const` objects with `as const` and union types
for things like `AuxState.kind`, which also keeps the trace JSON-serialisable for the Worker
boundary and for golden fixtures.

---

### 4.5 Testing

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event fast-check @playwright/test @vitest/coverage-v8
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

| Tool | Requirement | Why this one |
| --- | --- | --- |
| Vitest | `NFR-M1`, `NFR-M3` | Reuses the Vite config, so no second build pipeline. Runs the DOM-free core in Node. `Table 10` rejects Jest for needing extra ESM/Vite configuration. |
| fast-check | `NFR-C1` | Property-based tests. `NFR-C1` requires randomised property tests comparing reconstructed structures against a reference implementation. Hand-written cases do not cover the degenerate shapes that break BST and heap logic. |
| RTL | `NFR-U2` | Drives panes through the accessibility tree, which is how we verify keyboard parity rather than asserting on markup. |
| Playwright | `NFR-U1` | One end-to-end walkthrough, deliberately only one. `Table 10`: multi-browser support fits `NFR-Po1`. |
| jsdom | `FR8`, `NFR-U2` | The only place a DOM should exist. Core tests must still be written so they would pass without it. |
| `@vitest/coverage-v8` | `NFR-M1` | Supplies `npm run test:coverage`, which the repository README already lists. `NFR-M1` sets a 90% line target on the algorithm core, and a target with no measurement is not a target. |

**Why golden traces replace screenshot tests.** `NFR-C2` requires byte-identical traces and
`Table 9` explicitly rejects screenshot testing "because the visual output is expected to
change often". A trace is serialisable and deterministic, so a behaviour change shows up as
a readable text diff rather than an opaque failing image. This is also what makes the
algorithm work testable by a two-person team at all.

**Why the core suite must not need a DOM.** This is the operational form of `NFR-M2`. If a
test in `tests/core/` ever needs `jsdom` to pass, the architecture has already been broken.
That is why `test:core` exists as its own script — it is the script CI runs to check the
boundary is real.

Add the scripts:

```jsonc
    "typecheck": "tsc -b --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:core": "vitest run src/core",
    "test:coverage": "vitest run --coverage",
```

`NFR-M1` sets the target — at least 90% line coverage on the algorithm core, with
presentational components excluded. Gate it in the config rather than trusting the report:

```ts
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**'],
      thresholds: { lines: 90 },
    },
  },
```

Narrowing `include` to `src/core/**` is what expresses "presentational components are
excluded from that target" as configuration instead of as an instruction someone has to
remember.

---

### 4.6 The ESLint import-boundary rule

```bash
npm install -D eslint-plugin-boundaries eslint-import-resolver-typescript \
  prettier eslint-config-prettier
```

These four are the only lint dependencies `--eslint` does not already provide.

Add the following block to the generated `eslint.config.js`. **Do not replace the file** —
keep the React hooks and refresh rules the scaffold produced.

```js
import boundaries from 'eslint-plugin-boundaries'

// Layers from A2 §5.3 (Table 5) and Listing 18.
//
// Patterns describe *elements* (folders / whole subtrees), not files — so there is
// no trailing `/*`. `partialMatch: false` makes a pattern mean exactly what it
// looks like instead of also matching any suffix of the path.
const elements = [
  { type: 'core-model', pattern: 'src/core/model/**', partialMatch: false },
  { type: 'core-trace', pattern: 'src/core/trace/**', partialMatch: false },
  { type: 'core-ops', pattern: 'src/core/operations/**', partialMatch: false },
  { type: 'app', pattern: 'src/app/**', partialMatch: false },
  { type: 'render', pattern: 'src/render/**', partialMatch: false },
  { type: 'ui', pattern: 'src/ui/**', partialMatch: false },
  { type: 'data', pattern: 'src/data/**', partialMatch: false },
  { type: 'test-support', pattern: 'src/test/**', partialMatch: false },
  // Catch-all for entry files under src/ (App.tsx, main.tsx). MUST stay last:
  // the first matching element wins, and folder semantics mean `pattern: 'src'`
  // matches everything below src/.
  { type: 'entry', pattern: 'src', partialMatch: false },
]

const CORE = ['core-model', 'core-trace', 'core-ops']

export default [
  // ... keep the generated config entries here ...

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': elements,
      'boundaries/files': [{ category: 'test', pattern: '**/*.{spec,test}.{ts,tsx}' }],
      // REQUIRED. Without a TypeScript-aware resolver the plugin cannot resolve
      // extensionless imports such as "../../render/layout/hierarchy", and the
      // dependency rule silently never fires. See §8.
      'import/resolver': { typescript: true },
    },
    rules: {
      // Fail loudly when a new directory is added without being classified above,
      // instead of letting it silently escape the architecture rule.
      'boundaries/no-unknown-files': 'error',

      'boundaries/dependencies': ['error', {
        default: 'disallow',
        policies: [
          // The headline rule (ADR-2, NFR-M2): Layer 1 may not import React,
          // D3, or any module from Layers 3-4.
          { from: { element: { types: { anyOf: CORE } } },
            disallow: { to: { element: { types: { anyOf: ['render', 'ui'] } } } } },
          { from: { element: { types: { anyOf: CORE } } },
            disallow: { to: { module: { origin: 'external',
                                       source: ['react', 'react-dom', 'd3', 'd3-*'] } } } },

          // Everything else: imports point only downwards.
          { from: { element: { type: 'core-model' } }, allow: { to: { element: { type: 'core-model' } } } },
          { from: { element: { type: 'core-trace' } }, allow: { to: { element: { types: { anyOf: ['core-model', 'core-trace'] } } } } },
          { from: { element: { type: 'core-ops' } },   allow: { to: { element: { types: { anyOf: ['core-model', 'core-trace'] } } } } },
          { from: { element: { type: 'data' } },       allow: { to: { element: { types: { anyOf: ['core-model', 'core-trace'] } } } } },
          { from: { element: { type: 'render' } },     allow: { to: { element: { types: { anyOf: ['core-model', 'core-trace', 'render', 'data'] } } } } },
          { from: { element: { type: 'app' } },        allow: { to: { element: { types: { anyOf: ['core-model', 'core-trace', 'core-ops', 'data', 'render', 'app'] } } } } },
          { from: { element: { type: 'ui' } },         allow: { to: { element: { types: { anyOf: ['core-model', 'core-trace', 'data', 'render', 'app', 'ui'] } } } } },
          { from: { element: { type: 'entry' } },      allow: { to: { element: { types: { anyOf: ['core-model', 'core-trace', 'data', 'render', 'app', 'ui', 'entry'] } } } } },
        ],
      }],
    },
  },

  // Belt and braces: core/ is DOM-free and geometry-free. Works even if the
  // boundaries plugin is misconfigured, so it is an independent guard.
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
            message: 'core/ must stay DOM-free (ADR-2).' },
          { group: ['d3', 'd3-*'],
            message: 'core/ must stay geometry-free; layout belongs in render/ (ADR-2).' },
          { group: ['**/render/**', '**/ui/**'],
            message: 'core/ may not import upward (NFR-M2).' },
        ],
      }],
    },
  },

  // Tests may reach anything, but must not be reachable from app code.
  { files: ['**/*.{spec,test}.{ts,tsx}'], rules: { 'boundaries/dependencies': 'off' } },
]
```

**Why a `no-restricted-imports` block as well.** Redundant enforcement of the *single*
most important rule is deliberate. The `boundaries` rule is more expressive but has two
silent-failure modes (§8); `no-restricted-imports` is plain ESLint and cannot be defeated by
a resolver or pattern mistake. Together, the only way to violate `NFR-M2` is to disable both.

**Why `no-unknown-files` is an error.** It converts "someone added `src/hooks/` and nobody
noticed it isn't classified" into a failing build. An unclassified file is not subject to
the dependency rules at all, so this is the guard that keeps the guard working.

**Always run ESLint from the repository root.** Element patterns resolve against
`process.cwd()`. Running `npx eslint src` from a subdirectory misclassifies everything and
the rule silently stops protecting you.

---

### 4.7 Directory layout

```bash
mkdir -p src/core/{model,trace,operations/{list,stack,heap,bst,traverse,graph}} \
         src/app src/render/{renderers,layout} \
         src/ui/{shell,sidebar,guide,panes,controls,a11y} \
         src/data/{presets,golden} src/test \
         tests/{core,golden,e2e}
```

This is `Listing 18` verbatim. The layout is not a filing preference — each directory *is*
a layer from `Table 5`, and the lint rule is written against exactly these paths. Creating
a new top-level directory under `src/` is therefore an architectural event: it needs an entry
in `elements` (§4.6) and possibly a row in `Table 5`.

Two placements that are easy to get wrong:

- Geometry belongs in `render/layout/`, never in `core/model/`. Vertex positions are **view
  state** and must not be read by an algorithm (A1 §6.3) — otherwise a layout change can
  alter a traversal result, which would break `NFR-C2`.
- The `Step` / `StructureDelta` / `AuxState` types belong in `core/trace/step.ts`, one
  module, imported by everyone. `NFR-M3` exists because a duplicated trace type lets the
  generator and the renderer drift apart silently.

---

### 4.8 Continuous integration

`Table 9` commits us to running type-checking, the boundary rule and the core test suite on
every push.

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint      # NFR-M2 boundary rule fails the build here
      - run: npm run test:core # DOM-free; proves the boundary is real
      - run: npm run build
```

**Why `npm ci` and not `npm install`.** `ci` installs strictly from `package-lock.json`, so
CI cannot silently resolve a different dependency version than the one that passed locally.
`NFR-C2` demands deterministic traces; a non-deterministic build is a bad foundation for
that.

---

## 5. Verification checklist

Run all five. The setup is not "done" until every one passes.

```bash
npm run typecheck   # clean, and strict is actually on
npm run test        # at least one passing test
npm run test:core   # passes with no DOM usage in the core
npm run lint        # clean — boundary rule is live
npm run build       # succeeds, JS chunk gzip well under 500 KB
```

Verified on a clean scaffold with this exact configuration:

```
✓ typecheck clean
✓ 1/1 test passing
✓ lint clean
✓ built in ~150 ms
  dist/assets/index.css    8.37 kB │ gzip:  2.51 kB
  dist/assets/index.js   222.52 kB │ gzip: 69.27 kB     ← NFR-P1 budget: 500 KB
```

**Then verify the boundary rule actually fires**, because a lint rule that never triggers
looks identical to a lint rule that passes. Plant a violation and confirm three errors:

```bash
mkdir -p src/core/operations
cat > src/core/operations/_boundarycheck.ts <<'EOF'
import { useState } from 'react'
import { layout } from '../../render/layout/hierarchy'
export const f = () => [useState, layout]
EOF
npx eslint src          # expect errors from BOTH rules
rm src/core/operations/_boundarycheck.ts
```

Expected:

```
2:1   error  'react' import is restricted ... core/ must stay DOM-free (ADR-2).
3:1   error  '../../render/layout/hierarchy' import is restricted ... (NFR-M2).
3:28  error  Dependencies to elements of type "render" are not allowed in
             elements of type "core-ops".
```

If the third line is missing, the resolver is not configured — see §8.

---

## 6. Dependency → requirement traceability

Every dependency earns its place via `Table 9`, with the reason recorded there.

| Dependency | Requirement | Reason (from `Table 9` / `Table 10`) |
| --- | --- | --- |
| `react`, `react-dom` | `ADR-1`, `FR8`, `ER13` | The app is a state machine rendered as a pure function of `(trace, index)`. Declarative rendering makes ARIA live regions and per-panel error boundaries practical. |
| `tailwindcss`, `@tailwindcss/vite` | `NFR-U2`, `NFR-Po2` | One design-token palette for node states; the fixed three-pane shell that collapses below 1024 px. |
| `d3-hierarchy` | `ADR-2`, `FR8` | Tree layout mathematics for the BST and heap views. |
| `d3-force` | `ADR-2`, `FR12` | Graph layout. Explicitly *not* algorithm input. |
| `d3-scale` | `ADR-2` | Coordinate mapping. |
| `d3-shape` | `ADR-2`, `FR8` | Edge and pointer geometry. |
| `d3-interpolate` | `ADR-2`, `NFR-U2` | Motion computed as values and handed to React, never applied to the DOM. Removable under `prefers-reduced-motion`. |
| `typescript` (strict) | `ADR-6`, `NFR-M1` | The trace is the interface between two people; types make a missing panel a compile error. |
| `vite` | `NFR-P1`, `NFR-Po1` | Fast dev server, tree-shaken static production build. |
| `vitest` | `NFR-M1`, `NFR-M3` | Reuses the Vite config; runs the DOM-free core in Node. |
| `fast-check` | `NFR-C1` | Property-based tests against an independent reference implementation. |
| `@testing-library/react` | `NFR-U2` | Verify keyboard reachability and labels through the accessibility tree. |
| `@playwright/test` | `NFR-U1` | One end-to-end walkthrough. |
| `@vitest/coverage-v8` | `NFR-M1` | Supplies `npm run test:coverage` and enforces the 90% line threshold on `src/core/`. |
| `eslint` + `typescript-eslint` | `NFR-M1`, `ADR-6` | Strict-mode linting enforced in CI. |
| `eslint-plugin-boundaries` | `NFR-M2` | The mechanical import-boundary rule. |
| `eslint-import-resolver-typescript` | `NFR-M2` | Without it the boundary rule silently never fires. |
| `prettier` | `NFR-M1` | Formatting enforced in CI, so diffs stay about behaviour. |
| `@types/d3-*` | `ADR-6` | D3 submodules ship no types; untyped calls become `any` under strict mode. |

---

## 7. What we deliberately did not install

Each of these is a decision, not an oversight. Re-litigating one is a change to `Table 10`.

| Not installed | Why not | Where decided |
| --- | --- | --- |
| `d3` meta-package | 90.2 KB gzip for five functions; `NFR-P1` budget. | §4.3, `NFR-P1` |
| `d3-selection`, `d3-transition`, `d3-zoom` | They own the DOM, which creates a second source of truth and breaks step-back. | `ADR-2` |
| Canvas renderer | No per-node DOM, so no labels, focus or ARIA. `n ≤ 200` is well within SVG. | `Table 10` |
| Zustand / Redux | There is exactly one mutable value (the index) plus a loaded trace. A store risks putting algorithm state in the UI. | `Table 10` |
| A component library (MUI, Chakra) | Would dictate the styling of the one palette `NFR-U2` requires us to control. | `Table 10` |
| Jest | Needs extra ESM/Vite configuration that Vitest avoids. | `Table 10` |
| Cypress | Playwright's multi-browser support fits `NFR-Po1`; one walkthrough is the deliberate scope. | `Table 10` |
| Any backend / Firebase | No accounts, no shared state. A backend adds failure modes and a privacy surface for no benefit. | `NFR-Se1`, `Table 10` |
| Screenshot testing | The visual output is expected to change often; golden traces are the stable artefact. | `NFR-C2`, `Table 9` |
| A routing library | One tiny router for catalogue routes is enough. | `Table 9` |

---

## 8. Gotcha reference

These are the failure modes that cost real time because none of them announce themselves.
Everything below was reproduced and confirmed, not inferred.

**G1 — `strict` is off in the template.**
The scaffold ships `noUnusedLocals`, `noUnusedParameters` and `noFallthroughCasesInSwitch`
but **not** `strict`. An implicit `any` compiles clean until you add the line. `ADR-6` makes
this a requirement, so add it in the first commit, not when someone notices.

**G2 — the boundary rule silently never fires (missing resolver).**
`eslint-plugin-boundaries` resolves import targets through `eslint-module-utils`. Without
`eslint-import-resolver-typescript` plus `settings['import/resolver'] = { typescript: true }`,
it cannot resolve extensionless specifiers like `../../render/layout/hierarchy`. The `to`
side becomes `undefined` and the rule reports **nothing** — no warning, no error. This is the
single most misleading failure in the whole setup: a green build that enforces nothing.

**G3 — element patterns are folder patterns, not file globs.**
`{ pattern: 'src/core/model/*' }` matches **nothing**, silently. Element descriptors use
folder semantics: state the folder (`src/core/model`), and files inside it are internal to
that element. Use `partialMatch: false` so the pattern means exactly what it reads. Keep the
`entry` catch-all last, because the first matching element wins and `pattern: 'src'` matches
everything below `src/`.

**G4 — element patterns resolve against `process.cwd()`.**
Running ESLint from any directory other than the repository root misclassifies files, which
disables the rule. This is also why CI runs `npm run lint` at the root.

**G5 — Tailwind v3 instructions in a v4 project.**
`@tailwind base; @tailwind components; @tailwind utilities;` are inert in v4. Correct usage
is `@import "tailwindcss";` plus the `@tailwindcss/vite` plugin. There is no
`tailwind.config.js` and no `postcss.config.js`.

**G6 — "Ignore files and continue" overwrites colliding files.**
The `create-vite` prompt makes it look as though *Ignore files and continue* preserves
everything. It only skips the deletion. The copy that follows uses `fs.copyFileSync`, which
overwrites existing destinations, so `README.md` and `.gitignore` are still replaced by the
template's versions. Verified — see the table in §4.1. This is the reason we scaffold in a
scratch directory and copy in a chosen list instead.

**G7 — `create-vite --overwrite` is destructive.**
It maps to *Remove existing files and continue* and deletes every entry except `.git`. On a
repository holding graded artefacts this is unrecoverable from the working tree. Never pass
it in `~/Code/project-3-PY`.

**G8 — non-empty directory in non-interactive mode cancels silently.**
Without a TTY, `create-vite` prints `Operation cancelled` and **exits 0 having done
nothing**. A CI or scripted scaffold that "succeeded" may have created no files at all.
Check that `package.json` exists afterwards.

**G9 — an invalid npm package name triggers a prompt that looks like an error.**
`project-3-PY` is rejected because npm names must be lowercase. In interactive mode you get
a `Package name:` prompt with the corrected default; in non-interactive mode the name is
silently rewritten. Either way `package.json` will not say what the directory says — and a
scaffold-and-copy flow will leave it saying `dsviz` until you change it.

**G10 — `d3-force` mutates by design.**
The simulation mutates node objects in place. Since the trace must be immutable and
deterministic (`NFR-C2`), positions are computed by the render layer from a copy and are
never written back into the model (A1 §6.3).

---

## 9. Adding an operation later

After the `Step` contract is frozen, `Assignment 2` §5.7 makes extensibility an acceptance
criterion: a new operation requires exactly three edits and no change to the controller, the
state machine, or the UI shell.

1. one instrumented generator in `core/operations/` that emits `Step[]`;
2. one authored pseudocode listing plus its `codeLine` map;
3. one `OperationMeta` record in the catalogue (`Listing 16`).

A new *structure* additionally needs one model module and one renderer. If a change to add
an operation requires touching `app/controller.ts` or `ui/`, the extensibility requirement
has been broken and that is worth stopping to fix — the test is what keeps the architecture
honest as the catalogue grows from one operation to a dozen.

---

## 10. Reconciling the files that are already there

Both pre-existing files are **kept**, not replaced. This section records what needs changing
in them, and why. Nothing here is a reason to accept the template's versions of either.

### 10.1 `.gitignore` — keep, plus one section we added

Ours is a strict superset of the template's, and it already anticipates work that has not
been written yet:

| Entry | What it anticipates |
| --- | --- |
| `coverage/` | The `NFR-M1` coverage target on the algorithm core |
| `playwright-report/`, `test-results/`, `.playwright/` | The `NFR-U1` end-to-end walkthrough |
| `.eslintcache` | Repeated `npm run lint` runs |
| `vitest.config.ts.timestamp-*` | Vitest config-change artefacts |
| `*.tsbuildinfo` | The `tsc -b` project references (§4.4) |
| `trace-dumps/`, `*.trace.json` | *"Golden traces are committed; ad-hoc dumps are not"* — the `NFR-C2` policy, already written down |

That last pair is the one to notice: the file encodes a design decision from A2 §4.8. Do not
let `create-vite` or a copy step overwrite it.

One section was **added**, to cover the resource directory:

```gitignore
# ------------------------- assignment resources -----------------------------
# ProjectResources/ holds the Assignment 1 and 2 design documents. The LaTeX and
# Markdown sources are tracked so the documents are version-controlled; the PDFs
# are rebuildable artefacts, and Assignment 2.pdf is the course brief, which is
# not ours to redistribute.
ProjectResources/**/*.pdf
```

**Why the sources are tracked and the PDFs are not.** The LaTeX sources are documents we
maintain across two assignments, and version control is the right tool for that — a diff of
`A2_PY.tex` is reviewable and an accidental edit is recoverable. The PDFs are build outputs
regenerable from those sources, and `Assignment 2.pdf` is the instructor's brief rather than
our work. Ignoring all PDFs in that directory has a useful side effect: a rebuilt
`A2_PY.pdf` never appears as a spurious change in `git status`.

Verify with:

```bash
git status --short --untracked-files=all -- ProjectResources/
```

Expected: the six `.tex` / `.md` sources listed, and no `.pdf`.

### 10.3 Where the assignment documents live

```
project-3-PY/
├── README.md               ← the repository front page, updated to match A2 (§10.2)
├── .gitignore              ← ours, plus the resource rule above (§10.1)
└── ProjectResources/       ← Assignment 1 and 2 documents, and this guide
    ├── SETUP.md            ← this file
    ├── A2_PY.tex           ← the graded Assignment 2 design document
    ├── DPCS.tex
    ├── notes.md
    ├── slides_UI_implementation.tex
    ├── speaker_notes_UI_implementation.md
    └── *.pdf               ← ignored; see §10.1
```

The assignment briefs are submitted through Google Classroom, and the brief itself says that
code goes to the Classroom repository separately. Keeping the resource directory *inside* the
repository does not change either submission; it just puts the LaTeX sources under version
control. If a grader should not see the briefs at all, that is what the ignore rule is for —
the PDFs are already excluded.

Two small consequences to be aware of:

- **This guide's paths are relative to the repository root**, not to `ProjectResources/`. When
  following §4.1, `cd ~/Code/project-3-PY` puts you at the root, which is where every command
  expects to run — in particular `npm run lint` (§4.6, G4).
- **`SETUP.md` sits in an unusual place.** It is an engineering document about the code, so the
  repository root or a `docs/` directory would be the more natural home. It lives here because
  the resource directory was moved as a unit. Moving it is harmless; if you do, update the link
  in `README.md`'s status block.

### 10.2 `README.md` — keep, but it is out of date against Assignment 2

The README describes the **Assignment 1** design. Assignment 2 changed the scope and fixed
the module layout, and the README has not caught up. Four substantive drifts, in order of
importance.

**(1) The graded structure set changed.** The README says the five structures are "linked
lists, stacks, **queues**, trees, and graphs" (summary paragraph, and the Features table).

A2 fixes the graded set as **Linked List · Stack · Priority Queue · Tree (BST) · Graph**,
with the FIFO queue demoted to a *supporting* structure — see A2's "Scope change since
Assignment 1", `ADR-5` and §4.6. The queue does not disappear: it remains the frontier of
BFS and level-order traversal, rendered by the same auxiliary panel.

The consequence is not just a word swap. The README's data-structure table has **no heap or
priority-queue row at all**, and in A2 the priority queue is a first-class graded structure
with its own operations (`insert`, `extract-min`, `buildHeap`), its own cost model, and a
dual rendering as both an array and a complete binary tree. A2 §4.3 justifies this as the
structure where "one model, two honest renderings" is the teaching point. That row needs
adding, not renaming.

**(2) The directory layout contradicts Assignment 2.** The README's "Planned project layout"
proposes:

```
src/core/     src/session/     src/render/     src/components/     src/types/
```

A2 `Listing 18` / `Table 5` fixes:

```
src/core/model/   src/core/trace/   src/core/operations/
src/app/          src/render/{renderers,layout}/   src/ui/   src/data/
```

Mapping: `session/` → `app/`, `components/` → `ui/`, `types/` → `core/trace/`.

A2's layout wins, and the reasons are not stylistic:

- It puts the trace types **inside** `core/`, so they sit below the UI in the dependency
  order. A top-level `src/types/` is reachable from every layer, which weakens `NFR-M2` —
  the `Step` contract is meant to be importable by the algorithm core without the core
  gaining a path to anything else.
- Splitting `render/` out of `ui/` is what makes `ADR-2` checkable *by directory*. A2 §5.1
  says so directly: rendering geometry was separated "because it is the one place where a
  visualisation library could otherwise leak a second source of truth."

This one matters operationally: the lint rule in §4.6 is written against A2's paths. If the
actual directories follow the README, the rule protects nothing.

**(3) `OperationMeta` is missing `pseudocodeId`.** A2 `Listing 16` adds it — the key of the
authored listing and its `codeLine` map. `FR3`/`FR9` require the pseudocode highlight to be
a total function of the step's `codeLine`, and the id is the link between the two. Without
it the catalogue cannot supply the listing that `FR9` says must be the single authored source.

**(4) `AuxState` variants are stale.** The README's `Step` comment lists
"array/stack/queue/frontier/visited/recursion". A2 `Listing 17` fixes the union as
`"array" | "stack" | "queue" | "heap" | "visited" | "recursion"` — `frontier` was dropped
(the frontier *is* the queue or the stack, so a separate variant was redundant) and `heap`
was added for the priority queue. Since `aux.kind` selects which auxiliary panel component
renders (`FR10`), a stale variant list is a live bug rather than a doc typo.

**Minor items**

| Location | Issue |
| --- | --- |
| Header / status block | Names Assignment 1 only; the design now spans A1 and A2 |
| "Planned project layout" intro | Says "the repository is currently empty" — false after §4.1 |
| Tech stack, state row | Lists "a reducer or Zustand"; A2 `Table 10` settles it as a reducer / small store for the index, with Redux explicitly rejected |
| Scripts table | Lists `npm run test:coverage`, which needs `@vitest/coverage-v8` (§4.5) |
| Tech stack, visualisation row | Already matches A2's submodule rule exactly — **no change needed** |

**How to resolve this.** The A2 document is the graded design authority, so it wins on every
point above; the README should be updated to match it rather than the reverse. The
alternative — treating the README as canonical and rewriting the lint rule around
`session/`/`components/`/`types/` — would contradict a submitted assignment and lose the
directory-level enforcement of `ADR-2`.

Keeping one description of the architecture, in A2, and pointing the README at it is the
cheapest way to stop the two drifting. Two documents describing the same layering will
diverge again within a week otherwise.
