import { cn } from '@/lib/utils'
import type { FreshnessState } from '@/lib/live-refresh-config'

export interface LiveIndicatorProps {
  className?: string
  label?: string
  freshness?: FreshnessState
}

export function LiveIndicator({
  className,
  label,
  freshness = 'live',
}: LiveIndicatorProps) {
  let defaultLabel = 'LIVE'
  let containerStyles =
    'bg-success-muted text-success-foreground border-success/20 dark:text-success'
  let dotStyles = 'bg-success'
  let showPing = true

  switch (freshness) {
    case 'updating':
      defaultLabel = 'UPDATING'
      containerStyles =
        'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25'
      dotStyles = 'bg-sky-500'
      showPing = true
      break
    case 'stale':
      defaultLabel = 'STALE'
      containerStyles =
        'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25'
      dotStyles = 'bg-amber-500'
      showPing = false
      break
    case 'offline':
      defaultLabel = 'OFFLINE'
      containerStyles =
        'bg-muted text-muted-foreground border-border/60'
      dotStyles = 'bg-muted-foreground/60'
      showPing = false
      break
    case 'unavailable':
      defaultLabel = 'UNAVAILABLE'
      containerStyles =
        'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25'
      dotStyles = 'bg-rose-500'
      showPing = false
      break
    case 'live':
    default:
      defaultLabel = 'LIVE'
      containerStyles =
        'bg-success-muted text-success-foreground border-success/20 dark:text-success'
      dotStyles = 'bg-success'
      showPing = true
      break
  }

  const displayLabel = label ?? defaultLabel

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold tracking-widest uppercase transition-colors',
        containerStyles,
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {showPing && (
          <span
            className={cn(
              'absolute inline-flex size-full rounded-full opacity-75 motion-safe:animate-live-ping',
              dotStyles,
            )}
          />
        )}
        <span
          className={cn('relative inline-flex size-1.5 rounded-full', dotStyles)}
        />
      </span>
      {displayLabel}
    </span>
  )
}

