import type { ReactNode } from 'react'

export type ToolButtonProps = {
  label: string
  onClick(): void
  icon: ReactNode
  /** Toggle buttons expose their state; action buttons do not. */
  toggle?: boolean
  active?: boolean
}

/**
 * A compact toolbar button. The label is always the accessible name; it is
 * visually hidden below `lg` so the header stays usable on narrow screens.
 */
export function ToolButton({
  label,
  onClick,
  icon,
  toggle = false,
  active = false,
}: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={toggle ? active : undefined}
      title={label}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors ${
        active
          ? 'border-accent/50 bg-accent/10 text-accent'
          : 'border-transparent text-muted hover:border-line hover:bg-raised hover:text-ink'
      }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  )
}
