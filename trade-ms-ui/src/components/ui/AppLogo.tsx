interface AppLogoProps {
  size?: number
  className?: string
}

export function AppLogoIcon({ size = 32, className }: AppLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="logo-grad-glow" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {/* Diamond shape */}
      <path
        d="M16 2L30 16L16 30L2 16Z"
        fill="url(#logo-grad-glow)"
        stroke="url(#logo-grad)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Letter Т */}
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="13"
        fontWeight="600"
        fill="url(#logo-grad)"
        letterSpacing="-0.5"
      >
        Т
      </text>
    </svg>
  )
}
