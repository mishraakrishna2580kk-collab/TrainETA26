import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  /** Size of the square mark in pixels. */
  size?: number
  showWordmark?: boolean
}

/**
 * Train ETA brand mark — a route line running through a station node into a
 * train head. Built as inline SVG so it stays crisp at any size and inherits
 * the primary theme color.
 */
export function Logo({ className, size = 36, showWordmark = true }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className="relative inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-sm shadow-primary/20 ring-1 ring-primary/25 transition-transform duration-200 group-hover:scale-[1.02]"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg
          width={size * 0.62}
          height={size * 0.62}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* route line */}
          <path d="M3 6h6" opacity={0.55} />
          {/* origin node */}
          <circle cx="3.5" cy="6" r="1.4" fill="currentColor" stroke="none" />
          {/* train head */}
          <path d="M11 4h5a4 4 0 0 1 4 4v6a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V8a4 4 0 0 1 3-4Z" />
          <path d="M9 11h11" opacity={0.7} />
          <path d="M12 17l-1.5 3M18 17l1.5 3" />
        </svg>
      </span>
      {showWordmark && (
        <span className="font-display text-[1.125rem] leading-none font-bold tracking-tight text-foreground">
          Train<span className="text-primary font-black">ETA</span>
        </span>
      )}
    </span>
  )
}
