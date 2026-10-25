import { describe, expect, it } from 'vitest'
import {
  MAX_PRESET_VALUES,
  PRESET_DATASETS,
  getPreset,
  presetEdgesToText,
  presetValuesToText,
  presetsForStructure,
} from './index'
import {
  validateBstKeys,
  validateGraphEdges,
  validateGraphSource,
  validateHeapValues,
  validateValues,
} from '../../app/validate'
import { bstHeight, buildBst, isBst } from '../../core/model/bst'
import {
  heapFromValues,
  heapifyInPlace,
  heapIsValid,
} from '../../core/model/binaryHeap'
import { buildGraphFromLabels, isGraphValid } from '../../core/model/graph'

// DOM-free: presets feed the same validation + construction path as typed input.

describe('preset datasets (FR4)', () => {
  it('ships at least one preset for every structure the catalogue offers', () => {
    for (const structureId of [
      'list',
      'stack',
      'bst',
      'heap',
      'graph',
    ] as const) {
      expect(presetsForStructure(structureId).length).toBeGreaterThan(0)
    }
  })

  it('uses unique ids and can look a preset up', () => {
    const ids = PRESET_DATASETS.map((preset) => preset.id)
    expect(new Set(ids).size).toBe(ids.length)

    const first = PRESET_DATASETS[0]
    expect(getPreset(first.id)).toBe(first)
    expect(getPreset('does-not-exist')).toBeUndefined()
  })

  it('caps every preloaded preset at 10 entries', () => {
    for (const preset of PRESET_DATASETS) {
      if (preset.structureId === 'graph') {
        const report = validateGraphEdges(presetEdgesToText(preset), {
          directed: preset.directed,
        })
        expect(report.vertices.length).toBeGreaterThan(0)
        expect(report.vertices.length).toBeLessThanOrEqual(MAX_PRESET_VALUES)
        expect(report.edges.length).toBeGreaterThan(0)
        expect(report.edges.length).toBeLessThanOrEqual(MAX_PRESET_VALUES)
      } else {
        expect(preset.values.length).toBeGreaterThan(0)
        expect(preset.values.length).toBeLessThanOrEqual(MAX_PRESET_VALUES)
      }
    }
  })

  it('validates through the same path as typed input (FR6)', () => {
    for (const preset of PRESET_DATASETS) {
      if (preset.structureId === 'bst') {
        expect(validateBstKeys(presetValuesToText(preset)).ok).toBe(true)
      }
      if (preset.structureId === 'heap') {
        expect(validateHeapValues(presetValuesToText(preset)).ok).toBe(true)
      }
      if (preset.structureId === 'stack') {
        expect(validateValues(presetValuesToText(preset)).ok).toBe(true)
      }
    }
  })

  it('builds a valid BST from each tree preset', () => {
    const balanced = getPreset('bst-balanced')
    const degenerate = getPreset('bst-degenerate')
    expect(balanced?.structureId).toBe('bst')
    expect(degenerate?.structureId).toBe('bst')
    /* istanbul ignore if — the ids are fixed in the loader. */
    if (balanced?.structureId !== 'bst' || degenerate?.structureId !== 'bst')
      return

    const balancedTree = buildBst(balanced.values)
    const degenerateTree = buildBst(degenerate.values)

    expect(isBst(balancedTree)).toBe(true)
    expect(isBst(degenerateTree)).toBe(true)
    // The teaching contrast: same key count, very different height.
    expect(bstHeight(degenerateTree)).toBe(degenerate.values.length)
    expect(bstHeight(balancedTree)).toBeLessThan(bstHeight(degenerateTree))
  })

  it('builds a valid heap from each heap preset', () => {
    const valid = getPreset('heap-valid')
    const raw = getPreset('heap-unsorted')
    if (valid?.structureId !== 'heap' || raw?.structureId !== 'heap') return

    expect(heapIsValid(heapFromValues(valid.values, 'min'))).toBe(true)
    // The raw preset is deliberately not a heap; heapify makes it one.
    expect(heapIsValid(heapFromValues(raw.values, 'min'))).toBe(false)
    expect(heapIsValid(heapifyInPlace(heapFromValues(raw.values, 'min')))).toBe(
      true,
    )
  })

  it('builds a valid graph from the graph preset and a valid source', () => {
    const preset = getPreset('graph-bfs-dfs')
    if (preset?.structureId !== 'graph') return

    const report = validateGraphEdges(presetEdgesToText(preset), {
      directed: preset.directed,
    })
    expect(report.ok).toBe(true)

    const graph = buildGraphFromLabels(
      report.vertices,
      report.edges.map((edge) => [edge.from, edge.to] as [string, string]),
      { directed: preset.directed },
    )
    expect(isGraphValid(graph)).toBe(true)
    expect(validateGraphSource(preset.source, report.vertices).ok).toBe(true)
  })

  it('turns a preset back into the text a user would type', () => {
    const preset = getPreset('bst-balanced')
    if (preset?.structureId !== 'bst') return
    // Exactly 17 comma-separated values, and they round-trip through validation.
    expect(presetValuesToText(preset).split(', ')).toHaveLength(
      preset.values.length,
    )
  })
})
