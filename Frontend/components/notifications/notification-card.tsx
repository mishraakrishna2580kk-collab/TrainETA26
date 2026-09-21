import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRightIcon,
  BellIcon,
  ClockAlertIcon,
  MapPinIcon,
  TrainFrontIcon,
  TrainFrontTunnelIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppNotification, NotificationType } from '@/lib/types'

const typeMeta: Record<
  NotificationType,
  { icon: LucideIcon; tint: string }
> = {
  delay: {
    icon: ClockAlertIcon,
    tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  platform: {
    icon: MapPinIcon,
    tint: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  },
  arrival: {
    icon: TrainFrontTunnelIcon,
    tint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  departure: {
    icon: TrainFrontIcon,
    tint: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
  info: {
    icon: BellIcon,
    tint: 'bg-muted text-muted-foreground border-border/60',
  },
}

export function NotificationCard({ item }: { item: AppNotification }) {
  const meta = typeMeta[item.type]
  return (
    <div
      className={cn(
        'group relative flex items-start gap-3.5 rounded-2xl border p-4 transition-all duration-150 sm:p-4.5',
        !item.read
          ? 'border-primary/30 bg-primary/5 shadow-xs'
          : 'border-border/60 bg-card/75 hover:border-border hover:bg-card/90',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-2xs',
          meta.tint,
        )}
      >
        <meta.icon className="size-4.5" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="font-display text-sm font-bold tracking-tight text-foreground sm:text-base">
              {item.title}
            </p>
            {!item.read && (
              <span className="inline-flex size-2 shrink-0 rounded-full bg-primary ring-4 ring-primary/20" />
            )}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">
            {item.time}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {item.message}
        </p>

        {item.trainNumber && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
              <TrainFrontIcon className="size-3 text-muted-foreground" />
              Train {item.trainNumber}
            </span>
            <Link
              href={`/track/${item.trainNumber}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              <span>Track train</span>
              <ArrowRightIcon className="size-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
