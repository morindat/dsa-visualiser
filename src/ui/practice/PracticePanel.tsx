/**
 * PracticePanel — predict the next step before advancing.
 *
 * The quiz is generated from the next trace step (`app/practice.ts`), so it can
 * never disagree with what playback will do. Answering is optional in the sense
 * that practice can be switched off at any time, but while it is on the Next
 * action is gated until the current question has an answer.
 */

import { useEffect, useState } from 'react'
import type { Prediction } from '../../app/practice'
import { ArrowRightIcon, CheckIcon, CloseIcon, TargetIcon } from '../icons'

export type PracticeScore = {
  correct: number
  answered: number
}

export type PracticePanelProps = {
  prediction: Prediction | null
  score: PracticeScore
  /** A nudge appears when Next was pressed before answering. */
  nudge: boolean
  onAnswer(correct: boolean): void
  onContinue(): void
  onRestart(): void
  onExit(): void
}

const OPTION =
  'flex h-full w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-[13px] leading-5 transition-colors'

export function PracticePanel({
  prediction,
  score,
  nudge,
  onAnswer,
  onContinue,
  onRestart,
  onExit,
}: PracticePanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const revealed = selectedId !== null
  const correctOption = prediction?.options.find((option) => option.correct)
  const selectedIsCorrect =
    prediction !== null &&
    selectedId !== null &&
    selectedId === prediction.correctId

  const answer = (optionId: string): void => {
    if (prediction === null || revealed) return
    setSelectedId(optionId)
    onAnswer(optionId === prediction.correctId)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true
      ) {
        return
      }

      if (revealed) {
        if (event.key === 'Enter') {
          event.preventDefault()
          onContinue()
        }
        return
      }

      if (prediction === null) return
      const position = Number(event.key) - 1
      const option = prediction.options[position]
      if (Number.isInteger(position) && option !== undefined) {
        event.preventDefault()
        answer(option.id)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <section
      aria-label="Practice prediction"
      className={`border-t border-line px-4 py-3 ${
        nudge ? 'bg-warn/10' : 'bg-base-deep/35'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
          <TargetIcon size={12} />
          Practice
        </span>
        <span className="font-mono text-[11px] tabular-nums text-muted">
          score {score.correct} / {score.answered}
        </span>
        <button
          type="button"
          onClick={onExit}
          className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-raised hover:text-ink"
        >
          <CloseIcon size={11} />
          Exit practice
        </button>
      </div>

      {prediction === null ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink">
            End of the trace. Final score{' '}
            <span className="font-mono font-semibold text-accent">
              {score.correct} / {score.answered}
            </span>
            .
          </p>
          <button
            type="button"
            onClick={onRestart}
            className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-raised"
          >
            Restart practice
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-ink">{prediction.question}</p>
          <div className="mt-2 grid auto-rows-fr gap-2 sm:grid-cols-3">
            {prediction.options.map((option, position) => {
              const isSelected = option.id === selectedId
              const isCorrect = revealed && option.correct
              const isWrong = revealed && isSelected && !option.correct
              const tone = isCorrect
                ? 'border-good/60 bg-good/15 text-good'
                : isWrong
                  ? 'border-bad/60 bg-bad/15 text-bad'
                  : revealed
                    ? 'border-line bg-surface/40 text-muted'
                    : 'border-line bg-surface text-ink hover:border-accent/50 hover:bg-raised'
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={revealed}
                  onClick={() => answer(option.id)}
                  aria-pressed={isSelected}
                  className={`${OPTION} ${tone} disabled:cursor-default`}
                >
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line bg-base-deep font-mono text-[10px] text-muted">
                    {position + 1}
                  </span>
                  <span className="min-w-0 flex-1">{option.text}</span>
                  {isCorrect && (
                    <CheckIcon size={13} className="ml-auto shrink-0" />
                  )}
                  {isWrong && (
                    <CloseIcon size={13} className="ml-auto shrink-0" />
                  )}
                </button>
              )
            })}
          </div>

          {revealed && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p
                role="status"
                className={`text-xs ${
                  selectedIsCorrect ? 'text-good' : 'text-ink-dim'
                }`}
              >
                {selectedIsCorrect
                  ? 'Correct — that is the next step.'
                  : `Not quite. The next step is: ${correctOption?.text ?? ''}`}
              </p>
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink hover:bg-accent-strong"
              >
                Continue
                <ArrowRightIcon size={13} />
              </button>
            </div>
          )}

          {!revealed && nudge && (
            <p className="mt-2 text-[11px] text-warn">
              Answer the question first, then step on.
            </p>
          )}

          <p className="mt-2 text-[10px] text-subtle">
            Press <span className="kbd">1</span> <span className="kbd">2</span>{' '}
            <span className="kbd">3</span> to answer,{' '}
            <span className="kbd">↵</span> to continue.
          </p>
        </>
      )}
    </section>
  )
}
