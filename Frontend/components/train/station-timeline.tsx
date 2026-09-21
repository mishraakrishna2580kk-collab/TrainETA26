'use client'

import { useMemo, useState } from 'react'
import {
  CheckIcon,
  FilterIcon,
  MapPinIcon,
  RadioIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { StationStop } from '@/lib/types'

interface StationTimelineProps {
  stations: StationStop[]
  currentDelayMinutes?: number
  destinationEta?: string
  className?: string
}

/**
 * Formats a delay value in minutes into a clean user-facing string.
 * Gracefully handles missing, 0, or positive delays.
 */
function formatDelay(minutes?: number | null): string {
  if (typeof minutes !== 'number' || isNaN(minutes)) {
    return '—'
  }
  if (minutes <= 0) {
    return 'On time'
  }
  return `+${minutes} min`
}

/**
 * Formats a time string, providing a fallback dash for empty/null values.
 */
function formatTime(time?: string | null): string {
  if (!time || time.trim() === '') {
    return '—'
  }
  return time
}

export function StationTimeline({
  stations,
  currentDelayMinutes,
  destinationEta,
  className,
}: StationTimelineProps) {
  // Filter state: 'all' shows complete corridor, 'remaining' shows current + upcoming stops
  const [filterMode, setFilterMode] = useState<'all' | 'remaining'>('all')

  // Find landmarks in the route
  const currentStationIndex = useMemo(
    () => stations.findIndex((s) => s.status === 'current'),
    [stations],
  )
  const currentStation = useMemo(
    () => (currentStationIndex !== -1 ? stations[currentStationIndex] : null),
    [stations, currentStationIndex],
  )
  const destinationStation = useMemo(
    () =>
      stations.find((s) => s.status === 'destination') ||
      stations[stations.length - 1],
    [stations],
  )

  // Calculate summary metrics
  const remainingStationsCount = useMemo(
    () =>
      stations.filter(
        (s) => s.status === 'upcoming' || s.status === 'destination',
      ).length,
    [stations],
  )

  const passedStationsCount = useMemo(
    () =>
      stations.filter((s) => s.status === 'departed' || s.status === 'passed')
        .length,
    [stations],
  )

  const effectiveCurrentDelay =
    currentDelayMinutes ?? currentStation?.delayMinutes ?? 0
  const effectiveDestEta =
    destinationEta ??
    destinationStation?.predictedArrival ??
    destinationStation?.arrival ??
    '—'

  // Stations to display based on filter
  const displayedStations = useMemo(() => {
    if (filterMode === 'remaining' && currentStationIndex !== -1) {
      return stations.slice(currentStationIndex)
    }
    return stations
  }, [stations, filterMode, currentStationIndex])

  return (
    <Card
      className={cn(
        'border-border/60 bg-card/80 shadow-card backdrop-blur-xs',
        className,
      )}
    >
      {/* Header Section */}
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
                ETA Route Forecast
              </CardTitle>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                Dynamic forecast
              </span>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Dynamic station-by-station prediction with scheduled vs estimated
              timings
            </CardDescription>
          </div>

          {/* Filter Toggle Button */}
          {passedStationsCount > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilterMode((prev) => (prev === 'all' ? 'remaining' : 'all'))
                }
                className="h-8 gap-1.5 border-border/70 text-xs font-medium text-foreground hover:bg-muted"
                aria-label={
                  filterMode === 'all'
                    ? 'Show remaining stations only'
                    : 'Show all stations including departed'
                }
              >
                <FilterIcon className="size-3 text-muted-foreground" />
                {filterMode === 'all' ? (
                  <span>Remaining Only ({remainingStationsCount + (currentStation ? 1 : 0)})</span>
                ) : (
                  <span>All Stations ({stations.length})</span>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Compact Summary Metrics Bar */}
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/25 p-3 sm:grid-cols-4 sm:gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Remaining Stops
            </span>
            <span className="font-display text-sm font-bold text-foreground">
              {remainingStationsCount} stations
            </span>
            <span className="text-[10px] text-muted-foreground">
              {stations.length} total on route
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current Delay
            </span>
            <span
              className={cn(
                'font-display text-sm font-bold',
                effectiveCurrentDelay > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {formatDelay(effectiveCurrentDelay)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              At {currentStation ? currentStation.name : 'route'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Destination ETA
            </span>
            <span className="font-display text-sm font-bold text-foreground">
              {effectiveDestEta}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Sched {destinationStation ? destinationStation.arrival : '—'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Destination
            </span>
            <span className="truncate font-display text-sm font-bold text-foreground">
              {destinationStation ? destinationStation.name : '—'}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {destinationStation ? destinationStation.code : '—'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        {/* Notice when departed stations are hidden */}
        {filterMode === 'remaining' && passedStationsCount > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span>
              {passedStationsCount} earlier departed stop
              {passedStationsCount > 1 ? 's are' : ' is'} hidden.
            </span>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Show all stations
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 1. DESKTOP VIEW (≥ 768px): Structured Timeline Table         */}
        {/* ============================================================ */}
        <div className="hidden md:block">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 border-b border-border/60 pb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-4 pl-8">Station & Platform</div>
            <div className="col-span-2 text-right">Scheduled</div>
            <div className="col-span-2 text-right">Predicted (ETA)</div>
            <div className="col-span-2 text-center">Delay</div>
            <div className="col-span-2 text-right pr-2">Status</div>
          </div>

          {/* Timeline List */}
          <ol className="flex flex-col pt-2" aria-label="Station predictions">
            {displayedStations.map((stop, i) => {
              const isCurrent = stop.status === 'current'
              const isDestination =
                stop.status === 'destination' || i === displayedStations.length - 1
              const isPassed =
                stop.status === 'departed' || stop.status === 'passed'
              const isLast = i === displayedStations.length - 1

              return (
                <li
                  key={stop.code}
                  className={cn(
                    'group relative grid grid-cols-12 items-center gap-3 rounded-xl px-2 py-3 transition-colors',
                    isCurrent
                      ? 'border border-primary/30 bg-primary/5 shadow-xs ring-1 ring-primary/20'
                      : isDestination
                        ? 'border border-border/60 bg-muted/15'
                        : 'border border-transparent hover:border-border/40 hover:bg-muted/20',
                  )}
                >
                  {/* Left Column: Vertical Track Node + Station Info */}
                  <div className="col-span-4 flex items-center gap-3">
                    {/* Visual Connector + Node */}
                    <div className="relative flex size-6 shrink-0 items-center justify-center">
                      {/* Vertical line connecting to previous/next */}
                      {!isLast && (
                        <span
                          className={cn(
                            'absolute top-6 bottom-[-16px] left-1/2 w-0.5 -translate-x-1/2',
                            isPassed
                              ? 'bg-emerald-500/60'
                              : isCurrent
                                ? 'bg-gradient-to-b from-primary/80 to-border'
                                : 'bg-border/60',
                          )}
                          aria-hidden="true"
                        />
                      )}

                      {/* Node Icon */}
                      {isPassed ? (
                        <span
                          className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs"
                          title="Station departed"
                        >
                          <CheckIcon className="size-2.5 stroke-[3]" />
                        </span>
                      ) : isCurrent ? (
                        <span
                          className="relative flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background shadow-md ring-4 ring-primary/25"
                          title="Current station"
                        >
                          <span className="size-2.5 rounded-full bg-primary animate-pulse motion-reduce:animate-none" />
                        </span>
                      ) : isDestination ? (
                        <span
                          className="flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-rose-600 bg-rose-600 text-white shadow-xs"
                          title="Destination"
                        >
                          <MapPinIcon className="size-3 stroke-[2.5]" />
                        </span>
                      ) : (
                        <span
                          className="size-3.5 shrink-0 rounded-full border-2 border-slate-400 bg-background shadow-2xs dark:border-slate-500"
                          title="Upcoming stop"
                        />
                      )}
                    </div>

                    {/* Station Name & Badges */}
                    <div className="flex min-w-0 flex-col">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            'truncate font-medium',
                            isCurrent
                              ? 'font-bold text-foreground text-sm'
                              : isDestination
                                ? 'font-bold text-foreground'
                                : isPassed
                                  ? 'text-muted-foreground'
                                  : 'text-foreground',
                          )}
                        >
                          {stop.name}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                          {stop.code}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary">
                            <RadioIcon className="size-2.5 animate-pulse motion-reduce:animate-none" />
                            LIVE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>Day {stop.day}</span>
                        {stop.platform && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-foreground/80">
                              Platform {stop.platform}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Time */}
                  <div className="col-span-2 text-right">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {formatTime(stop.arrival || stop.departure)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/80">
                        {stop.arrival && stop.departure
                          ? `Dep ${stop.departure}`
                          : stop.arrival
                            ? 'Arrival'
                            : 'Departure'}
                      </span>
                    </div>
                  </div>

                  {/* Predicted Time (ETA) */}
                  <div className="col-span-2 text-right">
                    <div className="flex flex-col items-end">
                      <span
                        className={cn(
                          'font-display text-sm font-bold tabular-nums',
                          isCurrent
                            ? 'text-primary'
                            : isDestination
                              ? 'text-foreground'
                              : isPassed
                                ? 'text-muted-foreground'
                                : 'text-foreground',
                        )}
                      >
                        {formatTime(
                          stop.predictedArrival ||
                            stop.predictedDeparture ||
                            stop.arrival ||
                            stop.departure,
                        )}
                      </span>
                      {stop.predictedArrival && stop.predictedDeparture && (
                        <span className="text-[10px] text-muted-foreground">
                          Dep {stop.predictedDeparture}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delay */}
                  <div className="col-span-2 flex justify-center">
                    <span
                      className={cn(
                        'inline-flex min-w-16 items-center justify-center rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums',
                        typeof stop.delayMinutes !== 'number'
                          ? 'bg-muted text-muted-foreground'
                          : stop.delayMinutes > 0
                            ? 'border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                      )}
                    >
                      {formatDelay(stop.delayMinutes)}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="col-span-2 flex justify-end pr-2">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        Current Stop
                      </span>
                    ) : isDestination ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                        Destination
                      </span>
                    ) : isPassed ? (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Departed
                      </span>
                    ) : (
                      <span className="rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-xs font-medium text-foreground/80">
                        Upcoming
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* ============================================================ */}
        {/* 2. MOBILE VIEW (< 768px): Responsive Non-Overflow Cards      */}
        {/* ============================================================ */}
        <div className="block md:hidden">
          <ol className="flex flex-col" aria-label="Station predictions mobile">
            {displayedStations.map((stop, i) => {
              const isCurrent = stop.status === 'current'
              const isDestination =
                stop.status === 'destination' || i === displayedStations.length - 1
              const isPassed =
                stop.status === 'departed' || stop.status === 'passed'
              const isLast = i === displayedStations.length - 1

              return (
                <li key={stop.code} className="relative flex gap-3 pb-3">
                  {/* Vertical Route Line + Node */}
                  <div className="relative flex flex-col items-center">
                    {isPassed ? (
                      <span
                        className="z-10 mt-1 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs"
                        title="Departed"
                      >
                        <CheckIcon className="size-2.5 stroke-[3]" />
                      </span>
                    ) : isCurrent ? (
                      <span
                        className="relative z-10 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background shadow-xs ring-4 ring-primary/25"
                        title="Current station"
                      >
                        <span className="size-2 rounded-full bg-primary animate-pulse motion-reduce:animate-none" />
                      </span>
                    ) : isDestination ? (
                      <span
                        className="z-10 mt-1 flex size-4 shrink-0 items-center justify-center rounded-md bg-rose-600 text-white shadow-xs"
                        title="Destination"
                      >
                        <MapPinIcon className="size-2.5 stroke-[2.5]" />
                      </span>
                    ) : (
                      <span
                        className="z-10 mt-1 size-3.5 shrink-0 rounded-full border-2 border-slate-400 bg-background shadow-2xs dark:border-slate-500"
                        title="Upcoming stop"
                      />
                    )}

                    {!isLast && (
                      <span
                        className={cn(
                          'w-0.5 flex-1',
                          isPassed
                            ? 'bg-emerald-500/60'
                            : isCurrent
                              ? 'bg-gradient-to-b from-primary/80 to-border'
                              : 'bg-border/60',
                        )}
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  {/* Card Content */}
                  <div
                    className={cn(
                      'mb-1 flex min-w-0 flex-1 flex-col gap-2 rounded-xl p-3 transition-all',
                      isCurrent
                        ? 'border border-primary/30 bg-primary/5 shadow-xs ring-1 ring-primary/20'
                        : isDestination
                          ? 'border border-border/70 bg-muted/20'
                          : 'border border-border/40 bg-card/60',
                    )}
                  >
                    {/* Header: Station & Status */}
                    <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-2">
                      <div className="flex min-w-0 flex-col">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'truncate font-medium text-sm',
                              isCurrent
                                ? 'font-bold text-primary'
                                : 'text-foreground',
                            )}
                          >
                            {stop.name}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                            {stop.code}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          Day {stop.day}{' '}
                          {stop.platform && `• Platform ${stop.platform}`}
                        </span>
                      </div>

                      {/* Status Tag */}
                      {isCurrent ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                          <RadioIcon className="size-2.5 animate-pulse motion-reduce:animate-none" />
                          LIVE
                        </span>
                      ) : isDestination ? (
                        <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                          Destination
                        </span>
                      ) : isPassed ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Departed
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-foreground/80">
                          Upcoming
                        </span>
                      )}
                    </div>

                    {/* Micro-grid: Scheduled, Predicted, Delay */}
                    <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-center">
                      {/* Scheduled */}
                      <div className="flex flex-col rounded-lg bg-muted/30 p-1.5">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                          Scheduled
                        </span>
                        <span className="font-mono text-xs tabular-nums text-foreground/80">
                          {formatTime(stop.arrival || stop.departure)}
                        </span>
                      </div>

                      {/* Predicted ETA */}
                      <div className="flex flex-col rounded-lg bg-muted/40 p-1.5">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                          Predicted
                        </span>
                        <span
                          className={cn(
                            'font-display text-xs font-bold tabular-nums',
                            isCurrent
                              ? 'text-primary'
                              : 'text-foreground',
                          )}
                        >
                          {formatTime(
                            stop.predictedArrival ||
                              stop.predictedDeparture ||
                              stop.arrival ||
                              stop.departure,
                          )}
                        </span>
                      </div>

                      {/* Delay */}
                      <div className="flex flex-col rounded-lg bg-muted/30 p-1.5">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                          Delay
                        </span>
                        <span
                          className={cn(
                            'font-mono text-xs font-semibold tabular-nums',
                            typeof stop.delayMinutes !== 'number'
                              ? 'text-muted-foreground'
                              : stop.delayMinutes > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400',
                          )}
                        >
                          {formatDelay(stop.delayMinutes)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}

