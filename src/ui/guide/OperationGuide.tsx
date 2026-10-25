/**
 * OperationGuide — guided entry for the selected operation.
 *
 * WHAT IT DOES
 *   Renders one field per input the operation's `OperationMeta.inputs` names and
 *   reports validation results. The algorithm is only reachable through the
 *   validation report, so a malformed token never becomes part of a structure
 *   (`ADR-7`, FR6). Which fields appear, and what they are called, comes from the
 *   catalogue — so the form and the pipeline cannot disagree about an operation's
 *   inputs.
 *
 * WHY THIS FILE EXISTS
 *   It is the single place where user text becomes typed values. The report lists
 *   every rejected token with a reason, rather than stopping at the first, so the
 *   learner can fix the whole input in one pass. A preset fills the same fields a
 *   user would type into, so presets take the identical validation path (FR5).
 *
 * COLLAPSE
 *   Once a run is loaded the full form is replaced by a one-line summary. The
 *   visualisation gets the vertical space, and "Edit inputs" brings the form back
 *   without losing the current trace.
 *
 * RULES
 *   Only reports edits — the parent owns the text. No step index, no timer, no
 *   algorithm. Styling uses the semantic tokens in `src/index.css`.
 */

import type { ValidationReport } from '../../app/validate'
import type { OperationInput, OperationMeta } from '../../data/catalogue'
import type { PresetDataset } from '../../data/presets'
import { ChevronDownIcon } from '../icons'
import { ValidationFeedback } from './ValidationFeedback'

export type OperationGuideProps = {
  structureId: string
  structureLabel: string
  operation: OperationMeta | undefined
  valuesText: string
  valueText: string
  positionText: string
  edgesText: string
  sourceText: string
  directed: boolean
  presets: readonly PresetDataset[]
  report: ValidationReport | null
  collapsed: boolean
  onToggle(): void
  onValuesChange(value: string): void
  onValueChange(value: string): void
  onPositionChange(value: string): void
  onEdgesChange(value: string): void
  onSourceChange(value: string): void
  onDirectedChange(value: boolean): void
  onPresetSelect(id: string): void
  onVisualise(): void
}

const FIELD =
  'w-full rounded-md border border-line bg-base-deep px-3 py-1.5 font-mono text-[13px] text-ink outline-none transition-colors placeholder:text-subtle focus:border-accent'

/** Field label per structure; the list wording is asserted by the app test. */
const VALUES_LABEL: Record<string, string> = {
  list: 'Initial values (list order)',
  stack: 'Initial stack values (bottom → top)',
  bst: 'Initial keys (insertion order)',
  heap: 'Heap array (array order)',
}

const VALUES_PLACEHOLDER: Record<string, string> = {
  list: '50, 30, 70',
  stack: '3, 1, 4, 1, 5',
  bst: '9, 5, 13, 3, 7',
  heap: '42, 7, 19, 3, 88',
}

function valueLabel(
  structureId: string,
  operationId: string | undefined,
): string {
  if (structureId === 'bst') {
    if (operationId === 'bstDelete') return 'Key to delete'
    if (operationId === 'bstSearch') return 'Key to search'
    return 'Key'
  }
  if (operationId === 'insertAtHead') return 'Value to insert at the head'
  if (operationId === 'stackPush') return 'Value to push'
  if (operationId === 'deleteByValue') return 'Value to delete'
  if (operationId === 'insertAt' || operationId === 'insertAtTail') {
    return 'Value to insert'
  }
  return 'Value'
}

/** One sentence of guidance under the button, per structure. */
function hint(structureId: string, inputs: readonly OperationInput[]): string {
  if (structureId === 'heap') {
    return 'Each value is appended and sifted up in turn; build-heap instead heapifies the raw array in O(n).'
  }
  if (inputs.includes('edges')) {
    return 'One edge per line: A-B or A-B:weight. The load is atomic — a bad line blocks it.'
  }
  if (structureId === 'bst') {
    return 'Sorted input degenerates the tree to a chain — that is the lesson.'
  }
  if (structureId === 'stack') {
    return 'The last value is the top. Push, pop and peek only touch that one end; an empty pop or peek returns null.'
  }
  if (inputs.includes('position')) {
    return 'Positions are 0-based: 0 inserts at the head, and a position past the end appends at the tail.'
  }
  return 'Leave the list empty to insert into an empty list.'
}

function summaryOf({
  inputs,
  valuesText,
  valueText,
  positionText,
  edgesText,
  sourceText,
  structureId,
  operationId,
}: {
  inputs: readonly OperationInput[]
  valuesText: string
  valueText: string
  positionText: string
  edgesText: string
  sourceText: string
  structureId: string
  operationId: string | undefined
}): string {
  const parts: string[] = []
  if (inputs.includes('values') && valuesText.trim().length > 0) {
    parts.push(valuesText.trim())
  }
  if (inputs.includes('value') && valueText.trim().length > 0) {
    parts.push(`${valueLabel(structureId, operationId)} ${valueText.trim()}`)
  }
  if (inputs.includes('position') && positionText.trim().length > 0) {
    parts.push(`position ${positionText.trim()}`)
  }
  if (inputs.includes('edges')) {
    const edgeCount = edgesText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0).length
    parts.push(`${edgeCount} edge${edgeCount === 1 ? '' : 's'}`)
  }
  if (inputs.includes('source') && sourceText.trim().length > 0) {
    parts.push(`source ${sourceText.trim()}`)
  }
  return parts.length === 0 ? 'no inputs yet' : parts.join(' · ')
}

