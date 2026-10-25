/**
 * Preset datasets — the curated fixtures FR4 selects from.
 *
 * WHAT GOES HERE
 *   One JSON fixture per teaching case under this directory, imported and typed by
 *   this loader so the rest of the app sees `PresetDataset[]` rather than raw JSON.
 *   Each preset is deliberately **capped at `MAX_PRESET_VALUES` entries**: a
 *   presentation dataset has to be big enough to show a walk or a multi-level
 *   tree, but small enough that every node, arrow and pointer badge stays readable.
 *
 * WHY THIS FILE EXISTS
 *   AUC (FR4) loads a fixed fixture rather than a randomly generated input, so a
 *   demonstration is reproducible and a bug report has an exact dataset. Keeping
 *   the JSON as data and the typing here means the UI never parses JSON by hand,
 *   and a malformed fixture is a compile error, not a runtime surprise.
 *
 * HOW THE UI USES IT
 *   `presetValuesToText` / `presetEdgesToText` turn a preset back into the text a
 *   user would have typed, so choosing a preset and typing the same values follow
 *   the *same* validation path (FR6). Nothing here bypasses validation.
 *
 * RULES
 *   Static, versioned data; no fetching (NFR-Se1), no React, D3 or DOM. The
 *   imported fixtures are pure JSON, so this module is deterministic (NFR-C2).
 */

import bstBalanced from './bst-balanced.json'
import bstDegenerate from './bst-degenerate.json'
import graphBfsDfs from './graph-bfs-dfs.json'
import heapUnsorted from './heap-unsorted.json'
import heapValid from './heap-valid.json'
import listBasic from './list-basic.json'
import stackBasic from './stack-basic.json'

/**
 * The ceiling every shipped fixture must respect. Referenced by the presets test,
 * so a preloaded dataset cannot grow past the point where the visualization stops
 * being readable (the user-facing rule is "cap preloaded values at 10").
 */
export const MAX_PRESET_VALUES = 10

export type ValuePreset = {
  id: string
  structureId: 'list' | 'stack' | 'bst'
  label: string
  description: string
  values: number[]
}

export type HeapPreset = {
  id: string
  structureId: 'heap'
  label: string
  description: string
  /** `raw` starts unsorted (build-heap); `min`/`max` already satisfy the property. */
  kind: 'raw' | 'min' | 'max'
  values: number[]
}

export type GraphPreset = {
  id: string
  structureId: 'graph'
  label: string
  description: string
  directed: boolean
  source: string
  edges: { from: string; to: string; weight?: number }[]
}

export type PresetDataset = ValuePreset | HeapPreset | GraphPreset

/**
 * The catalogue of presets, in the order the guide should offer them. Each entry
 * maps the JSON explicitly rather than casting it, so a renamed JSON field fails
 * the build instead of arriving as `undefined`.
 */
export const PRESET_DATASETS: readonly PresetDataset[] = [
  {
    id: listBasic.id,
    structureId: 'list',
    label: listBasic.label,
    description: listBasic.description,
    values: listBasic.values,
  },
  {
    id: stackBasic.id,
    structureId: 'stack',
    label: stackBasic.label,
    description: stackBasic.description,
    values: stackBasic.values,
  },
  {
    id: bstBalanced.id,
    structureId: 'bst',
    label: bstBalanced.label,
    description: bstBalanced.description,
    values: bstBalanced.values,
  },
  {
    id: bstDegenerate.id,
    structureId: 'bst',
    label: bstDegenerate.label,
    description: bstDegenerate.description,
    values: bstDegenerate.values,
  },
  {
    id: heapUnsorted.id,
    structureId: 'heap',
    label: heapUnsorted.label,
    description: heapUnsorted.description,
    kind: 'raw',
    values: heapUnsorted.values,
  },
  {
    id: heapValid.id,
    structureId: 'heap',
    label: heapValid.label,
    description: heapValid.description,
    kind: 'min',
    values: heapValid.values,
  },
  {
    id: graphBfsDfs.id,
    structureId: 'graph',
    label: graphBfsDfs.label,
    description: graphBfsDfs.description,
    directed: graphBfsDfs.directed,
    source: graphBfsDfs.source,
    edges: graphBfsDfs.edges,
  },
]

/** All presets for one structure, in catalogue order. */
export function presetsForStructure(
  structureId: PresetDataset['structureId'],
): PresetDataset[] {
  return PRESET_DATASETS.filter((preset) => preset.structureId === structureId)
}

/** One preset by id, or `undefined`. */
export function getPreset(id: string): PresetDataset | undefined {
  return PRESET_DATASETS.find((preset) => preset.id === id)
}

/**
 * The preset's values as the text a user would type (`"9, 5, 13, …"`), so the
 * guide's input field can be filled and then validated normally.
 */
export function presetValuesToText(preset: ValuePreset | HeapPreset): string {
  return preset.values.join(', ')
}

/** The preset's edges as one `A-B` (or `A-B:weight`) line each. */
export function presetEdgesToText(preset: GraphPreset): string {
  return preset.edges
    .map((edge) =>
      edge.weight === undefined
        ? `${edge.from}-${edge.to}`
        : `${edge.from}-${edge.to}:${edge.weight}`,
    )
    .join('\n')
}
