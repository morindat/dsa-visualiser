/**
 * StepAnnouncer — the ARIA live region that describes each step.
 *
 * WHAT IT DOES
 *   Renders visually-hidden text that updates with the current step index and
 *   narration, so a screen-reader user hears the same thing a sighted user sees as
 *   the index changes.
 *
 * WHY THIS FILE EXISTS
 *   Step changes must be announced, not only drawn (`NFR-U2`, WCAG 2.1 AA). It is
 *   driven by the same `(trace, index)` values as the panes, so it can never
 *   disagree with what is on screen.
 *
 * RULES
 *   No state, no timer. The region is `polite` so it does not interrupt playback
 *   announcements.
 */

export type StepAnnouncerProps = {
  index: number
  total: number
  narration: string
}

export function StepAnnouncer({ index, total, narration }: StepAnnouncerProps) {
  return (
    <p aria-live="polite" role="status" className="sr-only">
      {total === 0
        ? 'No trace loaded yet.'
        : `Step ${index + 1} of ${total}. ${narration}`}
    </p>
  )
}
