import { describe, expect, it } from 'vitest'
import { CATALOGUE, OPERATION_META, PSEUDOCODE_LISTINGS } from './catalogue'
import { buildList } from '../core/model/linkedList'
import { buildStack } from '../core/model/stack'
import { buildBst } from '../core/model/bst'
import { heapFromValues, heapifyInPlace } from '../core/model/binaryHeap'
import { buildGraphFromLabels } from '../core/model/graph'
import { insertAtHead } from '../core/operations/list/insertAtHead'
import { insertAt } from '../core/operations/list/insertAt'
import { insertAtTail } from '../core/operations/list/insertAtTail'
import { deleteByValue } from '../core/operations/list/deleteByValue'
import { reverse } from '../core/operations/list/reverse'
import { stackPeek } from '../core/operations/stack/peek'
import { stackPop } from '../core/operations/stack/pop'
import { stackPush } from '../core/operations/stack/push'
import { bstDelete } from '../core/operations/bst/delete'
import { bstInsert } from '../core/operations/bst/insert'
import { bstInsertAll } from '../core/operations/bst/insertAll'
import { bstSearch } from '../core/operations/bst/search'
import { bfs } from '../core/operations/graph/bfs'
import { graphBuild } from '../core/operations/graph/build'
import { dfs } from '../core/operations/graph/dfs'
import { heapBuildMax } from '../core/operations/heap/buildMaxHeap'
import { heapBuildMin } from '../core/operations/heap/buildMinHeap'
import { heapExtractMax } from '../core/operations/heap/extractMax'
import { heapExtractMin } from '../core/operations/heap/extractMin'
import { heapInsert } from '../core/operations/heap/insert'
import { heapInsertAll } from '../core/operations/heap/insertAll'
import { inorder } from '../core/operations/traverse/inorder'
import { levelOrder } from '../core/operations/traverse/levelOrder'
import { postorder } from '../core/operations/traverse/postorder'
import { preorder } from '../core/operations/traverse/preorder'
import type { Step } from '../core/trace/step'

// DOM-free. This suite is the guard on the three-pane contract: the pseudocode
// panel (FR3/FR9) and the code highlight are only correct if every `Step.codeLine`
// a generator emits is a real, non-empty line of that operation's ONE authored
// listing. A drift between generator and listing fails here instead of silently
// highlighting the wrong line in the UI.

const tree = buildBst([50, 30, 70, 20, 40, 60, 80])
const smallTree = buildBst([50, 30, 70, 20, 40])
const minHeap = heapifyInPlace(heapFromValues([1, 3, 5, 2, 8, 7, 6, 9], 'min'))
const maxHeap = heapifyInPlace(heapFromValues([1, 3, 5, 2, 8, 7, 6, 9], 'max'))
const rawHeap = heapFromValues([5, 3, 8, 1, 9, 2], 'min')
const graph = buildGraphFromLabels(
  ['A', 'B', 'C', 'D', 'E', 'F'],
  [
    ['A', 'B'],
    ['A', 'C'],
    ['B', 'D'],
    ['B', 'E'],
    ['C', 'E'],
    ['D', 'F'],
    ['E', 'F'],
  ],
)

/**
 * Every operation the catalogue claims to offer, with a trace to check.
 *
 * `allowed` lists the operation ids the steps may carry. It is not always just the
 * run's own id: the "insert the dataset one by one" operations compose the pure
 * single-insert generator, so their steps carry `bstInsert` / `heapInsert`.
 */
const RUNS: { operation: string; allowed: string[]; steps: Step[] }[] = [
  {
    operation: 'insertAtHead',
    allowed: ['insertAtHead'],
    steps: insertAtHead(buildList([50, 30, 70]), { value: 45 }).trace,
  },
  {
    operation: 'insertAt',
    allowed: ['insertAt'],
    steps: insertAt(buildList([50, 30, 70]), {
      value: 45,
      position: 1,
    }).trace,
  },
  {
    operation: 'insertAtTail',
    allowed: ['insertAtTail'],
    steps: insertAtTail(buildList([50, 30, 70]), { value: 45 }).trace,
  },
  {
    operation: 'deleteByValue',
    allowed: ['deleteByValue'],
    steps: deleteByValue(buildList([50, 30, 70]), { value: 30 }).trace,
  },
  {
    operation: 'reverse',
    allowed: ['reverse'],
    steps: reverse(buildList([50, 30, 70])).trace,
  },

  // ---------------------------------------------------------------- stack
  {
    operation: 'stackPush',
    allowed: ['stackPush'],
    steps: stackPush(buildStack([50, 30, 70]), { value: 45 }).trace,
  },
  {
    operation: 'stackPop',
    allowed: ['stackPop'],
    steps: stackPop(buildStack([50, 30, 70])).trace,
  },
  {
    operation: 'stackPeek',
    allowed: ['stackPeek'],
    steps: stackPeek(buildStack([50, 30, 70])).trace,
  },

  {
    operation: 'bstInsertAll',
    allowed: ['bstInsert'],
    steps: bstInsertAll([50, 30, 70]).trace,
  },
  {
    operation: 'bstSearch',
    allowed: ['bstSearch'],
    steps: bstSearch(tree, { value: 40 }).trace,
  },
  {
    operation: 'bstInsert',
    allowed: ['bstInsert'],
    steps: bstInsert(smallTree, { value: 45 }).trace,
  },
  {
    operation: 'bstDelete',
    allowed: ['bstDelete'],
    steps: bstDelete(buildBst([50, 30, 70, 60, 80]), { value: 50 }).trace,
  },
  {
    operation: 'preorder',
    allowed: ['preorder'],
    steps: preorder(smallTree).trace,
  },
  {
    operation: 'inorder',
    allowed: ['inorder'],
    steps: inorder(smallTree).trace,
  },
  {
    operation: 'postorder',
    allowed: ['postorder'],
    steps: postorder(smallTree).trace,
  },
  {
    operation: 'levelOrder',
    allowed: ['levelOrder'],
    steps: levelOrder(smallTree).trace,
  },
  {
    operation: 'heapInsertAll',
    allowed: ['heapInsert'],
    steps: heapInsertAll([5, 3, 8, 1], 'min').trace,
  },
  {
    operation: 'heapInsert',
    allowed: ['heapInsert'],
    steps: heapInsert(minHeap, { value: 0 }).trace,
  },
  {
    operation: 'heapExtractMin',
    allowed: ['heapExtractMin'],
    steps: heapExtractMin(minHeap).trace,
  },
  {
    operation: 'heapExtractMax',
    allowed: ['heapExtractMax'],
    steps: heapExtractMax(maxHeap).trace,
  },
  {
    operation: 'heapBuildMin',
    allowed: ['heapBuildMin'],
    steps: heapBuildMin(rawHeap).trace,
  },
  {
    operation: 'heapBuildMax',
    allowed: ['heapBuildMax'],
    steps: heapBuildMax(rawHeap).trace,
  },
  {
    operation: 'graphBuild',
    allowed: ['graphBuild'],
    steps: graphBuild({
      labels: ['A', 'B', 'C'],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
      ],
      directed: false,
    }).trace,
  },
  {
    operation: 'bfs',
    allowed: ['bfs'],
    steps: bfs(graph, { source: 'v1' }).trace,
  },
  {
    operation: 'dfs',
    allowed: ['dfs'],
    steps: dfs(graph, { source: 'v1' }).trace,
  },
]

