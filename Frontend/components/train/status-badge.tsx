import { cn } from '@/lib/utils'
import { runStatusMeta } from '@/lib/status'
import type { TrainRunStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: TrainRunStatus
  delayMinutes?: number
  className?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({
  status,
  delayMinutes = 0,
  className,
  size = 'md',
}: StatusBadgeProps) {
  const meta = runStatusMeta(status, delayMinutes)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        meta.badgeClass,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', meta.dotClass)} />
      {meta.label}
    </span>
  )
}
