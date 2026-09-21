'use client'

import { CompassIcon, SlidersHorizontalIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TrackingViewMode = 'passenger' | 'operations'

export interface TrackingViewSwitcherProps {
  mode: TrackingViewMode
  onModeChange: (mode: TrackingViewMode) => void
  className?: string
}

export function TrackingViewSwitcher({
  mode,
  onModeChange,
  className,
}: TrackingViewSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Tracking presentation view"
      className={cn(
        'inline-flex items-center rounded-xl border border-border/70 bg-muted/40 p-1 shadow-2xs backdrop-blur-xs',
        className,
      )}
    >
      <button
        type="button"
        aria-pressed={mode === 'passenger'}
        onClick={() => onModeChange('passenger')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
          mode === 'passenger'
            ? 'bg-card text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <CompassIcon
          className={cn(
            'size-3.5',
            mode === 'passenger' ? 'text-primary' : 'text-muted-foreground',
          )}
        />
        <span>Passenger View</span>
      </button>

      <button
        type="button"
        aria-pressed={mode === 'operations'}
        onClick={() => onModeChange('operations')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
          mode === 'operations'
            ? 'bg-card text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <SlidersHorizontalIcon
          className={cn(
            'size-3.5',
            mode === 'operations' ? 'text-primary' : 'text-muted-foreground',
          )}
        />
        <span>Operations View</span>
      </button>
    </div>
  )
}
