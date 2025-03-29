import type React from "react"

interface SciensaurusLogoProps {
  className?: string
  variant?: "default" | "outline"
}

export const SciensaurusLogo: React.FC<SciensaurusLogoProps> = ({ className = "h-8 w-8", variant = "default" }) => {
  const isOutline = variant === "outline"
  const strokeColor = isOutline ? "white" : "#1e3a6d"
  const liquidColor = isOutline ? "white" : "#1e3a6d"
  const starColor = isOutline ? "white" : "#1e3a6d"
  const strokeWidth = isOutline ? 8 : 6

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Beaker - with liquid level at 1/3, moved down further */}
        {/* Beaker outline - both variants now use stroke */}
        <path
          d="M38 35H62V48L70 75C70 78.866 66.866 82 63 82H37C33.134 82 30 78.866 30 75L38 48V35Z"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Liquid inside beaker - 1/3 full */}
        <path d="M38 62L30 75C30 78.866 33.134 82 37 82H63C66.866 82 70 78.866 70 75L62 62H38Z" fill={liquidColor} />

        {/* Minimalist 4-point stars/sparkles - removed largest star */}
        {/* Second star */}
        <g transform="translate(70, 25) scale(0.9)">
          <path d="M0 -8V8M-8 0H8M-5 -5L5 5M-5 5L5 -5" stroke={starColor} strokeWidth="5" strokeLinecap="round" />
        </g>

        {/* Third star */}
        <g transform="translate(80, 40) scale(0.7)">
          <path d="M0 -8V8M-8 0H8M-5 -5L5 5M-5 5L5 -5" stroke={starColor} strokeWidth="5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  )
}

