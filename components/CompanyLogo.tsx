/**
 * CompanyLogo
 * -----------
 * Renders the company logo image when available, falling back to a
 * branded color avatar (first letter) when logo_url is absent.
 *
 * Used across all company profile views and cards to guarantee a
 * consistent logo presence everywhere.
 */

import Image from 'next/image'

interface Props {
  name: string
  logoUrl?: string | null
  logoColor?: string | null
  /** Size in px — used for both width/height. Default 48. */
  size?: number
  className?: string
  style?: React.CSSProperties
}

export default function CompanyLogo({
  name,
  logoUrl,
  logoColor,
  size = 48,
  className,
  style,
}: Props) {
  const color       = logoColor ?? '#063f76'
  const initial     = name?.charAt(0)?.toUpperCase() ?? '?'
  const borderRadius = Math.round(size * 0.22)  // scales with size

  const base: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    borderRadius,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...style,
  }

  if (logoUrl) {
    return (
      <div className={className} style={{ ...base, background: '#fff', border: '1px solid #F0F0F0' }}>
        <Image
          src={logoUrl}
          alt={`${name} logo`}
          width={size}
          height={size}
          style={{ objectFit: 'contain', width: '100%', height: '100%' }}
          unoptimized
        />
      </div>
    )
  }

  // Color avatar fallback
  return (
    <div
      className={className}
      style={{
        ...base,
        background: `${color}18`,
        border: `1.5px solid ${color}30`,
      }}
    >
      <span style={{
        fontSize: size * 0.42,
        fontWeight: 800,
        color,
        lineHeight: 1,
        letterSpacing: '-0.03em',
      }}>
        {initial}
      </span>
    </div>
  )
}
