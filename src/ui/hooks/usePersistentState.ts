import { useCallback, useState } from 'react'

/**
 * A small localStorage-backed state hook for layout preferences (NFR-U1:
 * panel collapse should be remembered). Storage failures are non-fatal — the
 * value simply falls back to the in-memory default.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((previous: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  const setPersistent = useCallback(
    (next: T | ((previous: T) => T)): void => {
      setValue((previous) => {
        const resolved =
          typeof next === 'function'
            ? (next as (current: T) => T)(previous)
            : next
        try {
          localStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          // Ignore quota/private-mode failures.
        }
        return resolved
      })
    },
    [key],
  )

  return [value, setPersistent]
}
