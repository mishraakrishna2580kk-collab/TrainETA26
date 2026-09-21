'use client'

import {
  ClockIcon,
  InfoIcon,
  NetworkIcon,
  RouteIcon,
  ShieldAlertIcon,
  TrainFrontIcon,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LiveTrainStatus, Train } from '@/lib/types'

export interface OperationsOverviewCardProps {
  train: Train
  live: LiveTrainStatus
  className?: string
}

export function OperationsOverviewCard({
  train,
  live,
  className,
}: OperationsOverviewCardProps) {
  const currentSection =
    live.networkStatus?.currentSection ||
    `${live.currentStation} → ${live.nextStation}`
  const congestionLevel = live.networkStatus?.congestionLevel || 'normal'

  return (
    <Card
      className={cn(
        'border-primary/25 bg-card/85 shadow-card backdrop-blur-xs',
        className,
      )}
    >
      <CardHeader className="border-b border-border/50 pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldAlertIcon className="size-4" />
            </span>
            <div>
              <CardTitle className="font-display text-sm font-bold tracking-tight text-foreground sm:text-base">
                Operations Overview
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">
                Live railway network telemetry & corridor monitoring
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground sm:self-auto">
            <InfoIcon className="size-3 text-primary" />
            <span>Operations Telemetry Mode</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3.5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {/* 1. Train Identifier */}
          <div className="flex flex-col rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <TrainFrontIcon className="size-3 text-primary" />
              Train Record
            </span>
            <div className="mt-1 flex flex-wrap items-baseline gap-1">
              <span className="font-mono text-sm font-bold text-foreground">
                {train.number}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {train.name}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {train.type} Express
            </span>
          </div>

          {/* 2. Active Section */}
          <div className="flex flex-col rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <RouteIcon className="size-3 text-primary" />
              Active Section
            </span>
            <span className="mt-1 truncate font-display text-sm font-bold text-foreground">
              {currentSection}
            </span>
            <span className="text-[10px] text-muted-foreground">
              At {live.currentStation}
            </span>
          </div>

          {/* 3. Run Status & Delay */}
          <div className="flex flex-col rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <ClockIcon className="size-3 text-amber-500" />
              Variance / Delay
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={cn(
                  'font-mono text-sm font-bold',
                  live.delayMinutes > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {live.delayMinutes > 0 ? `+${live.delayMinutes} min` : 'On Time'}
              </span>
              <span className="text-[10px] uppercase text-muted-foreground">
                {live.status}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              ETA {live.eta} (Sch {live.originalArrival})
            </span>
          </div>

          {/* 4. Corridor Density & Speed */}
          <div className="flex flex-col rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <NetworkIcon className="size-3 text-sky-500" />
              Corridor Density
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={cn(
                  'font-mono text-xs font-bold uppercase',
                  congestionLevel === 'high'
                    ? 'text-rose-600 dark:text-rose-400'
                    : congestionLevel === 'moderate'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {congestionLevel.toUpperCase()}
              </span>
              <span className="text-[11px] text-muted-foreground">
                · {live.speedKmh} km/h
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {live.networkStatus?.affectedTrainCount ?? 0} trains affected
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
