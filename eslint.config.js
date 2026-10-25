import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier/flat'
import boundaries from 'eslint-plugin-boundaries'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

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

export default defineConfig([
  // Generated output is not source: coverage/ and the Playwright reports are
  // build artefacts, not something anyone should be editing.
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettierConfig,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': elements,
      'boundaries/files': [
        { category: 'test', pattern: '**/*.{spec,test}.{ts,tsx}' },
      ],
      // REQUIRED. Without a TypeScript-aware resolver the plugin cannot resolve
      // extensionless imports such as "../../render/layout/hierarchy", and the
      // dependency rule silently never fires. See §8.
      'import/resolver': { typescript: true },
    },
    rules: {
      // Fail loudly when a new directory is added without being classified above,
      // instead of letting it silently escape the architecture rule.
      'boundaries/no-unknown-files': 'error',

      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            // The headline rule (ADR-2, NFR-M2): Layer 1 may not import React,
            // D3, or any module from Layers 3-4.
            {
              from: { element: { types: { anyOf: CORE } } },
              disallow: {
                to: { element: { types: { anyOf: ['render', 'ui'] } } },
              },
            },
            {
              from: { element: { types: { anyOf: CORE } } },
              disallow: {
                to: {
                  module: {
                    origin: 'external',
                    source: ['react', 'react-dom', 'd3', 'd3-*'],
                  },
                },
              },
            },

            // Everything else: imports point only downwards.
            //
            // A2 Table 5 defines ONE "Data / model" layer made of core/model/ AND
            // core/trace/, so those two may import each other. A model's reducer
            // consumes a StructureDelta (declared in trace/step.ts), and the trace
            // types are built from the model's NodeId/TraceEdge primitives.
            {
              from: { element: { type: 'core-model' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['core-model', 'core-trace'] } },
                },
              },
            },
            {
              from: { element: { type: 'core-trace' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['core-model', 'core-trace'] } },
                },
              },
            },
            {
              from: { element: { type: 'core-ops' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['core-model', 'core-trace'] } },
                },
              },
            },
            {
              from: { element: { type: 'data' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['core-model', 'core-trace'] } },
                },
              },
            },
            {
              from: { element: { type: 'render' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ['core-model', 'core-trace', 'render', 'data'],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'core-model',
                        'core-trace',
                        'core-ops',
                        'data',
                        'render',
                        'app',
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'ui' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'core-model',
                        'core-trace',
                        'data',
                        'render',
                        'app',
                        'ui',
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'entry' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'core-model',
                        'core-trace',
                        'data',
                        'render',
                        'app',
                        'ui',
                        'entry',
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },

  // Belt and braces: core/ is DOM-free and geometry-free. Works even if the
  // boundaries plugin is misconfigured, so it is an independent guard.
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'core/ must stay DOM-free (ADR-2).',
            },
            {
              group: ['d3', 'd3-*'],
              message:
                'core/ must stay geometry-free; layout belongs in render/ (ADR-2).',
            },
            {
              group: ['**/render/**', '**/ui/**'],
              message: 'core/ may not import upward (NFR-M2).',
            },
          ],
        },
      ],
    },
  },

  // Tests may reach anything, but must not be reachable from app code.
  {
    files: ['**/*.{spec,test}.{ts,tsx}'],
    rules: { 'boundaries/dependencies': 'off' },
  },
])
