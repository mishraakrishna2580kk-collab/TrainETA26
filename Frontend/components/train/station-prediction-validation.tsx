
'use client'

import { useMemo } from 'react'
import { CheckCircle2Icon, Clock3Icon, TargetIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { StationStop } from '@/lib/types'

interface StationPredictionValidationProps {
  stations: StationStop[]
  className?: string
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  const match = value.match(/T(\d{2}):(\d{2})/)
  if (match) return `${match[1]}:${match[2]}`
  return value.length >= 5 ? value.slice(0, 5) : value
}

function formatError(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return `${Math.abs(Math.round(value * 10) / 10)} min`
}

export function StationPredictionValidation({
  stations,
  className,
}: StationPredictionValidationProps) {
  const validation = useMemo(() => {
    return stations.map((station) => {
      const hasActual = Boolean(station.actualArrival)
      const calculatedError =
        hasActual && station.predictedArrival
          ? station.predictionErrorMinutes ?? null
          : null

      return {
        station,
        hasActual,
        error: calculatedError,
      }
    })
  }, [stations])

  const validated = validation.filter((item) => item.hasActual && item.error != null)
  const awaiting = validation.filter((item) => !item.hasActual)
  const averageError = validated.length
    ? validated.reduce((sum, item) => sum + Math.abs(item.error ?? 0), 0) / validated.length
    : null

  return (
    <Card className={cn('border-border/60 bg-card/80 shadow-card backdrop-blur-xs', className)}>
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-display text-base font-bold tracking-tight sm:text-lg">
                Station-Level Prediction Validation
              </CardTitle>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                Live validation
              </span>
            </div>
            <CardDescription className="mt-1 text-xs">
              Compare the forecast with the actual arrival for the same journey when it becomes available.
              This section validates the prediction; it does not replace the scheduled timetable.
            </CardDescription>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <CheckCircle2Icon className="size-3.5" /> Validated
            </div>
            <div className="mt-1 font-display text-lg font-bold">{validated.length}</div>
            <div className="text-[10px] text-muted-foreground">stations with actual arrival</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock3Icon className="size-3.5" /> Awaiting
            </div>
            <div className="mt-1 font-display text-lg font-bold">{awaiting.length}</div>
            <div className="text-[10px] text-muted-foreground">actual arrival not received</div>
          </div>
          <div className="col-span-2 rounded-xl border border-border/60 bg-muted/20 p-3 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <TargetIcon className="size-3.5" /> Avg. error
            </div>
            <div className="mt-1 font-display text-lg font-bold">{averageError == null ? '—' : formatError(averageError)}</div>
            <div className="text-[10px] text-muted-foreground">validated stations only</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="hidden md:block">
          <div className="grid grid-cols-12 gap-3 border-b border-border/60 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-3">Station</div>
            <div className="col-span-2 text-right">Scheduled</div>
            <div className="col-span-2 text-right">Predicted</div>
            <div className="col-span-2 text-right">Actual</div>
            <div className="col-span-1 text-right">Error</div>
            <div className="col-span-2 text-right">Status</div>
          </div>
          <div className="divide-y divide-border/50">
            {validation.map(({ station, hasActual, error }) => (
              <div key={station.code} className="grid grid-cols-12 items-center gap-3 py-3">
                <div className="col-span-3 min-w-0">
                  <div className="truncate text-sm font-semibold">{station.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{station.code}</div>
                </div>
                <div className="col-span-2 text-right font-mono text-xs">{formatTime(station.arrival)}</div>
                <div className="col-span-2 text-right font-mono text-xs">{formatTime(station.predictedArrival)}</div>
                <div className="col-span-2 text-right font-mono text-xs">
                  {hasActual ? formatTime(station.actualArrival) : '—'}
                </div>
                <div className="col-span-1 text-right font-mono text-xs font-semibold">
                  {hasActual ? formatError(error) : '—'}
                </div>
                <div className="col-span-2 text-right">
                  {hasActual ? (
                    <span className="inline-flex rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Validated</span>
                  ) : (
                    <span className="inline-flex rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[10px] font-medium text-muted-foreground">Awaiting actual arrival</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 md:hidden">
          {validation.map(({ station, hasActual, error }) => (
            <div key={station.code} className="rounded-xl border border-border/60 bg-muted/15 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{station.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{station.code}</div>
                </div>
                <span className="shrink-0 rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] font-medium">
                  {hasActual ? 'Validated' : 'Awaiting'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Scheduled</span><div className="font-mono font-semibold">{formatTime(station.arrival)}</div></div>
                <div><span className="text-muted-foreground">Predicted</span><div className="font-mono font-semibold">{formatTime(station.predictedArrival)}</div></div>
                <div><span className="text-muted-foreground">Actual</span><div className="font-mono font-semibold">{hasActual ? formatTime(station.actualArrival) : 'Awaiting actual arrival'}</div></div>
                <div><span className="text-muted-foreground">Prediction error</span><div className="font-mono font-semibold">{hasActual ? formatError(error) : '—'}</div></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
