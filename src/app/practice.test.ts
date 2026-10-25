import { describe, expect, it } from 'vitest'
import type { Step } from '../core/trace/step'
import { buildPrediction } from './practice'

function step(index: number, narration: string): Step {
  return {
    index,
    operation: 'insertAtHead',
    codeLine: 2,
    narration,
    highlight: { nodes: [], edges: [] },
    delta: {},
  }
}

describe('buildPrediction', () => {
  const trace = [
    step(0, 'Create a new node.'),
    step(1, 'Point the new node at the current head.'),
    step(2, 'Move the head pointer to the new node.'),
    step(3, 'Return the head.'),
  ]

  it('returns null on the final step', () => {
    expect(buildPrediction(trace, trace.length - 1)).toBeNull()
    expect(buildPrediction([], 0)).toBeNull()
  })

  it('uses the next narration as the correct answer', () => {
    const prediction = buildPrediction(trace, 0)
    expect(prediction).not.toBeNull()
    if (prediction === null) return

    const correct = prediction.options.filter((option) => option.correct)
    expect(correct).toHaveLength(1)
    expect(correct[0].text).toBe(trace[1].narration)
    expect(prediction.correctId).toBe(correct[0].id)
    expect(prediction.nextIndex).toBe(1)
    expect(prediction.options).toHaveLength(3)
    expect(new Set(prediction.options.map((option) => option.text)).size).toBe(
      3,
    )
  })

  it('is deterministic for the same trace and index', () => {
    expect(buildPrediction(trace, 1)).toEqual(buildPrediction(trace, 1))
  })

  it('falls back to generic distractors on a short trace', () => {
    const short = [step(0, 'Only step'), step(1, 'Final step')]
    const prediction = buildPrediction(short, 0)
    expect(prediction).not.toBeNull()
    if (prediction === null) return
    expect(prediction.options).toHaveLength(3)
    expect(prediction.options.some((option) => option.correct)).toBe(true)
  })

  it('returns null when the next narration is empty', () => {
    const blank = [step(0, 'Start'), step(1, '   ')]
    expect(buildPrediction(blank, 0)).toBeNull()
  })
})
