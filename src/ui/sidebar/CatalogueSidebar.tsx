/**
 * CatalogueSidebar — navigation over the structure catalogue.
 *
 * WHAT IT DOES
 *   Lists the structures and their operations; both are selectable, and the current
 *   structure and operation are marked. Selecting a structure shows its first
 *   operation by default.
 *
 * WHY THIS FILE EXISTS
 *   The catalogue is the entry point for the whole app, and it is static versioned
 *   data — the sidebar reads it and never fetches anything (NFR-Se1). It is also
 *   where a new structure appears once its catalogue record exists, and where a new
 *   operation appears once its `OperationMeta` is authored.
 *
 * RULES
 *   No algorithm state, no step index, no timer. It only reports selections upward.
 *   Styling uses the semantic tokens in `src/index.css`.
 */

import { getOperationMeta } from '../../app/catalogue'
import type { CatalogueEntry } from '../../data/catalogue'

export type CatalogueSidebarProps = {
  entries: readonly CatalogueEntry[]
  selectedId: string | null
  selectedOperationId: string | null
  onSelect(id: string): void
  onSelectOperation(id: string): void
}

const MONOGRAM: Record<string, string> = {
  list: 'LL',
  stack: 'ST',
  heap: 'PQ',
  bst: 'BT',
  graph: 'GR',
}

export function CatalogueSidebar({
  entries,
  selectedId,
  selectedOperationId,
  onSelect,
  onSelectOperation,
}: CatalogueSidebarProps) {
  return (
    <nav
      aria-label="Structures"
      data-tour="sidebar"
      className="flex h-full flex-col"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <h2 className="text-[11px] font-semibold tracking-wide text-muted">
          Structures
        </h2>
        <span className="font-mono text-[10px] text-subtle">
          {entries.length}
        </span>
      </div>

      <ul className="space-y-1">
        {entries.map((entry) => {
          const isSelected = entry.id === selectedId
          return (
            <li key={entry.id}>
              <button
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => onSelect(entry.id)}
                className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[13px] transition-colors ${
                  isSelected
                    ? 'border-accent/45 bg-accent/10 font-medium text-accent'
                    : 'border-transparent text-ink-dim hover:border-line hover:bg-raised hover:text-ink'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[9px] font-semibold ${
                    isSelected
                      ? 'border-accent/40 bg-accent/15 text-accent'
                      : 'border-line bg-base-deep text-muted'
                  }`}
                >
                  {MONOGRAM[entry.id] ?? entry.label.slice(0, 2).toUpperCase()}
                </span>
                {entry.label}
              </button>

              {isSelected && (
                <ul
                  data-tour="operations"
                  className="mt-1 ml-3.5 space-y-0.5 border-l border-line pl-2"
                >
                  {entry.operations.map((operationId) => {
                    const isCurrent = operationId === selectedOperationId
                    return (
                      <li key={operationId}>
                        <button
                          type="button"
                          aria-current={isCurrent ? 'true' : undefined}
                          onClick={() => {
                            onSelect(entry.id)
                            onSelectOperation(operationId)
                          }}
                          className={`w-full rounded px-1.5 py-1 text-left text-[12px] transition-colors ${
                            isCurrent
                              ? 'bg-accent/10 font-medium text-accent'
                              : 'text-muted hover:bg-raised hover:text-ink-dim'
                          }`}
                        >
                          {getOperationMeta(operationId)?.label ?? operationId}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      <p className="mt-auto px-1 pt-3 text-[10px] leading-4 text-subtle">
        Selecting a structure loads its preset. Choose an operation, then edit
        the inputs in the guide.
      </p>
    </nav>
  )
}
