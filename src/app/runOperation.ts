/**
 * Run an operation — the request pipeline, for every structure.
 *
 * WHAT IT DOES
 *   `parse → validate → build → execute → hand the result to the controller`, and
 *   it also *composes* the trace:
 *
 *     phase 1  insert the dataset one value at a time  (`bstInsertAll`,
 *              `heapInsertAll`, `graphBuild`) — every step is an insert step, so
 *              the code panel shows the insert instruction while the structure
 *              grows;
 *     phase 2  the operation itself (search / delete / traversal / sift / BFS),
 *              or nothing when the operation *is* the build.
 *
 *   Which inputs an operation needs comes from its `OperationMeta.inputs`, so the
 *   guide and the pipeline read the same record and cannot disagree about the form.
 *
 * WHY THIS FILE EXISTS
 *   The pipeline is core application logic, so it belongs in `app/` — not in the
 *   entry file and not in `ui/`. Composition lives here rather than in a generator
 *   because "build, then run" is a workflow choice; the underlying generators stay
 *   pure single-operation functions.
 *
 * HOW IT IS SHARED
 *   Returns a discriminated `RunOutcome`: either a validation report and the
 *   `LoadInput` the controller wants, or just the report. The caller never sees an
 *   exception for bad input.
 *
 * RULES
 *   No React, D3 or DOM; no timer. Deterministic for the same text (NFR-C2).
 */

import { EMPTY_BST } from '../core/model/bst'
import {
  heapFromValues,
  heapValues,
  type BinaryHeap,
} from '../core/model/binaryHeap'
import { buildGraphFromLabels } from '../core/model/graph'
import { buildList } from '../core/model/linkedList'
import { buildStack } from '../core/model/stack'
import { bstDelete } from '../core/operations/bst/delete'
import { bstInsert } from '../core/operations/bst/insert'
import { bstInsertAll } from '../core/operations/bst/insertAll'
import { bstSearch } from '../core/operations/bst/search'
import { concatSteps } from '../core/operations/compose'
import { bfs } from '../core/operations/graph/bfs'
import { graphBuild } from '../core/operations/graph/build'
import { dfs } from '../core/operations/graph/dfs'
import { heapBuildMax } from '../core/operations/heap/buildMaxHeap'
import { heapBuildMin } from '../core/operations/heap/buildMinHeap'
import { heapExtractMax } from '../core/operations/heap/extractMax'
import { heapExtractMin } from '../core/operations/heap/extractMin'
import { heapInsert } from '../core/operations/heap/insert'
import { heapInsertAll } from '../core/operations/heap/insertAll'
import { insertAt } from '../core/operations/list/insertAt'
import { insertAtHead } from '../core/operations/list/insertAtHead'
import { insertAtTail } from '../core/operations/list/insertAtTail'
import { deleteByValue } from '../core/operations/list/deleteByValue'
import { reverse } from '../core/operations/list/reverse'
import { stackPeek } from '../core/operations/stack/peek'
import { stackPop } from '../core/operations/stack/pop'
import { stackPush } from '../core/operations/stack/push'
import { inorder } from '../core/operations/traverse/inorder'
import { levelOrder } from '../core/operations/traverse/levelOrder'
import { postorder } from '../core/operations/traverse/postorder'
import { preorder } from '../core/operations/traverse/preorder'
import type { StructureValue } from '../core/model/order'
import type { GenerateSummary, Step } from '../core/trace/step'
import { getOperationMeta } from './catalogue'
import type { LoadInput } from './controller'
import {
  validateBstKeys,
  validateGraphEdges,
  validateGraphSource,
  validateHeapValues,
  validatePosition,
  validateSingleInteger,
  validateValue,
  validateValues,
  type GraphValidationReport,
  type ValidationReport,
} from './validate'

export type RunOutcome =
  | { ok: true; report: ValidationReport; input: LoadInput }
  | { ok: false; report: ValidationReport }

