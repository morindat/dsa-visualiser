import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { ArrowRightIcon, CloseIcon } from '../icons'

type TourPlacement = 'right' | 'left' | 'top' | 'bottom' | 'center'
type TourGroup = 'choose' | 'configure' | 'explore' | 'tools'

type TourStep = {
  id: string
  target: string | null
  placement: TourPlacement
  group: TourGroup
  title: string
  body: string
}

const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'catalogue',
    target: '[data-tour="sidebar"]',
    placement: 'right',
    group: 'choose',
    title: '1 · Pick a data structure',
    body: 'The catalogue holds the following structures — linked list, stack, priority queue, binary search tree and graph. Selecting one loads a representative preset and its operations.',
  },
  {
    id: 'operation',
    target: '[data-tour="operations"]',
    placement: 'right',
    group: 'choose',
    title: '2 · Choose an operation',
    body: 'Each structure exposes its own operations. Picking one loads the matching pseudocode and complexity card before anything runs, so you can see what will happen.',
  },
  {
    id: 'inputs',
    target: '[data-tour="preset"]',
    placement: 'bottom',
    group: 'configure',
    title: '3 · Start from a preset, or type your own',
    body: 'A preset fills the same fields a user would type into, so both go through identical validation. Every rejected token is listed with a reason; nothing malformed reaches the algorithm.',
  },
  {
    id: 'visualise',
    target: '[data-tour="visualise"]',
    placement: 'right',
    group: 'configure',
    title: '4 · Visualise',
    body: 'The pipeline validates, builds the structure and generates the full trace up front. Playback is then pure step arithmetic, which is why scrubbing backwards is instant.',
  },
  {
    id: 'stage',
    target: '[data-tour="stage"]',
    placement: 'left',
    group: 'explore',
    title: '5 · This is the stage',
    body: 'The structure fills the main panel. The narration now lives inside the stage, directly above the transport bar, so the explanation is always next to the picture.',
  },
  {
    id: 'controls',
    target: '[data-tour="controls"]',
    placement: 'top',
    group: 'explore',
    title: '6 · Drive the trace',
    body: 'Play, step, scrub, restart and change speed here. Keyboard: Space plays or pauses, ← / P steps back, → / N steps forward, R restarts, Home / End jump to the bounds.',
  },
  {
    id: 'code',
    target: '[data-tour="pseudocode"]',
    placement: 'left',
    group: 'explore',
    title: '7 · Read the algorithm',
    body: 'The highlighted line is the instruction executing at this step. Below it, the auxiliary state shows the algorithm’s own stack, queue, heap or call frames, and the complexity card compares the theory with the observed run.',
  },
  {
    id: 'tools',
    target: '[data-tour="toolbar-tools"]',
    placement: 'bottom',
    group: 'tools',
    title: '8 · Practice, share and theme',
    body: 'Practice mode asks you to predict the next step before advancing. Share copies a link that restores this exact run and step. The sun/moon button switches light and dark.',
  },
]

const GROUP_LABEL: Record<TourGroup, string> = {
  choose: 'Choose',
  configure: 'Configure',
  explore: 'Explore',
  tools: 'Tools',
}

const GROUPS: readonly TourGroup[] = ['choose', 'configure', 'explore', 'tools']

const TOOLTIP_WIDTH = 360

type Rect = {
  left: number
  top: number
  width: number
  height: number
  right: number
  bottom: number
}

