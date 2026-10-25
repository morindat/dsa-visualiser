import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function StrokeIcon({
  size = 16,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

function FillIcon({
  size = 16,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <path d="M8 5.6v12.8a1 1 0 0 0 1.53.85l10.2-6.4a1 1 0 0 0 0-1.7L9.53 4.75A1 1 0 0 0 8 5.6Z" />
    </FillIcon>
  )
}

export function PauseIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </FillIcon>
  )
}

export function PreviousIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <rect x="5" y="5" width="2.6" height="14" rx="1" />
      <path d="M19 6.4v11.2a1 1 0 0 1-1.56.83l-8.1-5.6a1 1 0 0 1 0-1.66l8.1-5.6A1 1 0 0 1 19 6.4Z" />
    </FillIcon>
  )
}

export function NextIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <rect x="16.4" y="5" width="2.6" height="14" rx="1" />
      <path d="M5 6.4v11.2a1 1 0 0 0 1.56.83l8.1-5.6a1 1 0 0 0 0-1.66l-8.1-5.6A1 1 0 0 0 5 6.4Z" />
    </FillIcon>
  )
}

export function RestartIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 5v5h5" />
      <path d="M5.2 14a7 7 0 1 0 1.4-7.5L4 10" />
    </StrokeIcon>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
    </StrokeIcon>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M20.5 14.2A8.6 8.6 0 0 1 9.8 3.5 8.6 8.6 0 1 0 20.5 14.2Z" />
    </StrokeIcon>
  )
}

export function ShareIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M10 13a5 5 0 0 0 7.1 0l2.4-2.4a5 5 0 0 0-7.1-7.1L11 4.9" />
      <path d="M14 11a5 5 0 0 0-7.1 0l-2.4 2.4a5 5 0 0 0 7.1 7.1l1.4-1.4" />
    </StrokeIcon>
  )
}

export function CompassIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </StrokeIcon>
  )
}

export function KeyboardIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M6 13.5h.01M9.5 13.5h.01M13 13.5h.01M16.5 13.5h.01M8 17h8" />
    </StrokeIcon>
  )
}

export function TargetIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </StrokeIcon>
  )
}

export function PinIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="m9 3 6 6-2 2 3.5 3.5-1 1L12 12l-2 2-6-6 2-2L9.5 9.5 12 7 9 3Z" />
      <path d="m8 16-4 4" />
    </StrokeIcon>
  )
}

export function PanelLeftIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </StrokeIcon>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </StrokeIcon>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="m9 6 6 6-6 6" />
    </StrokeIcon>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </StrokeIcon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </StrokeIcon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="m5 12.5 4.2 4.2L19 6.8" />
    </StrokeIcon>
  )
}

export function GaugeIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 16a8 8 0 1 1 16 0" />
      <path d="m12 12 4-3" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </StrokeIcon>
  )
}
