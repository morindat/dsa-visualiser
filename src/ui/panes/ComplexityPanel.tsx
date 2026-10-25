/**
 * ComplexityPanel — the theoretical bound next to the observed run.
 *
 * WHAT IT DOES
 *   Shows the `OperationMeta` bounds (best / average / worst / space) beside the
 *   observed step count and comparison count, so a degenerate input actually
 *   teaches something.
 *
 * WHY THIS FILE EXISTS
 *   `FR11` requires the bound and the observation side by side. Because both come
 *   from one catalogue record and one trace summary, a missing bound is a visible
 *   gap rather than a silent omission.
 *
 * RULES
 *   Read-only. No algorithm state, no timer. Styling uses the semantic tokens in
 *   `src/index.css`.
 */

import type { GenerateSummary } from '../../core/trace/step'
import type { OperationMeta } from '../../data/catalogue'

export type ComplexityPanelProps = {
  meta: OperationMeta | undefined
  summary: GenerateSummary | null
  index: number
  total: number
}

export function ComplexityPanel({
  meta,
  summary,
  index,
  total,
}: ComplexityPanelProps) {
  return (
    <section
      aria-label="Complexity"
      data-tour="complexity"
      className="rounded-lg border border-line bg-surface p-3"
    >
      <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-muted">
        Complexity
      </h2>

      {meta === undefined ? (
        <p className="text-sm text-muted">No operation selected.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-ink">
            <dt className="text-muted">best</dt>
            <dd>{meta.best}</dd>
            <dt className="text-muted">average</dt>
            <dd>{meta.average}</dd>
            <dt className="text-muted">worst</dt>
            <dd>{meta.worst}</dd>
            <dt className="text-muted">space</dt>
            <dd>{meta.space}</dd>
            <dt className="text-muted">observed</dt>
            <dd>
              {total} steps · {summary?.comparisons ?? 0} comparisons
            </dd>
            <dt className="text-muted">step</dt>
            <dd>{total === 0 ? '—' : `${index + 1} / ${total}`}</dd>
          </dl>
          {meta.assumptions.map((assumption) => (
            <p key={assumption} className="mt-2 text-xs text-muted">
              {assumption}
            </p>
          ))}
        </>
      )}
    </section>
  )
}
