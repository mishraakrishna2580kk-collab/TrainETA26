'use client'

import { useEffect, useState } from 'react'
import { TrainFrontIcon } from 'lucide-react'
import { StatusBadge } from '@/components/train/status-badge'
import { LiveIndicator } from '@/components/train/live-indicator'
import type { LiveTrainStatus, Train } from '@/lib/types'
import type { FreshnessState } from '@/lib/live-refresh-config'

export interface EtaCardProps {
  live: LiveTrainStatus
  train: Train
  freshness?: FreshnessState
  elapsedText?: string
}

export function EtaCard({
  live,
  train,
  freshness = 'live',
  elapsedText: externalElapsedText,
}: EtaCardProps) {
  const progressPct = Math.round(
    Math.max(0, Math.min(1, live.progress)) * 100,
  )

  const clampedPct = Math.max(
    0,
    Math.min(100, progressPct),
  )

  const cancelled = live.status === 'cancelled'

  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (externalElapsedText !== undefined) return

    setElapsedSeconds(0)

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [live, externalElapsedText])

  function formatElapsed(sec: number): string {
    if (sec < 5) return 'Updated just now'
    if (sec < 60) return `Updated ${sec}s ago`

    const mins = Math.floor(sec / 60)

    return `Updated ${mins}m ago`
  }

  const displayElapsed =
    externalElapsedText ??
    formatElapsed(elapsedSeconds)

  /*
   * Current station label used directly above
   * the live train marker.
   */
  const currentStation =
    live.currentStation?.trim() ||
    'Current position'

  const nextStation =
    live.nextStation?.trim() ||
    'Next station'

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card to-muted/30 p-6 shadow-elevated sm:p-8">
      {/* Ambient background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl"
      />

      <div className="relative flex flex-col gap-6 sm:gap-7">
        {/* Top telemetry status bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <LiveIndicator freshness={freshness} />

            <span className="size-1 rounded-full bg-border" />

            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {displayElapsed}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge
              status={live.status}
              delayMinutes={live.delayMinutes}
              size="md"
            />
          </div>
        </div>

        {/* Hero ETA Display */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1.4fr_1fr] sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Predicted Arrival
            </span>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-display text-5xl font-extrabold tracking-tight tabular-nums text-foreground sm:text-6xl">
                {live.eta}
              </span>

              {!cancelled &&
                live.delayMinutes > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-muted/80 px-2.5 py-1 text-xs font-bold text-warning-foreground dark:text-warning ring-1 ring-warning/30">
                    +{live.delayMinutes}m delay
                  </span>
                )}

              {!cancelled &&
                live.delayMinutes === 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-muted/80 px-2.5 py-1 text-xs font-bold text-success-foreground dark:text-success ring-1 ring-success/30">
                    On Time
                  </span>
                )}
            </div>

            <p className="text-xs text-muted-foreground sm:text-sm">
              Terminal:{' '}
              <strong className="text-foreground">
                {train.to.station} ({train.to.code})
              </strong>

              {live.delayMinutes > 0 &&
                !cancelled && (
                  <>
                    {' · '}

                    <span className="line-through text-muted-foreground/70">
                      Scheduled {live.originalArrival}
                    </span>
                  </>
                )}
            </p>
          </div>

          {/* Current Position & Next Stop */}
          <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-muted/40 p-4 sm:items-end sm:text-right">
            <div className="flex flex-col">
              <span className="text-[0.7rem] font-bold tracking-wider text-muted-foreground uppercase">
                {cancelled
                  ? 'Running Status'
                  : 'Current Station'}
              </span>

              <span className="font-display text-lg font-bold text-foreground">
                {cancelled
                  ? 'Service Cancelled'
                  : currentStation}
              </span>
            </div>

            {!cancelled && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Next Station:</span>

                <span className="font-semibold text-foreground">
                  {nextStation}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Live Journey Progress */}
        {!cancelled && (
          <div className="flex flex-col gap-2.5 pt-2">
            {/* Route labels */}
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1 text-foreground font-semibold">
                <span>{train.from.code}</span>

                <span className="hidden text-[0.7rem] font-normal text-muted-foreground sm:inline">
                  ({train.from.city})
                </span>
              </span>

              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[0.68rem] font-bold text-primary">
                {clampedPct}% completed
              </span>

              <span className="flex items-center gap-1 text-foreground font-semibold">
                <span className="hidden text-[0.7rem] font-normal text-muted-foreground sm:inline">
                  ({train.to.city})
                </span>

                <span>{train.to.code}</span>
              </span>
            </div>

            {/* Current station indicator */}
            <div className="relative h-7">
              <div
                className="absolute -translate-x-1/2 transition-all duration-500"
                style={{
                  left: `${clampedPct}%`,
                }}
              >
                <div className="flex max-w-[180px] flex-col items-center">
                  <span className="max-w-[180px] truncate rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary shadow-sm">
                    {currentStation}
                  </span>

                  <span
                    aria-hidden
                    className="mt-0.5 size-0 border-x-[4px] border-x-transparent border-t-[5px] border-t-primary"
                  />
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div
              role="progressbar"
              aria-valuenow={clampedPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Journey progress. Train is currently at ${currentStation}.`}
              className="relative h-2.5 w-full rounded-full bg-muted shadow-inner"
            >
              {/* Completed route */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 shadow-sm"
                style={{
                  width: `${clampedPct}%`,
                }}
              />

              {/* Live train marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-500"
                style={{
                  left: `clamp(14px, ${clampedPct}%, calc(100% - 14px))`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-3 ring-card">
                  <TrainFrontIcon className="size-3.5" />
                </span>
              </div>
            </div>

            {/* Current → next station */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground sm:text-[11px]">
              <span className="font-semibold text-foreground">
                {currentStation}
              </span>

              <span>→</span>

              <span>
                {nextStation}
              </span>
            </div>

            {/* Journey statistics */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[0.72rem] text-muted-foreground">
              <span>
                Departed {train.from.time}
              </span>

              <span className="font-semibold text-foreground tabular-nums">
                {Number.isFinite(
                  live.distanceRemaining,
                )
                  ? `${live.distanceRemaining} km remaining`
                  : 'Distance unavailable'}
              </span>

              <span>
                ETA {live.eta}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}