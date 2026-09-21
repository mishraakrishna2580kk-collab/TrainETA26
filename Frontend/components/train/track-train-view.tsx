'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  LayersIcon,
  MapPinIcon,
  RefreshCwIcon,
  TrainFrontIcon,
  WifiOffIcon,
} from 'lucide-react'
import { useLiveRefresh } from '@/hooks/use-live-refresh'
import type { FreshnessState } from '@/lib/live-refresh-config'
import type { LiveTrainStatus, Train } from '@/lib/types'
import { TrackingSkeleton } from '@/components/states/loading-skeletons'
import { EmptyState, ErrorState } from '@/components/states/status-states'
import { LiveIndicator } from '@/components/train/live-indicator'
import { StatusBadge } from '@/components/train/status-badge'
import { EtaCard } from '@/components/train/eta-card'
import { LiveStats } from '@/components/train/live-stats'
import { StationTimeline } from '@/components/train/station-timeline'
import { StationPredictionValidation } from '@/components/train/station-prediction-validation'
import { DelayAnalysisSection } from '@/components/train/delay-analysis'
import { OperationalAlerts } from '@/components/train/operational-alerts'
import { NetworkStatusSection } from '@/components/train/network-status'
import {
  TrackingViewSwitcher,
  type TrackingViewMode,
} from '@/components/train/tracking-view-switcher'
import { OperationsOverviewCard } from '@/components/train/operations-overview-card'
import { SaveTrainButton } from '@/components/train/save-train-button'

const RailwayRouteMap = dynamic(
  () =>
    import('@/components/map/railway-route-map').then(
      (mod) => mod.RailwayRouteMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[380px] w-full animate-pulse items-center justify-center rounded-2xl border border-border/70 bg-card/60 font-mono text-xs text-muted-foreground sm:h-[450px] lg:h-[520px]">
        Loading live railway radar...
      </div>
    ),
  },
)
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TrackTrainViewProps {
  trainNumber: string
}

function TrainIdentityBanner({
  train,
  status,
  freshness = 'live',
}: {
  train: Train
  status: LiveTrainStatus
  freshness?: FreshnessState
}) {
  return (
    <section
      aria-label="Train Identity"
      className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-card backdrop-blur-xs sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-mono text-sm font-bold text-primary shadow-2xs">
              {train.number}
            </span>
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {train.name}
            </h1>
          </div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {train.type} Express
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-sm text-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <MapPinIcon className="size-4 shrink-0 text-primary" />
              {train.from.station}
              <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-[11px] text-muted-foreground">
                {train.from.code}
              </span>
            </span>
            <span className="text-muted-foreground font-semibold">→</span>
            <span className="flex items-center gap-1.5 font-medium">
              {train.to.station}
              <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-[11px] text-muted-foreground">
                {train.to.code}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <LiveIndicator freshness={freshness} />
          <StatusBadge
            status={status.status}
            delayMinutes={status.delayMinutes}
            size="md"
          />
          <SaveTrainButton train={train} variant="full" />
        </div>
      </div>
    </section>
  )
}

