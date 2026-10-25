/**
 * Predict-the-next-step practice — a deterministic quiz builder over a trace.
 *
 * The correct answer is always `trace[index + 1].narration`, so the practice mode
 * cannot drift from what the visualiser is about to do. Two distractors are drawn
 * from other steps in the same trace, with fixed fallbacks for short traces.
 * Shuffling is seeded by the step index, so the same run always presents the same
 * options (NFR-C2).
 */

import type { Step } from '../core/trace/step'

export type PredictionOption = {
  id: string
  text: string
  correct: boolean
}

export type Prediction = {
  question: string
  options: PredictionOption[]
  correctId: string
  nextIndex: number
}

const FALLBACK_DISTRACTORS = [
  'The operation stops here because it is complete.',
  'The structure is rebuilt from the original input.',
  'A comparison is made and the active pointer stays where it is.',
  'A new node is created but not linked into the structure yet.',
]

/** Small deterministic LCG, used only for option order. */
function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items]
  let state = seed >>> 0 || 1
  const next = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 2 ** 32
  }
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function buildPrediction(
  trace: readonly Step[],
  index: number,
): Prediction | null {
  if (index < 0 || index >= trace.length - 1) return null

  const next = trace[index + 1]
  const correctText = next.narration.trim()
  if (correctText.length === 0) return null

  const alternatives: string[] = []
  for (let i = 0; i < trace.length; i += 1) {
    if (i === index || i === index + 1) continue
    const text = trace[i].narration.trim()
    if (
      text.length > 0 &&
      text !== correctText &&
      !alternatives.includes(text)
    ) {
      alternatives.push(text)
    }
  }

  const distractors: string[] = []
  if (alternatives.length > 0) {
    const start = (index * 7 + 3) % alternatives.length
    for (let offset = 0; offset < alternatives.length; offset += 1) {
      const candidate = alternatives[(start + offset) % alternatives.length]
      if (!distractors.includes(candidate)) distractors.push(candidate)
      if (distractors.length === 2) break
    }
  }
  for (const fallback of FALLBACK_DISTRACTORS) {
    if (distractors.length === 2) break
    if (fallback !== correctText && !distractors.includes(fallback)) {
      distractors.push(fallback)
    }
  }

  // Index 0 is always the correct answer before the shuffle.
  const candidates = [correctText, ...distractors]
  const shuffled = seededShuffle(candidates, index + trace.length)
  const options = shuffled.map((text, optionIndex) => ({
    id: `option-${optionIndex}`,
    text,
    correct: text === correctText,
  }))
  const correctOption = options.find((option) => option.correct)
  if (correctOption === undefined) return null

  return {
    question: 'Which of these happens on the next step?',
    options,
    correctId: correctOption.id,
    nextIndex: index + 1,
  }
}