export function OperationGuide({
  structureId,
  structureLabel,
  operation,
  valuesText,
  valueText,
  positionText,
  edgesText,
  sourceText,
  directed,
  presets,
  report,
  collapsed,
  onToggle,
  onValuesChange,
  onValueChange,
  onPositionChange,
  onEdgesChange,
  onSourceChange,
  onDirectedChange,
  onPresetSelect,
  onVisualise,
}: OperationGuideProps) {
  const inputs = operation?.inputs ?? []
  const heading = operation
    ? `Operation · ${operation.label}`
    : 'Operation · choose one'
  const invalid = report !== null && !report.ok
  const summary = summaryOf({
    inputs,
    valuesText,
    valueText,
    positionText,
    edgesText,
    sourceText,
    structureId,
    operationId: operation?.id,
  })

  if (collapsed) {
    return (
      <section
        data-tour="guide"
        aria-label="Inputs summary"
        className="rounded-lg border border-line bg-surface/70 px-3 py-2"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] font-medium text-muted">
            {structureLabel}
          </span>
          <h2 className="text-[13px] font-semibold text-ink">
            {operation?.label ?? 'Choose an operation'}
          </h2>
          <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted">
            {summary}
          </p>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded="false"
            className="inline-flex items-center gap-1 rounded-md border border-line bg-base-deep/60 px-2 py-1 text-[11px] font-medium text-ink-dim hover:border-accent/50 hover:text-accent"
          >
            Edit inputs
            <ChevronDownIcon size={11} />
          </button>
        </div>
      </section>
    )
  }

  return (
    <form
      data-tour="guide"
      aria-label="Operation inputs"
      className="rounded-lg border border-line bg-surface/70 p-3"
      onSubmit={(event) => {
        event.preventDefault()
        onVisualise()
      }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-muted">Inputs</p>
          <h2 className="truncate text-[13px] font-semibold text-ink">
            {heading}
          </h2>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {presets.length > 0 && (
            <label
              data-tour="preset"
              className="flex items-center gap-1.5 text-[11px] text-ink-dim"
            >
              Preset
              <select
                className="rounded-md border border-line bg-base-deep px-2 py-1 text-[11px] text-ink outline-none focus:border-accent"
                value=""
                onChange={(event) => {
                  if (event.target.value !== '')
                    onPresetSelect(event.target.value)
                }}
              >
                <option value="">Choose…</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded="true"
            className="inline-flex items-center gap-1 rounded-md border border-line bg-base-deep/60 px-2 py-1 text-[11px] font-medium text-ink-dim hover:border-line-strong hover:text-ink"
          >
            Hide inputs
            <ChevronDownIcon size={11} className="rotate-180" />
          </button>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {inputs.includes('values') && (
          <label className="flex flex-col gap-1 text-[11px] text-ink-dim">
            {VALUES_LABEL[structureId] ?? 'Values'}
            <input
              className={FIELD}
              value={valuesText}
              onChange={(event) => onValuesChange(event.target.value)}
              placeholder={VALUES_PLACEHOLDER[structureId] ?? '1, 2, 3'}
              aria-invalid={invalid}
            />
          </label>
        )}

        {inputs.includes('value') && (
          <label className="flex flex-col gap-1 text-[11px] text-ink-dim">
            {valueLabel(structureId, operation?.id)}
            <input
              className={FIELD}
              value={valueText}
              onChange={(event) => onValueChange(event.target.value)}
              placeholder="45"
              aria-invalid={invalid}
            />
          </label>
        )}

        {inputs.includes('position') && (
          <label className="flex flex-col gap-1 text-[11px] text-ink-dim">
            Position (0 = head)
            <input
              className={FIELD}
              value={positionText}
              onChange={(event) => onPositionChange(event.target.value)}
              placeholder="1"
              inputMode="numeric"
              aria-invalid={invalid}
            />
          </label>
        )}

        {inputs.includes('source') && (
          <label className="flex flex-col gap-1 text-[11px] text-ink-dim">
            Source vertex
            <input
              className={FIELD}
              value={sourceText}
              onChange={(event) => onSourceChange(event.target.value)}
              placeholder="A"
              aria-invalid={invalid}
            />
          </label>
        )}

        {inputs.includes('edges') && (
          <label className="flex flex-col gap-1 text-[11px] text-ink-dim sm:col-span-2">
            Edge list (one per line)
            <textarea
              className={`${FIELD} min-h-20 resize-y`}
              value={edgesText}
              onChange={(event) => onEdgesChange(event.target.value)}
              placeholder={'A-B\nB-C\nA-C'}
              aria-invalid={invalid}
            />
          </label>
        )}
      </div>

      {structureId === 'graph' && (
        <label className="mt-2 flex items-center gap-2 text-[11px] text-ink-dim">
          <input
            type="checkbox"
            checked={directed}
            onChange={(event) => onDirectedChange(event.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          Directed graph
        </label>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          data-tour="visualise"
          className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent px-4 py-1.5 text-[13px] font-semibold text-accent-ink hover:border-accent-strong hover:bg-accent-strong"
        >
          Visualise
        </button>
        <span className="text-[11px] text-muted">
          {hint(structureId, inputs)}
        </span>
      </div>

      <ValidationFeedback tokens={report?.tokens ?? []} error={report?.error} />
    </form>
  )
}
