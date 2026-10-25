/**
 * WorkspaceShell — the fixed frame everything is mounted inside.
 *
 * WHAT IT DOES
 *   Lays out the top toolbar, the auto-hiding catalogue sidebar, the collapsible
 *   inputs guide, the visualisation stage and the inspector rail. On a wide screen
 *   the frame is viewport-height and only the rail scrolls; below `lg` the page
 *   scrolls normally.
 *
 * WHY THIS FILE EXISTS
 *   The shell is deliberately dumb: it receives already-built nodes and places
 *   them. It owns no algorithm state, so the step index still lives in exactly one
 *   place (`ADR-4`), and the layout is the only thing that changes when panes move.
 *
 * AUTO-HIDE
 *   `autoHideSidebar` is true once the user enters explore mode. The sidebar then
 *   collapses to a 44 px rail; hovering or focusing it opens the full catalogue, so
 *   navigation is one gesture away without permanently occupying the stage.
 *
 * RULES
 *   No algorithm state, no step index, no timer. Styling comes from the semantic
 *   design tokens in `src/index.css` (NFR-U2), never from raw hex.
 */

import { useState, type ReactNode } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { PanelLeftIcon, PinIcon } from '../icons'

export type WorkspaceShellProps = {
  toolbar: ReactNode
  brandContext: ReactNode
  sidebar: ReactNode
  guide: ReactNode
  stage: ReactNode
  rail: ReactNode
  announcer: ReactNode
  overlay?: ReactNode
  error: string | null
  autoHideSidebar: boolean
  sidebarPinned: boolean
  onToggleSidebarPinned(): void
}

function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent/40 bg-accent/10 text-accent"
    >
      <svg
        viewBox="0 0 24 24"
        width={19}
        height={19}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="6" cy="7" r="2.4" />
        <circle cx="18" cy="7" r="2.4" />
        <circle cx="12" cy="17" r="2.4" />
        <path d="M8.4 7h7.2M7.2 9.1l3.6 5.8M16.8 9.1l-3.6 5.8" />
      </svg>
    </span>
  )
}

export function WorkspaceShell({
  toolbar,
  brandContext,
  sidebar,
  guide,
  stage,
  rail,
  announcer,
  overlay,
  error,
  autoHideSidebar,
  sidebarPinned,
  onToggleSidebarPinned,
}: WorkspaceShellProps) {
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [sidebarFocused, setSidebarFocused] = useState(false)
  const isCompact = useMediaQuery('(max-width: 1023px)')
  // On a phone/tablet the catalogue is a drawer: it never steals space until the
  // user explicitly opens it. On a wide screen it can stay open for configuration.
  const sidebarExpanded =
    sidebarPinned ||
    (!isCompact && !autoHideSidebar) ||
    sidebarHovered ||
    sidebarFocused
  const showSidebarScrim = isCompact && sidebarExpanded

  const closeSidebar = (): void => {
    setSidebarHovered(false)
    setSidebarFocused(false)
    if (sidebarPinned) onToggleSidebarPinned()
  }

  return (
    <div className="app-frame">
      <a
        href="#visualisation"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:border focus:border-accent focus:bg-surface focus:px-3 focus:py-1.5 focus:text-sm"
      >
        Skip to visualisation
      </a>

      <header className="relative z-30 flex min-h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/80 px-3 backdrop-blur sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandMark />
          <div className="min-w-0">
            <h1 className="truncate text-[14px] font-semibold tracking-tight text-ink">
              Data Structure Visualiser
            </h1>
            <div className="hidden min-w-0 items-center gap-1.5 text-[10px] text-muted sm:flex">
              {brandContext}
            </div>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {toolbar}
        </div>
      </header>

      {error !== null && (
        <p
          role="alert"
          className="mx-3 mt-3 rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad"
        >
          {error}
        </p>
      )}

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {showSidebarScrim && (
          <button
            type="button"
            aria-label="Close structure panel"
            onClick={closeSidebar}
            className="fixed inset-0 z-20 bg-scrim lg:hidden"
          />
        )}
        <aside
          aria-label="Structure catalogue"
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          onFocusCapture={() => setSidebarFocused(true)}
          onBlurCapture={(event) => {
            const next = event.relatedTarget
            if (
              !(next instanceof Node) ||
              !event.currentTarget.contains(next)
            ) {
              setSidebarFocused(false)
            }
          }}
          className={`relative flex h-full shrink-0 flex-col overflow-hidden border-r border-line bg-surface/65 transition-[width] duration-300 ease-out max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-30 max-lg:h-full ${
            sidebarExpanded ? 'w-[236px]' : 'w-11'
          }`}
        >
          {/* Collapsed rail: always available, and the hover/focus target. */}
          <div
            aria-hidden={sidebarExpanded}
            className={`absolute inset-y-0 left-0 flex w-11 flex-col items-center gap-3 border-r border-line/60 bg-surface py-2 transition-opacity ${
              sidebarExpanded ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={onToggleSidebarPinned}
              aria-label={
                sidebarPinned
                  ? 'Unpin structure panel'
                  : 'Open and pin structure panel'
              }
              title="Structures"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-base-deep text-muted hover:border-accent/50 hover:text-accent"
            >
              <PanelLeftIcon size={14} />
            </button>
            <span className="[writing-mode:vertical-rl] text-[10px] tracking-wider text-muted">
              Structures
            </span>
          </div>

          <div
            aria-hidden={!sidebarExpanded}
            inert={!sidebarExpanded}
            className={`flex min-h-0 w-[236px] flex-1 flex-col p-3 transition-opacity duration-200 ${
              sidebarExpanded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium text-muted">
                Catalogue
              </span>
              <button
                type="button"
                onClick={onToggleSidebarPinned}
                aria-pressed={sidebarPinned}
                aria-label={
                  sidebarPinned
                    ? 'Unpin structure panel'
                    : 'Pin structure panel open'
                }
                title={sidebarPinned ? 'Unpin panel' : 'Pin panel open'}
                className={`inline-flex h-6 w-6 items-center justify-center rounded border ${
                  sidebarPinned
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-line bg-base-deep text-muted hover:text-ink'
                }`}
              >
                <PinIcon size={12} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">{sidebar}</div>
          </div>
        </aside>

        <main
          id="visualisation"
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3 max-lg:pl-[3.75rem] xl:overflow-hidden"
        >
          <div className="shrink-0">{guide}</div>
          <div className="grid min-w-0 gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_336px]">
            {stage}
            <aside
              aria-label="Inspector"
              className="flex flex-col gap-3 xl:min-h-0 xl:overflow-y-auto xl:pr-1"
            >
              {rail}
            </aside>
          </div>
        </main>
      </div>

      {announcer}
      {overlay}
    </div>
  )
}
