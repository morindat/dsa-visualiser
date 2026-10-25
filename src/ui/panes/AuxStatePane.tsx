/**
 * AuxStatePane — pane 3 of 3: the auxiliary state.
 *
 * WHAT IT DOES
 *   Renders `step.aux`, choosing the view by `aux.kind`: an array, a stack, a FIFO
 *   frontier, the heap array with its live indices, a visited set, or the recursion
 *   frames. When a step carries no `aux` — the honest case for linked-list insert,
 *   whose auxiliary space is O(1) — it says so rather than inventing a container.
 *
 * WHY THIS FILE EXISTS
 *   `aux.kind` selects which panel renders (`FR10`). Keeping the choice explicit in
 *   one component means a new structure adds a case, not a new pane, and the panel
 *   never recomputes anything: it displays exactly what the step carries, so the
 *   picture of the frontier is the frontier the algorithm actually used.
 *
 * RULES
 *   No algorithm state, no timer. An absent `aux` is distinct from "no step
 *   selected", so the two are reported separately. Styling uses the semantic tokens
 *   in `src/index.css`.
 */

import type { ReactNode } from 'react'
import type { AuxState, AuxKind, TraceEdge } from '../../core/trace/step'

export type AuxStatePaneProps = {
  aux: AuxState | undefined
  /** False before any trace is loaded, so "no step" is not confused with "no aux". */
  hasStep: boolean
  /** Graph traversals get the richer frontier/visited explanation. */
  structureId?: string
  /** The vertex the current step is processing, if any. */
  activeId?: string
  /** The edge the current step is examining, if any. */
  edges?: readonly TraceEdge[]
  /** Maps internal node ids to the labels drawn on the graph. */
  labelFor?: (id: string) => string
}

const KIND_LABEL: Record<AuxKind, string> = {
  array: 'array',
  stack: 'stack (top last)',
  queue: 'queue (front first)',
  heap: 'heap array (index = tree slot)',
  visited: 'visited set',
  recursion: 'call-stack frames',
  pointers: 'pointer variables',
}

export function AuxStatePane({
  aux,
  hasStep,
  structureId,
  activeId,
  edges,
  labelFor,
}: AuxStatePaneProps) {
  const graphAux =
    structureId === 'graph' &&
    aux !== undefined &&
    (aux.kind === 'queue' || aux.kind === 'stack')
      ? aux
      : null

  return (
    <section
      aria-label="Auxiliary state"
      data-tour="aux"
      className="rounded-lg border border-line bg-surface p-3"
    >
      <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-muted">
        {graphAux === null ? 'Auxiliary state' : 'Traversal state'}
      </h2>

      {!hasStep ? (
        <p className="text-sm text-muted">No step selected.</p>
      ) : aux === undefined ? (
        <p className="text-sm text-ink-dim">
          None — this operation keeps O(1) auxiliary state, so there is no
          container to show.
        </p>
      ) : (
        <>
          {graphAux === null ? (
            <AuxView aux={aux} labelFor={labelFor} />
          ) : (
            <GraphFrontier
              aux={graphAux}
              activeId={activeId}
              edges={edges}
              labelFor={labelFor}
            />
          )}
          {aux.output !== undefined && <Output values={aux.output} />}
        </>
      )}

      {aux !== undefined && (
        <p className="mt-2 text-xs text-muted">
          state: <span className="font-mono">{KIND_LABEL[aux.kind]}</span> ·
          comparisons: {aux.comparisons ?? 0}
        </p>
      )}
    </section>
  )
}