function JourneyOverviewSummary({ train }: { train: Train }) {
  return (
    <section aria-label="Journey Details Summary">
      <Card className="border-border/60 bg-card/70 shadow-xs backdrop-blur-xs">
        <CardHeader className="border-b border-border/50 pb-3">
          <CardTitle className="text-sm font-semibold">
            Journey Overview
          </CardTitle>
          <CardDescription className="text-xs">
            Scheduled timings and coach amenities
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <ClockIcon className="size-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Scheduled Duration
              </span>
              <span className="font-display text-sm font-bold text-foreground">
                {train.duration}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Dep {train.from.time} · Arr {train.to.time}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-accent text-accent-foreground">
              <CalendarIcon className="size-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Runs On
              </span>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {train.runsOn.map((day) => (
                  <span
                    key={day}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground"
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-accent text-accent-foreground">
              <LayersIcon className="size-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Available Classes
              </span>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {train.classes.map((cls) => (
                  <span
                    key={cls}
                    className="rounded border border-primary/25 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary"
                  >
                    {cls}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

export function TrackTrainView({ trainNumber }: TrackTrainViewProps) {
  const {
    train,
    status,
    isLoading,
    isRefreshing,
    isStale,
    isOffline,
    freshness,
    elapsedText,
    error,
    triggerRefresh,
    intervalMs,
  } = useLiveRefresh(trainNumber)

  const [viewMode, setViewMode] = useState<TrackingViewMode>('passenger')

  // Loading state (initial load only; background auto-refreshes do not blank out the UI)
  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center justify-between">
          <Link
            href="/track"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Back to Track
          </Link>
        </div>
        <TrackingSkeleton />
      </div>
    )
  }

  // Initial Error state (only if no data exists)
  if (error && !train && !status) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-12 sm:px-6">
        <Link
          href="/track"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Track
        </Link>
        <ErrorState
          title={`Unable to load train ${trainNumber}`}
          description={
            error.message ||
            'We encountered an issue fetching live tracking data. Please try refreshing.'
          }
          onRetry={() => {
            void triggerRefresh(true)
          }}
        />
      </div>
    )
  }

  // Not found state
  if (!train || !status) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-12 sm:px-6">
        <Link
          href="/track"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Track
        </Link>
        <EmptyState
          icon={TrainFrontIcon}
          title={`Train ${trainNumber} not found`}
          description={`We couldn't find live tracking records for train number "${trainNumber}". Please check the number or choose from our running catalog.`}
          action={
            <Button render={<Link href="/track" />}>
              Browse Running Trains
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {/* Top Bar Navigation, View Switcher & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/track"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          <span>Back to Track</span>
        </Link>

        {/* View Switcher: Passenger vs Operations */}
        <div className="order-last flex w-full justify-center sm:order-none sm:w-auto">
          <TrackingViewSwitcher mode={viewMode} onModeChange={setViewMode} />
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden flex-col items-end text-right sm:flex">
            <span className="text-xs font-medium text-foreground/80 tabular-nums">
              {elapsedText}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Auto-refreshes every {Math.round(intervalMs / 1000)}s
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void triggerRefresh(true)}
            disabled={isRefreshing}
            className="gap-1.5"
            aria-label="Refresh live train data"
          >
            <RefreshCwIcon
              className={cn(
                'size-3.5',
                isRefreshing && 'motion-safe:animate-spin',
              )}
            />
            <span className="text-xs">
              {isRefreshing ? 'Updating...' : 'Refresh'}
            </span>
          </Button>
        </div>
      </div>

      {/* Network Connectivity & Freshness Advisories */}
      {isOffline && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200"
        >
          <div className="flex items-center gap-2">
            <WifiOffIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold">Offline:</span>
            <span>Showing last update. Auto-refresh will resume once reconnected.</span>
          </div>
          <span className="shrink-0 font-mono text-[11px] opacity-80 tabular-nums">
            {elapsedText}
          </span>
        </div>
      )}

      {!isOffline && isStale && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200"
        >
          <div className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-amber-500" />
            <span className="font-semibold">Live data may be outdated:</span>
            <span>Last successful telemetry sync was over 90 seconds ago.</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void triggerRefresh(true)}
            disabled={isRefreshing}
            className="h-7 px-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-500/20 dark:text-amber-100"
          >
            Retry Now
          </Button>
        </div>
      )}

      {viewMode === 'passenger' ? (
        /* ========================================================================= */
        /*  PASSENGER VIEW: Clean, travel-focused journey experience                 */
        /* ========================================================================= */
        <>
          {/* Passenger: 1. Train Identity Banner */}
          <TrainIdentityBanner
            train={train}
            status={status}
            freshness={freshness}
          />

          {/* Passenger: 2. ETA Card - Most Prominent Section */}
          <section aria-label="Estimated Arrival & Live Status">
            <EtaCard
              live={status}
              train={train}
              freshness={freshness}
              elapsedText={elapsedText}
            />
          </section>

          <section
            aria-label="ETA Passenger Guidance"
            className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 sm:px-5"
          >
            <div className="flex items-start gap-3">
              <ClockIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1 text-xs leading-relaxed">
                <p className="font-semibold text-foreground">
                  Current ETA is an estimate, not a guaranteed arrival time.
                </p>
                <p className="text-muted-foreground">
                  The ETA can change as live train conditions change. Keep the scheduled timetable visible for planning and do not treat the current ETA as a replacement for the scheduled time.
                </p>
              </div>
            </div>
          </section>

          {/* Passenger: 3. Interactive Railway Route Map */}
          <section aria-label="Interactive Railway Route Map">
            <RailwayRouteMap train={train} live={status} />
          </section>

          {/* Passenger: 4. ETA Route Forecast Timeline */}
          <section aria-label="ETA Route Forecast and Station Progression">
            <StationTimeline
              stations={status.stations}
              currentDelayMinutes={status.delayMinutes}
              destinationEta={status.eta}
            />
          </section>

          {/* Passenger: 5. Station-level prediction validation */}
          <section aria-label="Station-Level Prediction Validation">
            <StationPredictionValidation stations={status.stations} />
          </section>

          {/* Passenger: 5. Active Corridor Advisories */}
          <section aria-label="Active Corridor Advisories">
            <OperationalAlerts
              events={status.operationalEvents}
              variant="passenger"
            />
          </section>

          {/* Passenger: 6. Journey Schedule Summary */}
          <JourneyOverviewSummary train={train} />
        </>
      ) : (
        /* ========================================================================= */
        /*  OPERATIONS VIEW: Dense railway network telemetry & operational oversight */
        /* ========================================================================= */
        <>
          {/* Operations: 1. Operations Overview Header */}
          <section aria-label="Operations Overview and Corridor Monitoring">
            <OperationsOverviewCard train={train} live={status} />
          </section>

          {/* Operations: 2. Train Identity Banner */}
          <TrainIdentityBanner
            train={train}
            status={status}
            freshness={freshness}
          />

          {/* Operations: 3. Network & Congestion Status */}
          <section aria-label="Network and Congestion Status">
            <NetworkStatusSection status={status.networkStatus} />
          </section>

          {/* Operations: 4. Delay Analysis & Contributing Factors */}
          {status.delayAnalysis && (
            <section aria-label="Delay Analysis and Contributing Factors">
              <DelayAnalysisSection analysis={status.delayAnalysis} />
            </section>
          )}

          {/* Operations: 5. Operational Alerts & Events Feed */}
          <section aria-label="Operational Alerts and Corridor Events">
            <OperationalAlerts
              events={status.operationalEvents}
              variant="full"
            />
          </section>

          {/* Operations: 6. Dynamic ETA Card */}
          <section aria-label="Estimated Arrival & Live Status">
            <EtaCard
              live={status}
              train={train}
              freshness={freshness}
              elapsedText={elapsedText}
            />
          </section>

          {/* Operations: 7. Live Journey Statistics */}
          <section aria-label="Live Journey Statistics">
            <LiveStats live={status} />
          </section>

          {/* Operations: 8. ETA Route Forecast Timeline */}
          <section aria-label="ETA Route Forecast and Station Progression">
            <StationTimeline
              stations={status.stations}
              currentDelayMinutes={status.delayMinutes}
              destinationEta={status.eta}
            />
          </section>

          {/* Operations: 9. Interactive Railway Route Map */}
          <section aria-label="Interactive Railway Route Map">
            <RailwayRouteMap train={train} live={status} />
          </section>

          {/* Operations: 10. Journey Schedule Summary */}
          <JourneyOverviewSummary train={train} />
        </>
      )}
    </div>
  )
}