/** Everything the guide can collect. An operation uses the subset its meta names. */
export type RunRequest = {
  structureId: string
  operationId: string
  /** The list contents / BST keys / heap values, as typed. */
  valuesText?: string
  /** The single insert/search/delete key or heap value, as typed. */
  valueText?: string
  /** A 0-based linked-list insert position, as typed. */
  positionText?: string
  /** The graph edge list, one `A-B` per line. */
  edgesText?: string
  /** The BFS/DFS source vertex label. */
  sourceText?: string
  /** Whether the graph is directed; defaults to undirected. */
  directed?: boolean
}

/** The catalogue ids this module predates; kept for the list slice. */
export const LIST_STRUCTURE_ID = 'list'
export const INSERT_AT_HEAD_OPERATION_ID = 'insertAtHead'

/** Merges per-field reports into the one report the guide renders. */
function mergeReports(reports: readonly ValidationReport[]): ValidationReport {
  return {
    ok: reports.every((report) => report.ok),
    tokens: reports.flatMap((report) => report.tokens),
    accepted: reports.flatMap((report) => report.accepted),
    error: reports.find((report) => report.error !== undefined)?.error,
  }
}

/** A request that failed before an operation could be chosen or constructed. */
function fail(error: string): RunOutcome {
  return { ok: false, report: { ok: false, tokens: [], accepted: [], error } }
}

/** The graph validator uses the same token shape as a value report. */
function graphReportToValidation(
  report: GraphValidationReport,
): ValidationReport {
  return {
    ok: report.ok,
    tokens: report.tokens,
    accepted: report.edges.map((edge) => `${edge.from}-${edge.to}`),
    error: report.error,
  }
}

/** Picks the value-list validator for a structure (A1: BST unique, heap not). */
function validateStructureValues(
  structureId: string,
  valuesText: string,
): ValidationReport {
  switch (structureId) {
    case 'bst':
      return validateBstKeys(valuesText)
    case 'heap':
      return validateHeapValues(valuesText)
    default:
      // The list slice predates the integer rule and accepts short words.
      return validateValues(valuesText)
  }
}

/** One phase of a trace: its steps and its summary. */
type Phase = { trace: readonly Step[]; summary: GenerateSummary }

/**
 * The pause between "build the heap" and "extract from it".
 *
 * Composition alone makes the build's last sift adjacent to the extract's first
 * read, so the finished heap is never on screen as a stable picture. This step
 * highlights the root, names it as the min/max, and carries `milestone` so the
 * controller pauses here and the narration panel renders a phase warning.
 */
function heapBuildBoundary(
  heap: BinaryHeap,
  operationId: 'heapExtractMin' | 'heapExtractMax',
): Phase {
  const root = heap.entries[0]
  if (root === undefined) {
    return {
      trace: [],
      summary: { steps: 0, comparisons: 0, conclusion: '' },
    }
  }

  const label = heap.kind === 'min' ? 'minimum' : 'maximum'
  const nextLabel = heap.kind === 'min' ? 'next smallest' : 'next largest'
  const step: Step = {
    index: 0,
    operation: operationId,
    codeLine: 1,
    narration: `The heap is built and valid. The root at slot 0 is the ${label}, ${String(
      root.value,
    )}. Playback paused here: extracting removes this root, promotes the last entry to slot 0, then sifts down so the ${nextLabel} becomes the new root.`,
    milestone: 'heap-built',
    highlight: { nodes: [root.id], active: root.id, edges: [] },
    delta: {},
    aux: {
      kind: 'heap',
      values: heapValues(heap),
      indices: [0],
      comparisons: 0,
    },
  }

  return {
    trace: [step],
    summary: { steps: 1, comparisons: 0, conclusion: '' },
  }
}

/**
 * Runs any operation. `structureId`/`operationId` select the phases;
 * `OperationMeta.inputs` decides which fields are validated first, so a missing
 * field is reported as a validation error rather than reaching a generator as
 * `undefined`.
 */
