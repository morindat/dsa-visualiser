import { useCallback, useSyncExternalStore } from 'react'

/**
 * A tiny matchMedia hook. `useSyncExternalStore` is used instead of a state
 * effect because the media query is an external store: this keeps the first
 * render correct and avoids a second render just to install the listener.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      if (typeof window === 'undefined') return () => {}
      if (typeof window.matchMedia !== 'function') return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  const getSnapshot = useCallback((): boolean => {
    if (typeof window === 'undefined') return false
    if (typeof window.matchMedia !== 'function') return false
    return window.matchMedia(query).matches
  }, [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
