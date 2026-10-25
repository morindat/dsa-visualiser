import { useEffect, useRef } from 'react'
import { CloseIcon } from '../icons'

const SHORTCUTS: readonly { keys: string[]; action: string }[] = [
  { keys: ['Space'], action: 'Play or pause' },
  { keys: ['→', 'N'], action: 'Next step' },
  { keys: ['←', 'P'], action: 'Previous step' },
  { keys: ['R'], action: 'Restart the trace' },
  { keys: ['Home'], action: 'Jump to the first step' },
  { keys: ['End'], action: 'Jump to the last step' },
  { keys: ['1', '2', '3'], action: 'Answer a practice question' },
  { keys: ['↵'], action: 'Continue after answering' },
  { keys: ['?'], action: 'Open this shortcut list' },
  { keys: ['Esc'], action: 'Close the tour or this dialog' },
]

export type ShortcutsDialogProps = {
  onClose(): void
}

export function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-scrim p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="w-full max-w-md rounded-xl border border-line bg-surface p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-center gap-2">
          <h2
            id="shortcuts-title"
            className="text-[15px] font-semibold tracking-tight text-ink"
          >
            Keyboard shortcuts
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close shortcut list"
            className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-raised hover:text-ink"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <dl className="divide-y divide-line">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.action}
              className="flex items-center justify-between gap-3 py-1.5"
            >
              <dt className="text-[12px] text-ink-dim">{shortcut.action}</dt>
              <dd className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key) => (
                  <kbd key={key} className="kbd">
                    {key}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-3 text-[11px] text-subtle">
          Shortcuts are ignored while you are typing in an input or textarea.
        </p>
      </div>
    </div>
  )
}