function toRect(domRect: DOMRect): Rect {
  return {
    left: domRect.left,
    top: domRect.top,
    width: domRect.width,
    height: domRect.height,
    right: domRect.right,
    bottom: domRect.bottom,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export type TourOverlayProps = {
  onClose(): void
}

export function TourOverlay({ onClose }: TourOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [tooltipHeight, setTooltipHeight] = useState(240)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const step = TOUR_STEPS[stepIndex]
  const lastIndex = TOUR_STEPS.length - 1
  const isCompact = useMediaQuery('(max-width: 1023px)')
  // On a phone the spotlight would often point at an off-screen drawer, so the
  // same tour becomes a centred sequence with the minimap still visible.
  const targetSelector = isCompact ? null : step.target

  const measure = useCallback(() => {
    if (targetSelector === null) {
      setRect(null)
      return
    }
    const target = document.querySelector(targetSelector)
    if (target === null) {
      setRect(null)
      return
    }
    setRect(toRect(target.getBoundingClientRect()))
  }, [targetSelector])

  useEffect(() => {
    const target =
      targetSelector === null ? null : document.querySelector(targetSelector)
    if (target !== null) {
      target.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
    }

    // `measure` schedules the state update through rAF, so no state is set
    // synchronously inside this effect.
    let frame = requestAnimationFrame(measure)
    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(measure)
    }, 220)

    const onViewportChange = (): void => measure()
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
    }
  }, [measure, targetSelector])

  useLayoutEffect(() => {
    const height = tooltipRef.current?.offsetHeight ?? 240
    setTooltipHeight(height)
  }, [stepIndex, rect])

  useEffect(() => {
    tooltipRef.current?.focus()
  }, [stepIndex])

  const goNext = useCallback(() => {
    setStepIndex((current) => (current >= lastIndex ? current : current + 1))
  }, [lastIndex])

  const goBack = useCallback(() => {
    setStepIndex((current) => (current <= 0 ? 0 : current - 1))
  }, [])

  const finish = useCallback(() => {
    onClose()
  }, [onClose])

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      finish()
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      if (stepIndex === lastIndex) finish()
      else goNext()
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goBack()
      return
    }
    if (event.key !== 'Tab') return

    // Small focus trap: two/three buttons live in the tooltip.
    const focusables = tooltipRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled])',
    )
    if (focusables === undefined || focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth
  const viewportHeight =
    typeof window === 'undefined' ? 800 : window.innerHeight

  let tooltipLeft = (viewportWidth - TOOLTIP_WIDTH) / 2
  let tooltipTop = (viewportHeight - tooltipHeight) / 2

  if (rect !== null) {
    switch (step.placement) {
      case 'right':
        tooltipLeft = rect.right + 16
        tooltipTop = rect.top + rect.height / 2 - tooltipHeight / 2
        if (tooltipLeft + TOOLTIP_WIDTH > viewportWidth - 12) {
          tooltipLeft = rect.left - TOOLTIP_WIDTH - 16
        }
        break
      case 'left':
        tooltipLeft = rect.left - TOOLTIP_WIDTH - 16
        tooltipTop = rect.top + rect.height / 2 - tooltipHeight / 2
        if (tooltipLeft < 12) {
          tooltipLeft = rect.right + 16
        }
        break
      case 'bottom':
        tooltipLeft = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2
        tooltipTop = rect.bottom + 16
        break
      case 'top':
        tooltipLeft = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2
        tooltipTop = rect.top - tooltipHeight - 16
        if (tooltipTop < 12) {
          tooltipTop = rect.bottom + 16
        }
        break
      case 'center':
        break
    }
  }

  tooltipLeft = clamp(tooltipLeft, 12, viewportWidth - TOOLTIP_WIDTH - 12)
  tooltipTop = clamp(tooltipTop, 12, viewportHeight - tooltipHeight - 12)

  return (
    <div className="fixed inset-0 z-[70]">
      <div aria-hidden="true" className="absolute inset-0" />
      {rect !== null && (
        <div
          aria-hidden="true"
          className="tour-spotlight pointer-events-none fixed z-[71] border-2 border-accent bg-transparent"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={{
          left: tooltipLeft,
          top: tooltipTop,
          width: `min(${TOOLTIP_WIDTH}px, calc(100vw - 24px))`,
        }}
        className="fixed z-[72] rounded-xl border border-line bg-surface p-4 shadow-2xl outline-none"
      >
        <div className="mb-3 flex items-center gap-2">
          {GROUPS.map((group, index) => {
            const active = group === step.group
            return (
              <div key={group} className="flex flex-1 flex-col gap-1">
                <span
                  className={`h-1 rounded-full ${
                    active ? 'bg-accent' : 'bg-line'
                  }`}
                />
                <span
                  className={`text-[9px] font-medium ${
                    active ? 'text-accent' : 'text-subtle'
                  }`}
                >
                  {index + 1} {GROUP_LABEL[group]}
                </span>
              </div>
            )
          })}
          <button
            type="button"
            onClick={finish}
            aria-label="Close tour"
            className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted hover:bg-raised hover:text-ink"
          >
            <CloseIcon size={13} />
          </button>
        </div>

        <h2
          id="tour-title"
          className="text-balance text-[15px] font-semibold tracking-tight text-ink"
        >
          {step.title}
        </h2>
        <p
          id="tour-body"
          className="mt-1.5 text-[12.5px] leading-6 text-ink-dim"
        >
          {step.body}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <span className="font-mono text-[10px] tabular-nums text-subtle">
            {stepIndex + 1} / {TOUR_STEPS.length}
          </span>
          <button
            type="button"
            onClick={finish}
            className="rounded-md px-2 py-1 text-[11px] text-muted hover:bg-raised hover:text-ink"
          >
            Skip tour
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className="rounded-md border border-line bg-base-deep px-2.5 py-1 text-[11px] font-medium text-ink-dim hover:bg-raised disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={stepIndex === lastIndex ? finish : goNext}
              className="inline-flex items-center gap-1 rounded-md border border-accent bg-accent px-3 py-1 text-[11px] font-semibold text-accent-ink hover:bg-accent-strong"
            >
              {stepIndex === lastIndex ? 'Start exploring' : 'Next'}
              {stepIndex !== lastIndex && <ArrowRightIcon size={12} />}
            </button>
          </div>
        </div>

        <p className="mt-2 text-right text-[9px] text-subtle">
          <span className="kbd">←</span> <span className="kbd">→</span> move ·{' '}
          <span className="kbd">Esc</span> exit
        </p>
      </div>
    </div>
  )
}
