/**
 * StructurePane — pane 1 of 3: the structure view.
 *
 * WHAT IT DOES
 *   Picks the renderer that matches the loaded structure and hosts it inside an
 *   error boundary, with a legend so node colours are never the only explanation of
 *   what is happening. The state is a discriminated `StructureState`, so switching
 *   on `structureId` gives the matching model type — no casts here.
 *
 * WHY THIS FILE EXISTS
 *   One host for every structure means the shell never has to know which one is
 *   loaded, and a new structure adds a case here plus a renderer, not a new pane
 *   (`ADR-1`, A2 Listing 18). Failure stays local: a renderer that throws is
 *   replaced by a fallback and the code/aux panes keep working (`ER13`).
 *
 * RULES
 *   No algorithm state, no step index, no timer. Styling uses the semantic tokens
 *   in `src/index.css`.
 */

import { useEffect, useRef } from 'react'
import type { StructureState } from '../../app/reducers'
import type { Step } from '../../core/trace/step'
import { GraphRenderer } from '../../render/renderers/graph'
import { HeapRenderer } from '../../render/renderers/heap'
import { ListRenderer } from '../../render/renderers/list'
import { StackRenderer } from '../../render/renderers/stack'
import { TreeRenderer } from '../../render/renderers/tree'
import { ErrorBoundary } from '../ErrorBoundary'

export type StructurePaneProps = {
  /** `null` before any trace is loaded, so the pane can say so. */
  state: StructureState | null
  step: Step | undefined
  /** `stage` fills the visualisation frame; `panel` is the standalone card. */
  variant?: 'panel' | 'stage'
  /** Graph traversal source, marked in the drawing. */
  sourceId?: string
}

export function StructurePane({
  state,
  step,
  variant = 'panel',
  sourceId,
}: StructurePaneProps) {
  const isStage = variant === 'stage'
  const isGraph = state?.structureId === 'graph'
  const isGraphTraversal =
    isGraph && (step?.aux?.kind === 'queue' || step?.aux?.kind === 'stack')
  const canvasRef = useRef<HTMLDivElement>(null)
  const centeredFor = useRef<string | null>(null)

  // A phone cannot show the whole 760px graph at a readable size. The graph
  // canvas scrolls horizontally in that case; start centred so the source and
  // the middle of the tree are visible immediately instead of the far-left edge.
  useEffect(() => {
    if (!isGraph || !isStage) return
    const key = `${state?.structureId ?? 'none'}:${sourceId ?? 'none'}`
    if (centeredFor.current === key) return
    const element = canvasRef.current
    if (element === null) return
    centeredFor.current = key
    const frame = requestAnimationFrame(() => {
      element.scrollLeft = Math.max(
        0,
        (element.scrollWidth - element.clientWidth) / 2,
      )
    })
    return () => cancelAnimationFrame(frame)
  }, [isGraph, isStage, state?.structureId, sourceId])

  return (
    <section
      aria-label="Structure view"
      className={
        isStage
          ? 'flex h-full min-h-0 flex-col'
          : 'rounded-xl border border-line bg-surface p-3'
      }
    >
      {!isStage && (
        <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-muted">
          Structure
        </h2>
      )}
      {isGraphTraversal && (
        <p className="mb-1.5 shrink-0 border-b border-line/60 px-1 pb-1.5 text-[11px] leading-4 text-muted">
          Start at the node marked{' '}
          <span className="font-semibold text-accent">source</span> on the top
          row; each row below is one edge farther away. Follow the{' '}
          <span className="font-semibold text-[var(--color-orange)]">
            orange edge
          </span>{' '}
          being examined. Amber nodes are waiting; teal is current; green is
          visited.
        </p>
      )}
      <div
        ref={canvasRef}
        className={`${isStage ? 'stage-canvas min-h-0 flex-1' : ''} ${
          isGraph ? 'stage-canvas--graph' : ''
        }`}
      >
        <ErrorBoundary title="structure view">
          {state === null ? (
            <EmptyState
              text="Load a trace to see the structure."
              centered={isStage}
            />
          ) : (
            <StructureView state={state} step={step} sourceId={sourceId} />
          )}
        </ErrorBoundary>
      </div>
      <Legend structureId={state?.structureId ?? null} compact={isStage} />
    </section>
  )
}