function AuxView({
  aux,
  labelFor,
}: {
  aux: AuxState
  labelFor?: (id: string) => string
}) {
  switch (aux.kind) {
    case 'array':
      return (
        <Block>
          <ChipRow values={aux.values ?? []} />
        </Block>
      )

    case 'stack':
      return (
        <Block>
          <ChipRow values={aux.values ?? []} labelFor={labelFor} />
          <Visited visited={aux.visited} labelFor={labelFor} />
        </Block>
      )

    case 'queue':
      return (
        <Block>
          <ChipRow values={aux.values ?? []} labelFor={labelFor} />
          <Visited visited={aux.visited} labelFor={labelFor} />
        </Block>
      )

    case 'heap':
      return (
        <Block>
          <ChipRow
            values={aux.values ?? []}
            activeIndices={aux.indices ?? []}
            showIndex
          />
        </Block>
      )

    case 'visited':
      return (
        <Block>
          <Visited visited={aux.visited} />
        </Block>
      )

    case 'recursion':
      return (
        <Block>
          {(aux.frameIds ?? []).length === 0 ? (
            <p className="text-sm text-muted">empty call stack</p>
          ) : (
            <ol className="flex flex-wrap items-center gap-1 text-sm">
              {(aux.frameIds ?? []).map((id, depth) => (
                <li
                  key={`${depth}-${id}`}
                  className="rounded border border-raised bg-base-deep px-2 py-0.5 font-mono text-xs text-ink"
                >
                  {aux.frameValues?.[depth] ?? id}
                  <span className="ml-1 text-[10px] text-muted">
                    {id} d{aux.frames?.[depth] ?? depth}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <Visited visited={aux.visited} />
        </Block>
      )

    case 'pointers':
      return (
        <Block>
          <ul className="flex flex-wrap gap-1.5">
            {(aux.pointers ?? []).map((pointer) => {
              const color =
                pointer.role === 'prev'
                  ? 'var(--color-info)'
                  : pointer.role === 'current'
                    ? 'var(--color-accent)'
                    : 'var(--color-warn)'
              return (
                <li
                  key={pointer.role}
                  className="rounded border border-raised bg-base-deep px-2 py-1 font-mono text-xs"
                  style={{ color }}
                >
                  {pointer.role} → {pointer.id ?? 'null'}
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-muted">
            The three named variables from the standard in-place walk. A badge
            over a node in the structure view is the same pointer.
          </p>
        </Block>
      )
  }
}

/**
 * Graph-specific frontier view. The generic chip row showed the queue/stack but
 * not what it meant; this makes the three learner distinctions explicit:
 * processing now, waiting in the frontier, and already visited.
 */
function GraphFrontier({
  aux,
  activeId,
  edges,
  labelFor,
}: {
  aux: AuxState
  activeId?: string
  edges?: readonly TraceEdge[]
  labelFor?: (id: string) => string
}) {
  const isQueue = aux.kind === 'queue'
  const values = aux.values ?? []
  const discovered = aux.visited ?? []
  const queued = new Set(values.map((value) => String(value)))
  const dequeued = discovered.filter((id) => !queued.has(id) && id !== activeId)
  const edge = edges?.[0]
  const display = (id: string | number): string =>
    labelFor?.(String(id)) ?? String(id)

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <TraversalStat
          label="Processing now"
          value={activeId === undefined ? '—' : display(activeId)}
          tone="accent"
        />
        <TraversalStat
          label="Examining edge"
          value={
            edge === undefined
              ? '—'
              : `${display(edge.from)} → ${display(edge.to)}`
          }
          tone="orange"
        />
      </div>

      <div>
        <p className="mb-1 text-[10px] font-medium text-muted">
          {isQueue ? 'Queue' : 'Stack'}{' '}
          <span className="font-normal">
            ({isQueue ? 'front → back' : 'bottom → top'})
          </span>
        </p>
        {values.length === 0 ? (
          <p className="text-xs text-muted">empty — the frontier has drained</p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] tracking-wide text-subtle uppercase">
              {isQueue ? 'front' : 'bottom'}
            </span>
            <ChipRow values={values} labelFor={labelFor} />
            <span className="text-[9px] tracking-wide text-subtle uppercase">
              {isQueue ? 'back' : 'top'}
            </span>
          </div>
        )}
      </div>

      <div>
        <p className="mb-1 text-[10px] font-medium text-muted">
          {isQueue ? 'Discovered order' : 'Visited order'}
        </p>
        <NumberedVisited values={discovered} labelFor={labelFor} />
      </div>

      {isQueue && (
        <div>
          <p className="mb-1 text-[10px] font-medium text-muted">
            Already visited
          </p>
          {dequeued.length === 0 ? (
            <p className="text-xs text-muted">none yet</p>
          ) : (
            <ChipRow values={dequeued} labelFor={labelFor} />
          )}
        </div>
      )}

      <p className="text-[11px] leading-4 text-muted">
        {isQueue
          ? 'Amber nodes are discovered and waiting in the queue. Teal is being processed now. Green nodes have left the queue and been visited.'
          : 'Amber nodes are on the stack. Teal is being processed now. Green nodes have been popped and visited.'}
      </p>
    </div>
  )
}

function TraversalStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'accent' | 'orange'
}) {
  return (
    <div className="min-w-0 rounded border border-line bg-base-deep/60 px-2 py-1.5">
      <p className="text-[9px] text-muted">{label}</p>
      <p
        className={`truncate font-mono text-sm font-semibold ${
          tone === 'accent' ? 'text-accent' : 'text-[var(--color-orange)]'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function NumberedVisited({
  values,
  labelFor,
}: {
  values: readonly string[]
  labelFor?: (id: string) => string
}) {
  if (values.length === 0) {
    return <p className="text-xs text-muted">none yet</p>
  }
  return (
    <ol className="flex flex-wrap gap-1.5">
      {values.map((id, index) => (
        <li
          key={`${id}-${index}`}
          className="inline-flex items-center gap-1 rounded border border-raised bg-base-deep px-1.5 py-0.5"
        >
          <span className="font-mono text-xs text-ink">
            {labelFor?.(id) ?? id}
          </span>
          <span className="text-[9px] tabular-nums text-muted">
            #{index + 1}
          </span>
        </li>
      ))}
    </ol>
  )
}

function Block({ children }: { children: ReactNode }) {
  return <div className="space-y-2">{children}</div>
}

function ChipRow({
  values,
  activeIndices = [],
  showIndex = false,
  labelFor,
}: {
  values: readonly (string | number)[]
  activeIndices?: readonly number[]
  showIndex?: boolean
  labelFor?: (id: string) => string
}) {
  if (values.length === 0) {
    return <p className="text-sm text-muted">empty</p>
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {values.map((value, position) => {
        const isActive = activeIndices.includes(position)
        return (
          <li
            key={`${position}-${String(value)}`}
            className={`rounded border px-2 py-1 font-mono text-sm ${
              isActive
                ? 'border-accent bg-accent/20 text-accent'
                : 'border-raised bg-base-deep text-ink'
            }`}
            aria-current={isActive ? 'true' : undefined}
          >
            {labelFor?.(String(value)) ?? String(value)}
            {showIndex && (
              <span className="ml-1 text-[10px] text-muted">[{position}]</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** The traversal/extract result so far, rendered as a growing value sequence. */
function Output({ values }: { values: readonly (string | number)[] }) {
  return (
    <div className="mt-2 border-t border-line pt-2">
      <p className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
        output
      </p>
      <ChipRow values={values} />
    </div>
  )
}

function Visited({
  visited,
  labelFor,
}: {
  visited: readonly string[] | undefined
  labelFor?: (id: string) => string
}) {
  if (visited === undefined || visited.length === 0) {
    return <p className="text-xs text-muted">visited: none yet</p>
  }
  return (
    <p className="text-xs text-ink-dim">
      visited:{' '}
      <span className="font-mono">
        {visited.map((id) => labelFor?.(id) ?? id).join(' → ')}
      </span>
    </p>
  )
}
