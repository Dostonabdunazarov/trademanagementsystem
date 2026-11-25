import { useId } from 'react'

interface AppLogoProps {
  size?: number
  className?: string
}

export function AppLogoIcon({ size = 32, className }: AppLogoProps) {
  const gradId = useId()
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--logo-from)" />
          <stop offset="1" stopColor="var(--logo-to)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradId})`} />
      <g fill="var(--color-brand-fg)">
        <path d="M16 5.5L25.5 10.8L16 16.1L6.5 10.8Z" />
        <path d="M6.5 12.6L15.1 17.4V27L6.5 22.2Z" fillOpacity={0.78} />
        <path d="M25.5 12.6V22.2L16.9 27V17.4Z" fillOpacity={0.55} />
      </g>
    </svg>
  )
}
