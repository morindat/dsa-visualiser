/**
 * ValidationFeedback — renders a validation report as per-token chips.
 *
 * WHAT IT DOES
 *   Takes the `tokens` of a `ValidationReport` (or a `GraphValidationReport`, which
 *   uses the same token shape) and shows every token with its status and, when
 *   there is one, its reason. It also shows the accepted preview and the
 *   batch-level `error` for ER3/ER8.
 *
 * WHY THIS FILE EXISTS
 *   A1 FR5 asks for "per-token status chips and a preview of the dataset that will
 *   be used", and FR6 asks that *every* token be reported, not just the first.
 *   Keeping that rendering in one presentational component means the list, BST,
 *   heap and graph guides all show validation the same way, and a new structure
 *   needs no new feedback UI — only a new validator call.
 *
 * RULES
 *   Presentational only: it renders the report it is given and recomputes nothing
 *   from the raw text. No step index, no timer, no algorithm. Colour is never the
 *   only signal — each chip also carries the status word and, for a skip or a
 *   rejection, the reason (NFR-U2).
 */

import type { TokenReport, TokenStatus } from '../../app/validate'

export type ValidationFeedbackProps = {
  tokens: readonly TokenReport[]
  /** Batch-level message (ER3 / ER8): nothing usable, or over the cap. */
  error?: string
  /** The values that will actually be used, shown as the dataset preview. */
  preview?: readonly (string | number)[]
  previewLabel?: string
}

const CHIP: Record<TokenStatus, string> = {
  accepted: 'border-good/50 bg-good/15 text-good',
  ignored: 'border-warn/50 bg-warn/15 text-warn',
  rejected: 'border-bad/50 bg-bad/15 text-bad',
}

/** The word shown on the chip, so the status does not rely on colour. */
const STATUS_WORD: Record<TokenStatus, string> = {
  accepted: 'accepted',
  ignored: 'skipped',
  rejected: 'rejected',
}

export function ValidationFeedback({
  tokens,
  error,
  preview,
  previewLabel = 'Will use',
}: ValidationFeedbackProps) {
  const hasPreview = preview !== undefined && preview.length > 0

  if (tokens.length === 0 && error === undefined && !hasPreview) return null

  return (
    <div className="mt-3 space-y-2" aria-live="polite">
      {error !== undefined && (
        <p
          role="alert"
          className="rounded-md border border-bad/40 bg-bad/10 px-2 py-1.5 text-sm text-bad"
        >
          {error}
        </p>
      )}

      {tokens.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {tokens.map((token, position) => (
            <li key={`${position}-${token.token}`}>
              <span
                className={`inline-flex items-baseline gap-1.5 rounded border px-2 py-0.5 text-xs ${CHIP[token.status]}`}
              >
                <span className="font-mono">{token.token}</span>
                <span className="text-[10px] tracking-wide uppercase">
                  {STATUS_WORD[token.status]}
                </span>
              </span>
              {token.reason !== undefined && (
                <span className="ml-1.5 text-xs text-muted">
                  {token.reason}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasPreview && (
        <p className="text-xs text-ink-dim">
          {previewLabel}:{' '}
          <span className="font-mono text-ink">
            {preview.map(String).join(', ')}
          </span>{' '}
          <span className="text-muted">({preview.length} value(s))</span>
        </p>
      )}
    </div>
  )
}
