import { describe, expect, it } from 'vitest'
import {
  AUX_KINDS,
  EDGE_KINDS,
  FIELD_ID_PREFIX,
  isAuxKind,
  isEdgeKind,
  isFieldId,
} from './step'
import type { Step } from './step'

// This suite is part of `npm run test:core`: it must pass with no DOM, no React
// and no D3 (NFR-M2, NFR-M3). Nothing here touches `document` or `window`.

function sampleStep(): Step {
  return {
    index: 3,
    operation: 'insertAtHead',
    codeLine: 2,
    narration: 'Create a new node holding 45.',
    milestone: 'example-boundary',
    highlight: {
      nodes: ['n3', 'n1'],
      active: 'n3',
      edges: [{ from: 'n3', to: 'n1', kind: 'next' }],
    },
    delta: {
      created: [{ id: 'n3', value: 45 }],
      linked: [{ from: 'n3', to: 'n1', kind: 'next' }],
      updated: [{ id: '@head', from: 'n1', to: 'n3' }],
    },
    aux: { kind: 'array', values: [45, 30, 50], comparisons: 1 },
  }
}

describe('the Step contract (frozen v1)', () => {
  it('has exactly these top-level keys — a change to the shape is a visible diff', () => {
    // Shape lock. If this fails, the contract changed: update every producer and
    // consumer and regenerate the golden traces in the SAME commit (ADR-8).
    expect(Object.keys(sampleStep()).sort()).toEqual([
      'aux',
      'codeLine',
      'delta',
      'highlight',
      'index',
      'milestone',
      'narration',
      'operation',
    ])
  })

  it('narrows exactly the declared auxiliary kinds', () => {
    for (const kind of AUX_KINDS) {
      expect(isAuxKind(kind)).toBe(true)
    }

    for (const other of [
      'frontier',
      'ARRAY',
      '',
      42,
      null,
      undefined,
      {},
      ['array'],
    ]) {
      expect(isAuxKind(other)).toBe(false)
    }
  })

  it('treats an absent aux as optional, not as a kind', () => {
    const step = sampleStep()
    delete step.aux

    expect(Object.hasOwn(step, 'aux')).toBe(false)
    expect(isAuxKind(step)).toBe(false)
  })

  it('narrows exactly the declared edge kinds', () => {
    for (const kind of EDGE_KINDS) {
      expect(isEdgeKind(kind)).toBe(true)
    }

    for (const other of ['nex', 'NEXT', '', 1, null, undefined]) {
      expect(isEdgeKind(other)).toBe(false)
    }
  })

  it('separates structure fields (@head) from node ids', () => {
    expect(FIELD_ID_PREFIX).toBe('@')
    expect(isFieldId('@head')).toBe(true)
    expect(isFieldId('n1')).toBe(false)
  })

  it('is JSON-serialisable and byte-stable (NFR-C2)', () => {
    const step = sampleStep()
    const encoded = JSON.stringify(step)
    const decoded = JSON.parse(encoded) as Step

    // Round-tripping is a fixed point: the same (operation, dataset) always
    // produces a byte-identical trace, which is what makes exact replay work.
    expect(JSON.stringify(decoded)).toBe(encoded)
    expect(decoded).toEqual(step)
  })
})
