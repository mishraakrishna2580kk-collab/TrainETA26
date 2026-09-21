import type { LucideIcon } from 'lucide-react'
import {
  GaugeIcon,
  MapPinIcon,
  RouteIcon,
  TicketIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { LiveTrainStatus } from '@/lib/types'

interface Stat {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  accent: string
}

export function LiveStats({ live }: { live: LiveTrainStatus }) {
  const stats: Stat[] = [
    {
      icon: GaugeIcon,
      label: 'Speed',
      value: `${live.speedKmh}`,
      sub: 'km/h',
      accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    {
      icon: RouteIcon,
      label: 'Distance left',
      value: `${live.distanceRemaining}`,
      sub: `of ${live.totalDistance} km`,
      accent: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    },
    {
      icon: MapPinIcon,
      label: 'Next stop',
      value: live.nextStation,
      accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    {
      icon: TicketIcon,
      label: 'Platform',
      value: live.platform,
      sub: `at ${live.currentStation}`,
      accent: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/70 py-0 shadow-xs backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-card"
        >
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <span
                className={`flex size-8 items-center justify-center rounded-lg border ${stat.accent}`}
              >
                <stat.icon className="size-4" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {stat.label}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="truncate font-display text-xl font-bold tracking-tight tabular-nums text-foreground sm:text-2xl">
                {stat.value}
                {stat.sub && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {stat.sub}
                  </span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