function StructureView({
  state,
  step,
  sourceId,
}: {
  state: StructureState
  step: Step | undefined
  sourceId?: string
}) {
  switch (state.structureId) {
    case 'list':
      return state.model.nodes.length === 0 ? (
        <EmptyState text="Load a trace to see the list." />
      ) : (
        <ListRenderer state={state.model} step={step} />
      )
    case 'stack':
      // Even an empty stack is drawn: the empty state is a teaching state (ER6),
      // so the learner sees `top = -1` rather than an empty panel.
      return <StackRenderer state={state.model} step={step} />
    case 'bst':
      return state.model.root === null ? (
        <EmptyState text="The tree is empty — insert a key to see it." />
      ) : (
        <TreeRenderer state={state.model} step={step} />
      )
    case 'heap':
      return state.model.entries.length === 0 ? (
        <EmptyState text="The heap is empty." />
      ) : (
        <HeapRenderer state={state.model} step={step} />
      )
    case 'graph':
      return state.model.vertices.length === 0 ? (
        <EmptyState text="The graph is empty." />
      ) : (
        <GraphRenderer state={state.model} step={step} sourceId={sourceId} />
      )
  }
}

function EmptyState({
  text,
  centered = false,
}: {
  text: string
  centered?: boolean
}) {
  return (
    <p
      className={
        centered
          ? 'flex h-full min-h-36 items-center justify-center p-8 text-sm text-muted'
          : 'p-8 text-sm text-muted'
      }
    >
      {text}
    </p>
  )
}

/** One legend per structure, because the visual states differ by structure. */
function Legend({
  structureId,
  compact = false,
}: {
  structureId: string | null
  compact?: boolean
}) {
  const listClass = compact
    ? 'mt-1 flex flex-wrap gap-x-3 gap-y-1 border-t border-line/60 px-1 pt-2 text-[11px] text-ink-dim'
    : 'mt-2 flex flex-wrap gap-3 text-xs text-ink-dim'

  if (structureId === 'graph') {
    return (
      <ul className={listClass}>
        <LegendItem
          colour="var(--color-node-undiscovered)"
          label="not discovered"
        />
        <LegendItem
          colour="var(--color-node-frontier)"
          label="frontier (queue/stack)"
        />
        <LegendItem colour="var(--color-node-current)" label="current" />
        <LegendItem colour="var(--color-node-visited)" label="visited" />
        <LegendLine colour="var(--color-orange)" label="edge examined now" />
      </ul>
    )
  }

  if (structureId === 'stack') {
    return (
      <ul className={listClass}>
        <LegendItem colour="var(--color-node-current)" label="current" />
        <LegendItem colour="var(--color-node-frontier)" label="touched" />
        <LegendItem colour="var(--color-node-undiscovered)" label="in stack" />
        <li className="text-muted">top marker = only reachable end</li>
        <li className="text-muted">dashed = reserved / leaving</li>
      </ul>
    )
  }

  if (structureId === 'bst' || structureId === 'heap') {
    return (
      <ul className={listClass}>
        <LegendItem colour="var(--color-node-current)" label="current" />
        <LegendItem colour="var(--color-node-frontier)" label="examined" />
        <LegendItem colour="var(--color-node-visited)" label="visited" />
        <LegendItem colour="var(--color-node-undiscovered)" label="idle" />
        {structureId === 'heap' && (
          <li className="text-muted">array index = tree slot</li>
        )}
      </ul>
    )
  }

  return (
    <ul className={listClass}>
      <LegendItem colour="var(--color-node-current)" label="current" />
      <LegendItem colour="var(--color-node-frontier)" label="touched" />
      <LegendItem colour="var(--color-node-undiscovered)" label="idle" />
      <li className="text-muted">floating = created but not linked yet</li>
    </ul>
  )
}

function LegendItem({ colour, label }: { colour: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="inline-block h-3 w-3 rounded-full border border-node-stroke"
        style={{ backgroundColor: colour }}
      />
      {label}
    </li>
  )
}

function LegendLine({ colour, label }: { colour: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="inline-block h-0.5 w-4 rounded-full"
        style={{ backgroundColor: colour }}
      />
      {label}
    </li>
  )
}
