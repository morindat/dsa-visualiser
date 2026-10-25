import { describe, expect, it } from 'vitest'
import type { Step } from '../trace/step'
import { concatSteps, withProgress } from './compose'

// DOM-free core helper: composition is pure list manipulation over `Step`.

function step(index: number, operation: string, narration = 'narration'): Step {
  return {
    index,
    operation,
    codeLine: 1,
    narration,
    highlight: { nodes: [], edges: [] },
    delta: {},
  }
}

describe('concatSteps', () => {
  it('renumbers `index` across the parts and keeps each operation id', () => {
    const combined = concatSteps([
      [step(0, 'bstInsert'), step(1, 'bstInsert')],
      [step(0, 'inorder')],
    ])

    expect(combined.map((entry) => entry.index)).toEqual([0, 1, 2])
    expect(combined.map((entry) => entry.operation)).toEqual([
      'bstInsert',
      'bstInsert',
      'inorder',
    ])
  })

  it('does not mutate the input steps', () => {
    const first = step(0, 'a')
    concatSteps([[first], [step(0, 'b')]])
    expect(first.index).toBe(0)
  })

  it('returns an empty trace for no parts', () => {
    expect(concatSteps([])).toEqual([])
  })
})

describe('withProgress', () => {
  it('prefixes each narration with its per-step label', () => {
    const labelled = withProgress(
      [step(0, 'heapInsert', 'append 42.'), step(1, 'heapInsert', 'done.')],
      (position) => `Inserting (${position + 1}): `,
    )

    expect(labelled.map((entry) => entry.narration)).toEqual([
      'Inserting (1): append 42.',
      'Inserting (2): done.',
    ])
    // Everything else is untouched.
    expect(labelled[0].operation).toBe('heapInsert')
    expect(labelled[0].index).toBe(0)
  })
})