describe('operation catalogue', () => {
  it('resolves every OperationMeta to exactly one authored listing', () => {
    for (const meta of Object.values(OPERATION_META)) {
      const listing = PSEUDOCODE_LISTINGS[meta.pseudocodeId]
      expect(listing, `listing for "${meta.pseudocodeId}"`).toBeDefined()
      expect(listing?.id).toBe(meta.pseudocodeId)
      expect(listing?.lines.length ?? 0).toBeGreaterThan(0)
    }
  })

  it('lists only operations that have a meta record and a listing', () => {
    for (const entry of CATALOGUE) {
      expect(
        entry.operations.length,
        `${entry.id} has operations`,
      ).toBeGreaterThan(0)
      for (const operationId of entry.operations) {
        const meta = OPERATION_META[operationId]
        expect(meta, `meta for ${entry.id}/${operationId}`).toBeDefined()
        expect(PSEUDOCODE_LISTINGS[meta?.pseudocodeId ?? '']).toBeDefined()
      }
    }
  })

  it('covers every meta id with a generator trace (no orphaned operation)', () => {
    expect(RUNS.map((run) => run.operation).sort()).toEqual(
      Object.keys(OPERATION_META).sort(),
    )
  })

  it('emits only code lines that exist and are non-empty in the listing', () => {
    for (const { operation, allowed, steps } of RUNS) {
      const meta = OPERATION_META[operation]
      expect(meta, `meta for ${operation}`).toBeDefined()
      const lines = PSEUDOCODE_LISTINGS[meta?.pseudocodeId ?? '']?.lines ?? []

      expect(steps.length, `${operation} produced a trace`).toBeGreaterThan(0)
      for (const step of steps) {
        expect(allowed, `${operation} step.operation`).toContain(step.operation)
        expect(
          step.codeLine,
          `${operation} codeLine >= 1`,
        ).toBeGreaterThanOrEqual(1)
        expect(
          step.codeLine,
          `${operation} codeLine <= listing length`,
        ).toBeLessThanOrEqual(lines.length)
        expect(
          lines[step.codeLine - 1]?.trim().length ?? 0,
          `${operation} line ${step.codeLine} is non-empty`,
        ).toBeGreaterThan(0)
      }
    }
  })

  it('keeps every listing a pure algorithm — no trace/emit bookkeeping', () => {
    // The visualiser's steps are the *execution* of these functions. A `trace`
    // variable or an `emit` call is instrumentation leaking into the lesson, so it
    // is a test failure, not a style nit.
    for (const listing of Object.values(PSEUDOCODE_LISTINGS)) {
      for (const line of listing.lines) {
        expect(line, `${listing.id}: "${line}"`).not.toMatch(/\btrace\b/)
        expect(line, `${listing.id}: "${line}"`).not.toMatch(/\bemit\b/)
      }
    }
  })

  it('shows the descent calls and the visit line for each DFS traversal', () => {
    // The visit line is still the lesson: first for preorder, middle for inorder,
    // last for postorder. The additional call lines are the descent from the root
    // that learners need in order to follow the recursion.
    const runs = [
      {
        trace: preorder(smallTree).trace,
        visitLine: 4,
        order: preorder(smallTree).order,
      },
      {
        trace: inorder(smallTree).trace,
        visitLine: 5,
        order: inorder(smallTree).order,
      },
      {
        trace: postorder(smallTree).trace,
        visitLine: 6,
        order: postorder(smallTree).order,
      },
    ]

    for (const { trace, visitLine, order } of runs) {
      expect(trace[0].codeLine).toBe(1)
      expect(new Set(trace.map((step) => step.codeLine))).toEqual(
        new Set([1, 4, 5, 6]),
      )
      const visits = trace.filter((step) => step.codeLine === visitLine)
      expect(visits).toHaveLength(smallTree.nodes.length)
      expect(visits[visits.length - 1].aux?.output).toEqual(order)
    }
  })
})