export function runOperation(request: RunRequest): RunOutcome {
  const meta = getOperationMeta(request.operationId)
  if (meta === undefined) {
    return fail(`Unknown operation "${request.operationId}".`)
  }

  const needsValues = meta.inputs.includes('values')
  const needsValue = meta.inputs.includes('value')
  const needsPosition = meta.inputs.includes('position')
  const needsEdges = meta.inputs.includes('edges')
  const needsSource = meta.inputs.includes('source')

  /** Joins the phases into one `LoadInput`, renumbering the steps. */
  const finish = (
    report: ValidationReport,
    initial: unknown,
    phases: readonly Phase[],
  ): RunOutcome => {
    const steps = concatSteps(phases.map((phase) => phase.trace))
    const conclusions = phases
      .map((phase) => phase.summary.conclusion)
      .filter((conclusion) => conclusion.length > 0)
    return {
      ok: true,
      report,
      input: {
        initial,
        steps,
        summary: {
          steps: steps.length,
          comparisons: phases.reduce(
            (total, phase) => total + phase.summary.comparisons,
            0,
          ),
          conclusion: conclusions.join(' '),
        },
        structureId: request.structureId,
        operationId: request.operationId,
      },
    }
  }

  // ------------------------------------------------------------ graph pipeline
  if (needsEdges) {
    const directed = request.directed ?? false
    const edgesReport = validateGraphEdges(request.edgesText ?? '', {
      directed,
    })
    const sourceReport = needsSource
      ? validateGraphSource(request.sourceText ?? '', edgesReport.vertices)
      : ({ ok: true, tokens: [], accepted: [] } satisfies ValidationReport)

    const report = mergeReports([
      graphReportToValidation(edgesReport),
      sourceReport,
    ])
    if (!report.ok) return { ok: false, report }

    const labels = edgesReport.vertices
    // The build phase starts from the declared vertices and adds one edge per
    // step, so the adjacency order the traversal will follow is shown forming.
    const verticesOnly = buildGraphFromLabels(labels, [], { directed })
    const build = graphBuild({
      labels,
      edges: edgesReport.edges,
      directed,
    })

    if (request.operationId === 'graphBuild') {
      return finish(report, verticesOnly, [build])
    }

    // BFS/DFS are shown over the finished graph: pressing Visualise loads the
    // whole drawing, and the first traversal step is where playback begins. The
    // edge-by-edge build stays available as its own operation.
    const sourceLabel = String(sourceReport.accepted[0])
    // Validation accepts the label the user typed (`A`); the traversal model is
    // keyed by the vertex id (`v1`), so translate once here.
    const sourceVertex = build.finalState.vertices.find(
      (vertex) => vertex.label === sourceLabel,
    )
    const source = sourceVertex?.id ?? sourceLabel
    const traversal =
      request.operationId === 'dfs'
        ? dfs(build.finalState, { source })
        : bfs(build.finalState, { source })
    return finish(report, build.finalState, [traversal])
  }

  // -------------------------------------------------------- value-list pipeline
  const valuesReport = needsValues
    ? validateStructureValues(request.structureId, request.valuesText ?? '')
    : ({ ok: true, tokens: [], accepted: [] } satisfies ValidationReport)

  // The linear structures (list, stack) accept a short word as a value
  // (`validateValue`); the ordered structures use the integer validator.
  const valueReport = needsValue
    ? request.structureId === 'list' || request.structureId === 'stack'
      ? validateValue(request.valueText ?? '')
      : validateSingleInteger(
          request.valueText ?? '',
          request.structureId === 'bst' ? 'key' : 'value',
        )
    : ({ ok: true, tokens: [], accepted: [] } satisfies ValidationReport)

  const positionReport = needsPosition
    ? validatePosition(request.positionText ?? '')
    : ({ ok: true, tokens: [], accepted: [] } satisfies ValidationReport)

  const report = mergeReports([valuesReport, valueReport, positionReport])
  if (!report.ok) return { ok: false, report }

  const values = valuesReport.accepted
  const value = valueReport.accepted[0] as StructureValue
  const position = positionReport.accepted[0] as number

  switch (request.operationId) {
    // ------------------------------------------------------------------ list
    case 'insertAtHead': {
      const initial = buildList(values)
      return finish(report, initial, [insertAtHead(initial, { value })])
    }
    case 'insertAt': {
      const initial = buildList(values)
      return finish(report, initial, [insertAt(initial, { value, position })])
    }
    case 'insertAtTail': {
      const initial = buildList(values)
      return finish(report, initial, [insertAtTail(initial, { value })])
    }
    case 'deleteByValue': {
      const initial = buildList(values)
      return finish(report, initial, [deleteByValue(initial, { value })])
    }
    case 'reverse': {
      const initial = buildList(values)
      return finish(report, initial, [reverse(initial)])
    }

    // ----------------------------------------------------------------- stack
    case 'stackPush': {
      const initial = buildStack(values)
      return finish(report, initial, [stackPush(initial, { value })])
    }
    case 'stackPop': {
      const initial = buildStack(values)
      return finish(report, initial, [stackPop(initial)])
    }
    case 'stackPeek': {
      const initial = buildStack(values)
      return finish(report, initial, [stackPeek(initial)])
    }

    // ------------------------------------------------------------------- BST
    case 'bstInsertAll':
      return finish(report, EMPTY_BST, [bstInsertAll(values)])
    case 'bstInsert':
    case 'bstDelete':
    case 'bstSearch':
    case 'preorder':
    case 'inorder':
    case 'postorder':
    case 'levelOrder': {
      const build = bstInsertAll(values)
      const tree = build.finalState
      const operation: Phase =
        request.operationId === 'bstInsert'
          ? bstInsert(tree, { value })
          : request.operationId === 'bstDelete'
            ? bstDelete(tree, { value })
            : request.operationId === 'bstSearch'
              ? bstSearch(tree, { value })
              : request.operationId === 'preorder'
                ? preorder(tree)
                : request.operationId === 'inorder'
                  ? inorder(tree)
                  : request.operationId === 'postorder'
                    ? postorder(tree)
                    : levelOrder(tree)

      // Search and traversals are shown over the finished tree: Visualise loads
      // every node and the selected pseudocode, then Next/Play runs the
      // operation. Insert and delete keep the insert-by-insert build phase
      // because the build is part of their lesson.
      const isPrebuilt =
        request.operationId === 'bstSearch' ||
        request.operationId === 'preorder' ||
        request.operationId === 'inorder' ||
        request.operationId === 'postorder' ||
        request.operationId === 'levelOrder'

      return isPrebuilt
        ? finish(report, tree, [operation])
        : finish(report, EMPTY_BST, [build, operation])
    }

    // ------------------------------------------------------------------ heap
    case 'heapInsertAll':
      return finish(report, heapFromValues([], 'min'), [
        heapInsertAll(values, 'min'),
      ])
    case 'heapInsert': {
      const build = heapInsertAll(values, 'min')
      return finish(report, heapFromValues([], 'min'), [
        build,
        heapInsert(build.finalState, { value }),
      ])
    }
    case 'heapExtractMin': {
      const build = heapInsertAll(values, 'min')
      return finish(report, heapFromValues([], 'min'), [
        build,
        heapBuildBoundary(build.finalState, 'heapExtractMin'),
        heapExtractMin(build.finalState),
      ])
    }
    case 'heapExtractMax': {
      const build = heapInsertAll(values, 'max')
      return finish(report, heapFromValues([], 'max'), [
        build,
        heapBuildBoundary(build.finalState, 'heapExtractMax'),
        heapExtractMax(build.finalState),
      ])
    }
    // Build-heap is the *other* way to build: it heapifies the raw array in O(n),
    // so it deliberately has no insert-by-insert phase to contrast against.
    case 'heapBuildMin': {
      const raw: BinaryHeap = heapFromValues(values, 'min')
      return finish(report, raw, [heapBuildMin(raw)])
    }
    case 'heapBuildMax': {
      const raw: BinaryHeap = heapFromValues(values, 'max')
      return finish(report, raw, [heapBuildMax(raw)])
    }

    default:
      return fail(
        `Operation "${request.operationId}" is not implemented for structure "${request.structureId}".`,
      )
  }
}

/**
 * The original list-slice entry point, kept as a thin wrapper so the existing
 * callers and tests keep working while the dispatcher above serves the catalogue.
 */
export function runInsertAtHead(
  valuesText: string,
  insertText: string,
): RunOutcome {
  return runOperation({
    structureId: LIST_STRUCTURE_ID,
    operationId: INSERT_AT_HEAD_OPERATION_ID,
    valuesText,
    valueText: insertText,
  })
}
