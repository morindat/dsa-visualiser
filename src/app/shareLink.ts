/**
 * Shareable run links.
 *
 * A run is exactly the validated request the guide would have submitted plus the
 * step index. Encoding it in the query string means a demo can be reopened at the
 * exact step it was shared from, and a bug report can carry the exact input.
 *
 * This module is pure and DOM-free except for the optional `href` default, so the
 * encoding/decoding rules are unit-testable in Node.
 */

export const SHARE_VERSION = 1 as const

/**
 * The canonical public location a copied link should point at, so a share made
 * from a local dev server or a preview deployment still opens the live demo.
 */
export const SHARE_BASE_URL = 'https://dsa-vis.netlify.app/' as const

export type ShareableRun = {
  version: typeof SHARE_VERSION
  structureId: string
  operationId: string
  valuesText: string
  valueText: string
  positionText: string
  edgesText: string
  sourceText: string
  directed: boolean
  index: number
}

export type RunRequestState = Omit<ShareableRun, 'version' | 'index'>

export function toShareableRun(
  state: RunRequestState,
  index: number,
): ShareableRun {
  return {
    version: SHARE_VERSION,
    structureId: state.structureId,
    operationId: state.operationId,
    valuesText: state.valuesText,
    valueText: state.valueText,
    positionText: state.positionText,
    edgesText: state.edgesText,
    sourceText: state.sourceText,
    directed: state.directed,
    index: Math.max(0, Math.floor(index)),
  }
}

export function encodeRun(run: ShareableRun): string {
  return JSON.stringify(run)
}

/** Decodes a shared payload, returning `null` for anything malformed. */
export function decodeRun(raw: string | null): ShareableRun | null {
  if (raw === null || raw.length === 0) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ShareableRun>
    if (parsed.version !== SHARE_VERSION) return null
    if (typeof parsed.structureId !== 'string' || parsed.structureId === '') {
      return null
    }
    if (typeof parsed.operationId !== 'string' || parsed.operationId === '') {
      return null
    }
    const strings = [
      parsed.valuesText,
      parsed.valueText,
      parsed.positionText,
      parsed.edgesText,
      parsed.sourceText,
    ]
    if (!strings.every((value) => typeof value === 'string')) return null
    if (typeof parsed.directed !== 'boolean') return null
    if (
      typeof parsed.index !== 'number' ||
      !Number.isInteger(parsed.index) ||
      parsed.index < 0
    ) {
      return null
    }
    return parsed as ShareableRun
  } catch {
    return null
  }
}

export function readRunFromSearch(search: string): ShareableRun | null {
  const params = new URLSearchParams(search)
  return decodeRun(params.get('run'))
}

export function buildRunUrl(
  run: ShareableRun,
  href: string = SHARE_BASE_URL,
): string {
  const url = new URL(href === '' ? SHARE_BASE_URL : href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('run', encodeRun(run))
  return url.toString()
}
