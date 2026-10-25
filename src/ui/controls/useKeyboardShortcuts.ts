/**
 * useKeyboardShortcuts — the keyboard half of the controls.
 *
 * WHAT IT DOES
 *   Binds the transport keys to the *same* controller commands the buttons call:
 *
 *     Space            play / pause
 *     ← / p            previous step
 *     → / n            next step
 *     R                restart
 *     Home / End       first / last step
 *     ?                shortcuts help
 *     Escape           close the topmost overlay
 *
 * WHY THIS FILE EXISTS
 *   Keyboard parity is a requirement, not a nicety (`NFR-U2`). Sharing the code
 *   path is what makes the accessible route the real route rather than a parallel
 *   one.
 *
 * RULES
 *   Handlers are read through a ref that is refreshed every render, so the listener
 *   is attached once and never captures a stale index. Typing in an input, select,
 *   textarea or contenteditable is ignored. Space on a focused button is left to
 *   the button itself so the key does not fire twice.
 */

import { useEffect, useRef } from 'react'

export type ShortcutHandlers = {
  onTogglePlay(): void
  onStepForward(): void
  onStepBack(): void
  onRestart(): void
  onFirst?(): void
  onLast?(): void
  onHelp?(): void
  onEscape?(): void
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  const latest = useRef(handlers)

  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const tag = target?.tagName ?? ''
      if (TYPING_TAGS.has(tag) || target?.isContentEditable === true) return

      const ownsSpace =
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement

      switch (event.key) {
        case ' ':
          // A focused button or link owns Space (it activates itself).
          if (ownsSpace) return
          event.preventDefault()
          latest.current.onTogglePlay()
          break
        case 'ArrowRight':
        case 'n':
        case 'N':
          event.preventDefault()
          latest.current.onStepForward()
          break
        case 'ArrowLeft':
        case 'p':
        case 'P':
          event.preventDefault()
          latest.current.onStepBack()
          break
        case 'r':
        case 'R':
          event.preventDefault()
          latest.current.onRestart()
          break
        case 'Home':
          event.preventDefault()
          latest.current.onFirst?.()
          break
        case 'End':
          event.preventDefault()
          latest.current.onLast?.()
          break
        case '?':
          event.preventDefault()
          latest.current.onHelp?.()
          break
        case 'Escape':
          latest.current.onEscape?.()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
