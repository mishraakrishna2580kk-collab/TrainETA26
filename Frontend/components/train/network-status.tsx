'use client'

import { useId, useMemo } from 'react'
import {
  ActivityIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  GaugeIcon,
  InfoIcon,
  MapPinIcon,
  NetworkIcon,
  RadioIcon,
  RouteIcon,
  ShieldCheckIcon,
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
import type { CongestionLevel, NetworkStatus } from '@/lib/types'

export interface NetworkStatusSectionProps {
  status?: NetworkStatus | null
  isLoading?: boolean
  error?: string | null
  className?: string
}

/**
 * Returns visual styles, labels, and icons according to congestion level.
 */
function getCongestionConfig(level: CongestionLevel) {
  switch (level) {
    case 'high':
      return {
        label: 'HEAVY CONGESTION',
        stepIndex: 3,
        badge:
          'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
        dotBg: 'bg-rose-500',
        icon: AlertCircleIcon,
        description: 'Significant traffic density and block occupancy ahead',
      }
    case 'moderate':
      return {
        label: 'MODERATE CONGESTION',
        stepIndex: 2,
        badge:
          'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        dotBg: 'bg-amber-500',
        icon: AlertTriangleIcon,
        description: 'Moderate freight and passenger volume in this block section',
      }
    case 'normal':
    default:
      return {
        label: 'NORMAL FLOW',
        stepIndex: 1,
        badge:
          'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        dotBg: 'bg-emerald-500',
        icon: CheckCircle2Icon,
        description: 'Clear line capacity with normal signal clearance',
      }
  }
}

export function NetworkStatusSection({
  status,
  isLoading = false,
  error = null,
  className,
}: NetworkStatusSectionProps) {
  const baseId = useId()

  const congestion = useMemo(() => {
    if (!status?.congestionLevel) return null
    return getCongestionConfig(status.congestionLevel)
  }, [status?.congestionLevel])

  return (
    <Card
      className={cn(
        'border-border/60 bg-card/80 shadow-card backdrop-blur-xs',
        className,
      )}
    >
      {/* Card Header */}
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
                Network & Congestion
              </CardTitle>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                <NetworkIcon className="size-3 animate-pulse" />
                Corridor Telemetry
              </span>

              {congestion && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase',
                    congestion.badge,
                  )}
                >
                  <congestion.icon className="size-3 shrink-0" />
                  {congestion.label}
                </span>
              )}
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Current corridor conditions affecting this journey
            </CardDescription>
          </div>

          {/* Demonstration Notice */}
          <div className="flex items-center gap-1.5 self-start rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground sm:self-auto">
            <InfoIcon className="size-3.5 shrink-0 text-primary" />
            <span>Simulated corridor telemetry</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 pt-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col gap-3 py-4">
            <div className="h-16 w-full animate-pulse rounded-xl bg-muted/40" />
            <div className="h-24 w-full animate-pulse rounded-xl bg-muted/40" />
            <div className="h-20 w-full animate-pulse rounded-xl bg-muted/40" />
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircleIcon className="size-4 shrink-0" />
            <div>
              <p className="font-semibold">Network status unavailable</p>
              <p className="text-[11px] text-destructive/80">
                Current corridor conditions could not be loaded: {error}
              </p>
            </div>
          </div>
        )}

        {/* Missing / Unavailable State */}
        {!isLoading && !error && !status && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 py-8 text-center sm:py-10">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <NetworkIcon className="size-5" />
            </div>
            <h4 className="mt-3 text-sm font-semibold text-foreground">
              Network conditions currently unavailable
            </h4>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Live block-section telemetry is not available for this train at
              this time.
            </p>
          </div>
        )}

        {/* Main Content when Status exists */}
        {!isLoading && !error && status && (
          <>
            {/* Active Section Bar & Congestion Indicator */}
            <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Operating Block Section
                  </span>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-foreground sm:text-base">
                      <RouteIcon className="size-4 text-primary" />
                      {status.currentSection}
                    </span>
                    {status.currentStation && (
                      <span className="inline-flex items-center gap-1 rounded border border-border/70 bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                        <MapPinIcon className="size-3 text-primary" />
                        {status.currentStation}
                        {status.currentStationCode
                          ? ` (${status.currentStationCode})`
                          : ''}
                      </span>
                    )}
                  </div>
                </div>

                {status.generatedAt && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {status.generatedAt}
                  </span>
                )}
              </div>

              {/* 3-Step Congestion Level Visualizer */}
              <div className="mt-1 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-muted-foreground">
                    Congestion Density
                  </span>
                  <span className="font-mono text-[11px] font-medium text-foreground">
                    Level: {status.congestionLevel.toUpperCase()}
                  </span>
                </div>

                {/* Progress Bar / Segmented Track */}
                <div
                  role="progressbar"
                  id={`${baseId}-congestion-meter`}
                  aria-valuemin={1}
                  aria-valuemax={3}
                  aria-valuenow={congestion?.stepIndex ?? 1}
                  aria-valuetext={`${status.congestionLevel} congestion`}
                  className="grid grid-cols-3 gap-1.5 rounded-lg bg-muted/60 p-1"
                >
                  {/* Step 1: Normal */}
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center rounded py-1.5 text-center transition-all',
                      status.congestionLevel === 'normal'
                        ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-700 shadow-2xs dark:text-emerald-300'
                        : 'bg-muted/40 text-muted-foreground/70',
                    )}
                  >
                    <span className="font-mono text-[10px] font-bold uppercase">
                      1. Normal
                    </span>
                  </div>

                  {/* Step 2: Moderate */}
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center rounded py-1.5 text-center transition-all',
                      status.congestionLevel === 'moderate'
                        ? 'border border-amber-500/40 bg-amber-500/20 text-amber-700 shadow-2xs dark:text-amber-300'
                        : 'bg-muted/40 text-muted-foreground/70',
                    )}
                  >
                    <span className="font-mono text-[10px] font-bold uppercase">
                      2. Moderate
                    </span>
                  </div>

                  {/* Step 3: High */}
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center rounded py-1.5 text-center transition-all',
                      status.congestionLevel === 'high'
                        ? 'border border-rose-500/40 bg-rose-500/20 text-rose-700 shadow-2xs dark:text-rose-300'
                        : 'bg-muted/40 text-muted-foreground/70',
                    )}
                  >
                    <span className="font-mono text-[10px] font-bold uppercase">
                      3. Heavy
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics Grid (omits missing data cleanly) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* 1. Affected Trains */}
              {status.affectedTrainCount !== undefined && (
                <div className="flex flex-col rounded-xl border border-border/60 bg-card/60 p-3 shadow-2xs">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <TrainFrontIcon className="size-3 text-primary" />
                    Affected Trains
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-display text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                      {status.affectedTrainCount}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      train{status.affectedTrainCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    In section corridor
                  </span>
                </div>
              )}

              {/* 2. Network Delay */}
              {status.networkDelayMinutes !== undefined && (
                <div className="flex flex-col rounded-xl border border-border/60 bg-card/60 p-3 shadow-2xs">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <ClockIcon className="size-3 text-amber-500" />
                    Network Delay
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span
                      className={cn(
                        'font-display text-xl font-bold tabular-nums sm:text-2xl',
                        status.networkDelayMinutes > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400',
                      )}
                    >
                      {status.networkDelayMinutes > 0
                        ? `+${status.networkDelayMinutes} min`
                        : '0 min'}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Section regulation
                  </span>
                </div>
              )}

              {/* 3. Preceding Train Impact */}
              {status.precedingTrainImpactMinutes !== undefined && (
                <div className="flex flex-col rounded-xl border border-border/60 bg-card/60 p-3 shadow-2xs">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <ActivityIcon className="size-3 text-sky-500" />
                    Preceding Headway
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span
                      className={cn(
                        'font-display text-xl font-bold tabular-nums sm:text-2xl',
                        status.precedingTrainImpactMinutes > 0
                          ? 'text-sky-600 dark:text-sky-400'
                          : 'text-muted-foreground',
                      )}
                    >
                      {status.precedingTrainImpactMinutes > 0
                        ? `+${status.precedingTrainImpactMinutes} min`
                        : '0 min'}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Spacing buffer impact
                  </span>
                </div>
              )}

              {/* 4. Average Section Speed */}
              {status.averageSectionSpeedKmph !== undefined && (
                <div className="flex flex-col rounded-xl border border-border/60 bg-card/60 p-3 shadow-2xs">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <GaugeIcon className="size-3 text-primary" />
                    Section Speed
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-display text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                      {status.averageSectionSpeedKmph}
                    </span>
                    <span className="text-xs text-muted-foreground">km/h</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Corridor average
                  </span>
                </div>
              )}
            </div>

            {/* Preceding-Train Impact Dedicated Passenger Highlight */}
            {status.precedingTrainImpactMinutes !== undefined && (
              <div className="flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3.5 sm:p-4">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <TrainFrontIcon className="size-4" />
                </span>
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs font-bold text-foreground">
                      Preceding-Train Impact
                    </h4>
                    <span className="rounded bg-sky-500/10 px-1.5 py-0.2 font-mono text-[10px] font-bold text-sky-700 dark:text-sky-300">
                      {status.precedingTrainImpactMinutes > 0
                        ? `+${status.precedingTrainImpactMinutes} min`
                        : 'Minimal'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {status.precedingTrainImpactMinutes > 0
                      ? `Traffic from trains ahead is contributing approximately ${status.precedingTrainImpactMinutes} minutes to the current network delay.`
                      : 'Minimal preceding-train impact. Clear track separation is currently maintained ahead of this service.'}
                  </p>
                </div>
              </div>
            )}

            {/* Corridor Status Message Banner */}
            {status.statusMessage && (
              <div className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
                <RadioIcon className="size-3.5 shrink-0 text-primary" />
                <span className="leading-normal">{status.statusMessage}</span>
              </div>
            )}

            {/* Bottom API Contract Ribbon */}
            <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheckIcon className="size-3.5 shrink-0 text-primary" />
                <span>
                  Simulation data for testing railway network status integration.
                </span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                Endpoint: GET /trains/{'{train_number}'}/network-status
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
