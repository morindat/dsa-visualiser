import { describe, expect, it } from 'vitest'
import {
  buildRunUrl,
  decodeRun,
  encodeRun,
  readRunFromSearch,
  SHARE_BASE_URL,
  toShareableRun,
  type RunRequestState,
} from './shareLink'

const STATE: RunRequestState = {
  structureId: 'list',
  operationId: 'insertAtHead',
  valuesText: '50, 30, 70',
  valueText: '45',
  positionText: '1',
  edgesText: 'A-B\nB-C',
  sourceText: 'A',
  directed: false,
}

describe('share links', () => {
  it('round-trips a run request and step index', () => {
    const run = toShareableRun(STATE, 3)
    expect(decodeRun(encodeRun(run))).toEqual(run)
    expect(run.version).toBe(1)
    expect(run.index).toBe(3)
  })

  it('clamps and floors the step index', () => {
    const run = toShareableRun(STATE, -2.7)
    expect(run.index).toBe(0)
  })

  it('rejects malformed payloads', () => {
    expect(decodeRun(null)).toBeNull()
    expect(decodeRun('')).toBeNull()
    expect(decodeRun('{')).toBeNull()
    expect(decodeRun('{}')).toBeNull()
    expect(
      decodeRun(JSON.stringify({ ...toShareableRun(STATE, 0), version: 2 })),
    ).toBeNull()
    expect(
      decodeRun(JSON.stringify({ ...toShareableRun(STATE, 0), index: -1 })),
    ).toBeNull()
    expect(
      decodeRun(
        JSON.stringify({ ...toShareableRun(STATE, 0), operationId: 4 }),
      ),
    ).toBeNull()
  })

  it('reads the run parameter from a query string', () => {
    const run = toShareableRun(STATE, 2)
    const search = new URLSearchParams({ run: encodeRun(run) }).toString()
    expect(readRunFromSearch(`?${search}`)).toEqual(run)
    expect(readRunFromSearch('?other=1')).toBeNull()
  })

  it('builds a clean URL with only the run parameter', () => {
    const run = toShareableRun(STATE, 1)
    const url = new URL(
      buildRunUrl(run, 'https://example.com/app?old=1#fragment'),
    )
    expect(url.origin).toBe('https://example.com')
    expect(url.pathname).toBe('/app')
    expect(url.hash).toBe('')
    expect(url.searchParams.get('old')).toBeNull()
    expect(decodeRun(url.searchParams.get('run'))).toEqual(run)
  })

  it('defaults to the public share location', () => {
    const run = toShareableRun(STATE, 2)
    const url = new URL(buildRunUrl(run))
    expect(SHARE_BASE_URL).toBe('https://dsa-vis.netlify.app/')
    expect(url.origin).toBe('https://dsa-vis.netlify.app')
    expect(url.pathname).toBe('/')
    expect(decodeRun(url.searchParams.get('run'))).toEqual(run)
  })
})
