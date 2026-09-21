import type { StationStatus, TrainRunStatus } from '@/lib/types'

export interface StatusMeta {
  label: string
  /** Tailwind classes for a soft badge treatment. */
  badgeClass: string
  /** Tailwind classes for a solid dot. */
  dotClass: string
  tone: 'success' | 'warning' | 'danger' | 'neutral'
}

export function runStatusMeta(
  status: TrainRunStatus,
  delayMinutes = 0,
): StatusMeta {
  switch (status) {
    case 'on-time':
      return {
        label: 'On time',
        badgeClass: 'bg-success-muted text-success-foreground dark:text-success',
        dotClass: 'bg-success',
        tone: 'success',
      }
    case 'running':
      return {
        label: delayMinutes > 0 ? `Running · ${delayMinutes} min late` : 'Running',
        badgeClass: 'bg-success-muted text-success-foreground dark:text-success',
        dotClass: 'bg-success',
        tone: 'success',
      }
    case 'late':
      return {
        label: `${delayMinutes} min late`,
        badgeClass: 'bg-warning-muted text-warning-foreground dark:text-warning',
        dotClass: 'bg-warning',
        tone: 'warning',
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        badgeClass: 'bg-destructive/10 text-destructive',
        dotClass: 'bg-destructive',
        tone: 'danger',
      }
  }
}

export const stationStatusMeta: Record<
  StationStatus,
  { label: string; tone: 'done' | 'current' | 'upcoming' }
> = {
  departed: { label: 'Departed', tone: 'done' },
  passed: { label: 'Passed', tone: 'done' },
  current: { label: 'Current', tone: 'current' },
  upcoming: { label: 'Upcoming', tone: 'upcoming' },
  destination: { label: 'Destination', tone: 'upcoming' },
}

export function delayLabel(delayMinutes: number): string {
  if (delayMinutes <= 0) return 'On time'
  return `+${delayMinutes} min`
}
