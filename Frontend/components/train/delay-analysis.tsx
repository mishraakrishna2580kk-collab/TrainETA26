'use client'

import { useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ActivityIcon,
  AlertTriangleIcon,
  CloudSunIcon,
  CpuIcon,
  GaugeIcon,
  HistoryIcon,
  InfoIcon,
  NetworkIcon,
  SparklesIcon,
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
import type {
  DelayAnalysis,
  DelayFactorType,
} from '@/lib/types'

interface DelayAnalysisProps {
  analysis?: DelayAnalysis | null
  className?: string
}

function getFactorIcon(
  type: DelayFactorType,
): LucideIcon {
  switch (type) {
    case 'current':
      return ActivityIcon

    case 'historical':
      return HistoryIcon

    case 'network':
      return NetworkIcon

    case 'speed':
      return GaugeIcon

    case 'preceding-train':
      return TrainFrontIcon

    case 'weather':
      return CloudSunIcon

    case 'ml':
      return SparklesIcon

    case 'event':
      return AlertTriangleIcon

    default:
      return InfoIcon
  }
}

function formatImpact(
  minutes: number,
  available = true,
): string {
  if (!available) {
    return 'Unavailable'
  }

  if (minutes > 0) {
    return `+${minutes} min`
  }

  if (minutes < 0) {
    return `−${Math.abs(minutes)} min`
  }

  return '0 min'
}

function formatGeneratedAt(
  value?: string,
): string {
  if (!value) return ''

  const match = value.match(
    /T(\d{2}):(\d{2})/,
  )

  if (match) {
    return `${match[1]}:${match[2]}`
  }

  return value
}

export function DelayAnalysisSection({
  analysis,
  className,
}: DelayAnalysisProps) {
  if (!analysis) {
    return null
  }

  const {
    currentDelayMinutes,
    predictedDelayMinutes,
    scheduledArrival,
    predictedArrival,
    factors = [],
    predictionBasis = [],
    generatedAt,
  } = analysis

  const maxImpact = useMemo(() => {
    const impacts = factors
      .filter((factor) => factor.available)
      .map((factor) =>
        Math.abs(
          factor.impactMinutes,
        ),
      )

    return Math.max(
      10,
      ...impacts,
    )
  }, [factors])

  return (
    <Card
      className={cn(
        'border-border/60 bg-card/80 shadow-card backdrop-blur-xs',
        className,
      )}
    >
      {/* Header */}
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
                Delay Analysis
              </CardTitle>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                <SparklesIcon className="size-3" />
                Live prediction
              </span>
            </div>

            <CardDescription className="text-xs text-muted-foreground">
              Current live conditions and backend ETA prediction factors
            </CardDescription>
          </div>

          {generatedAt && (
            <span className="self-start font-mono text-[11px] text-muted-foreground sm:self-auto">
              Updated {formatGeneratedAt(generatedAt)}
            </span>
          )}
        </div>

        {/* Summary strip */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-3 sm:grid-cols-4 sm:gap-4">

          {/* Current Delay */}
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current Delay
            </span>

            <div className="flex items-baseline gap-1.5 pt-0.5">
              <span
                className={cn(
                  'font-display text-xl font-extrabold tabular-nums sm:text-2xl',
                  currentDelayMinutes > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {currentDelayMinutes > 0
                  ? `+${currentDelayMinutes} min`
                  : 'On time'}
              </span>
            </div>

            <span className="text-[10px] text-muted-foreground">
              Live observed delay
            </span>
          </div>

          {/* Scheduled */}
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Scheduled Arrival
            </span>

            <span className="pt-0.5 font-display text-xl font-bold tabular-nums text-foreground sm:text-2xl">
              {scheduledArrival || '—'}
            </span>

            <span className="text-[10px] text-muted-foreground">
              Timetable
            </span>
          </div>

          {/* Predicted ETA */}
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Predicted ETA
            </span>

            <span className="pt-0.5 font-display text-xl font-extrabold tabular-nums text-foreground sm:text-2xl">
              {predictedArrival || '—'}
            </span>

            <span className="text-[10px] text-muted-foreground">
              Backend forecast
            </span>
          </div>

          {/* Destination Delay */}
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Destination Delay
            </span>

            <div className="flex items-baseline gap-1.5 pt-0.5">
              <span
                className={cn(
                  'font-display text-xl font-extrabold tabular-nums sm:text-2xl',
                  predictedDelayMinutes > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {predictedDelayMinutes > 0
                  ? `+${predictedDelayMinutes} min`
                  : 'On time'}
              </span>
            </div>

            <span className="text-[10px] text-muted-foreground">
              Forecasted terminal delay
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 pt-5">

        {/* Factors */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Contributing Factors
            </span>

            <span className="text-[11px] text-muted-foreground">
              {factors.filter(
                (factor) =>
                  factor.available,
              ).length}{' '}
              available
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {factors.map((factor) => {
              const Icon =
                getFactorIcon(
                  factor.type,
                )

              const isPositive =
                factor.impactMinutes > 0

              const isNegative =
                factor.impactMinutes < 0

              const isNeutral =
                factor.impactMinutes === 0

              const barWidthPct =
                Math.min(
                  100,
                  Math.max(
                    8,
                    (Math.abs(
                      factor.impactMinutes,
                    ) /
                      maxImpact) *
                      100,
                  ),
                )

              return (
                <div
                  key={factor.id}
                  className={cn(
                    'group relative flex flex-col justify-between gap-3 rounded-xl border p-3.5 transition-all duration-200 hover:border-border hover:shadow-xs',

                    !factor.available
                      ? 'border-border/40 bg-muted/10 opacity-70'
                      : isPositive
                        ? 'border-border/60 bg-card/60'
                        : isNegative
                          ? 'border-emerald-500/20 bg-emerald-500/5'
                          : 'border-border/50 bg-card/40',
                  )}
                >
                  {/* Factor title */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-lg border',

                          isPositive
                            ? 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : isNegative
                              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'border-border/60 bg-muted/40 text-muted-foreground',
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>

                      <span className="font-display text-xs font-semibold text-foreground">
                        {factor.label}
                      </span>
                    </div>

                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center justify-center rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums',

                        !factor.available
                          ? 'bg-muted text-muted-foreground'
                          : isPositive
                            ? 'border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : isNegative
                              ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'border border-border/50 bg-muted/30 text-muted-foreground',
                      )}
                    >
                      {formatImpact(
                        factor.impactMinutes,
                        factor.available,
                      )}
                    </span>
                  </div>

                  {/* Magnitude */}
                  {factor.available &&
                    !isNeutral && (
                      <div className="flex flex-col gap-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              isPositive
                                ? 'bg-amber-500'
                                : 'bg-emerald-500',
                            )}
                            style={{
                              width: `${barWidthPct}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                  {/* Description */}
                  {factor.description && (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {factor.description}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Prediction basis */}
        {predictionBasis.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/15 p-3.5">
            <div className="flex items-center gap-1.5">
              <CpuIcon className="size-3.5 text-primary" />

              <span className="text-xs font-bold text-foreground">
                Prediction Basis
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              {predictionBasis.map(
                (basis, idx) => (
                  <div
                    key={`${basis}-${idx}`}
                    className="flex items-center gap-2"
                  >
                    <span className="rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground/90 shadow-2xs">
                      {basis}
                    </span>

                    {idx <
                      predictionBasis.length -
                        1 && (
                      <span
                        className="font-semibold text-muted-foreground/60"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Data-source note */}
        <div className="flex flex-col gap-1.5 border-t border-border/40 pt-3 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Prediction is generated by the backend using live train data and the configured ETA model.
          </span>

          <span className="font-mono">
            Dynamic ETA
          </span>
        </div>
      </CardContent>
    </Card>
  )
}