'use client'

import { useId, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ActivityIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  CloudSunIcon,
  GaugeIcon,
  GitBranchIcon,
  InfoIcon,
  MapPinIcon,
  RadioIcon,
  RouteIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  WrenchIcon,
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
  OperationalEvent,
  OperationalEventSeverity,
  OperationalEventType,
} from '@/lib/types'

export interface OperationalAlertsProps {
  events?: OperationalEvent[]
  isLoading?: boolean
  error?: string | null
  className?: string
  variant?: 'full' | 'passenger'
}

type FilterTab = 'active' | 'resolved' | 'all'

/**
 * Maps operational event types to contextual Lucide icons.
 */
function getEventTypeIcon(type: OperationalEventType): LucideIcon {
  switch (type) {
    case 'congestion':
      return GitBranchIcon
    case 'speed-restriction':
      return GaugeIcon
    case 'delay':
      return ClockIcon
    case 'weather':
      return CloudSunIcon
    case 'track-issue':
      return WrenchIcon
    case 'operational':
      return ShieldCheckIcon
    case 'unscheduled':
      return AlertTriangleIcon
    default:
      return AlertCircleIcon
  }
}

/**
 * Human-friendly labels for operational event types.
 */
function getEventTypeLabel(type: OperationalEventType): string {
  switch (type) {
    case 'congestion':
      return 'Congestion'
    case 'speed-restriction':
      return 'Speed Restriction'
    case 'delay':
      return 'Operating Delay'
    case 'weather':
      return 'Weather & Traction'
    case 'track-issue':
      return 'Track / Infrastructure'
    case 'operational':
      return 'Operational Check'
    case 'unscheduled':
      return 'Unscheduled Event'
    default:
      return 'Advisory'
  }
}

/**
 * Severity visual configurations for borders, badges, and accents.
 */
function getSeverityStyles(severity: OperationalEventSeverity) {
  switch (severity) {
    case 'critical':
      return {
        cardBorder: 'border-l-rose-500 border-rose-500/30 bg-rose-500/5',
        badge:
          'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
        iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
        label: 'CRITICAL',
      }
    case 'warning':
      return {
        cardBorder: 'border-l-amber-500 border-amber-500/30 bg-amber-500/5',
        badge:
          'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        label: 'WARNING',
      }
    case 'info':
    default:
      return {
        cardBorder: 'border-l-sky-500 border-sky-500/30 bg-sky-500/5',
        badge:
          'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
        iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
        label: 'ADVISORY',
      }
  }
}

export function OperationalAlerts({
  events = [],
  isLoading = false,
  error = null,
  className,
  variant = 'full',
}: OperationalAlertsProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('active')
  const baseId = useId()
  const isPassenger = variant === 'passenger'

  const counts = useMemo(() => {
    const active = events.filter((e) => e.active).length
    const resolved = events.filter((e) => !e.active).length
    const warnings = events.filter((e) => e.severity === 'warning' && e.active).length
    const infos = events.filter((e) => e.severity === 'info' && e.active).length
    const criticals = events.filter((e) => e.severity === 'critical' && e.active).length
    return {
      all: events.length,
      active,
      resolved,
      warnings,
      infos,
      criticals,
    }
  }, [events])

  const filteredEvents = useMemo(() => {
    if (isPassenger) {
      return events.filter((e) => e.active)
    }
    switch (activeTab) {
      case 'active':
        return events.filter((e) => e.active)
      case 'resolved':
        return events.filter((e) => !e.active)
      case 'all':
      default:
        return events
    }
  }, [events, activeTab, isPassenger])

  return (
    <Card
      className={cn(
        'border-border/60 bg-card/80 shadow-card backdrop-blur-xs',
        className,
      )}
    >
      {/* Header */}
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
                {isPassenger ? 'Active Corridor Advisories' : 'Operational Alerts & Events'}
              </CardTitle>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                <RadioIcon className="size-3 animate-pulse" />
                Live Corridor Feed
              </span>
              {counts.active > 0 ? (
                <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.2 font-mono text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  {counts.active} Active
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.2 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  All Clear
                </span>
              )}
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              {isPassenger
                ? 'Important operational notices affecting your journey'
                : 'Real-time corridor advisories, section congestion, and track updates'}
            </CardDescription>
          </div>

          {/* Demonstration Notice Badge */}
          <div className="flex items-center gap-1.5 self-start rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground sm:self-auto">
            <InfoIcon className="size-3.5 shrink-0 text-primary" />
            <span>
              {isPassenger
                ? 'Passenger Advisory Mode'
                : 'Simulated corridor feed (API-ready)'}
            </span>
          </div>
        </div>

        {/* Quick Summary Metrics Strip */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 sm:gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active Alerts
            </span>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="relative flex size-2">
                <span
                  className={cn(
                    'absolute inline-flex h-full w-full rounded-full opacity-75',
                    counts.active > 0
                      ? 'animate-ping bg-amber-400'
                      : 'bg-emerald-400',
                  )}
                />
                <span
                  className={cn(
                    'relative inline-flex size-2 rounded-full',
                    counts.active > 0 ? 'bg-amber-500' : 'bg-emerald-500',
                  )}
                />
              </span>
              <span className="font-display text-lg font-bold tabular-nums text-foreground sm:text-xl">
                {counts.active}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Affecting corridor
            </span>
          </div>

          <div className="flex flex-col border-x border-border/40 px-2 sm:px-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Warnings / Issues
            </span>
            <div className="flex items-center gap-1.5 pt-0.5">
              <AlertTriangleIcon className="size-3.5 text-amber-500" />
              <span className="font-display text-lg font-bold tabular-nums text-foreground sm:text-xl">
                {counts.warnings + counts.criticals}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Caution & delays
            </span>
          </div>

          <div className="flex flex-col pl-1 sm:pl-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Advisories / Info
            </span>
            <div className="flex items-center gap-1.5 pt-0.5">
              <ActivityIcon className="size-3.5 text-sky-500" />
              <span className="font-display text-lg font-bold tabular-nums text-foreground sm:text-xl">
                {counts.infos}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Corridor telemetry
            </span>
          </div>
        </div>

        {/* Filter Segmented Control Tabs (Operations Mode Only) */}
        {!isPassenger ? (
          <div className="mt-4 flex items-center justify-between gap-2">
            <div
              role="tablist"
              aria-label="Filter operational alerts"
              className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-1 text-xs"
            >
            <button
              type="button"
              role="tab"
              id={`${baseId}-tab-active`}
              aria-selected={activeTab === 'active'}
              aria-controls={`${baseId}-panel`}
              onClick={() => setActiveTab('active')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all',
                activeTab === 'active'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>Active</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 font-mono text-[10px] font-semibold',
                  activeTab === 'active'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {counts.active}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              id={`${baseId}-tab-resolved`}
              aria-selected={activeTab === 'resolved'}
              aria-controls={`${baseId}-panel`}
              onClick={() => setActiveTab('resolved')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all',
                activeTab === 'resolved'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>Resolved</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 font-mono text-[10px] font-semibold',
                  activeTab === 'resolved'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {counts.resolved}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              id={`${baseId}-tab-all`}
              aria-selected={activeTab === 'all'}
              aria-controls={`${baseId}-panel`}
              onClick={() => setActiveTab('all')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all',
                activeTab === 'all'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>All</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 font-mono text-[10px] font-semibold',
                  activeTab === 'all'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {counts.all}
              </span>
            </button>
          </div>

          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
              Showing {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}
            </span>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Active corridor notices ({filteredEvents.length})</span>
            <span className="font-mono text-[11px]">Filtered for passenger travel</span>
          </div>
        )}
      </CardHeader>

      {/* Main Content Area */}
      <CardContent
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${activeTab}`}
        className="pt-4"
      >
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col gap-3 py-4">
            <div className="h-20 w-full animate-pulse rounded-xl bg-muted/40" />
            <div className="h-20 w-full animate-pulse rounded-xl bg-muted/40" />
            <div className="h-20 w-full animate-pulse rounded-xl bg-muted/40" />
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircleIcon className="size-4 shrink-0" />
            <p>Failed to load operational events: {error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 py-8 text-center sm:py-10">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheckIcon className="size-5" />
            </div>
            <h4 className="mt-3 text-sm font-semibold text-foreground">
              {activeTab === 'active'
                ? 'No active operational alerts'
                : activeTab === 'resolved'
                  ? 'No resolved events on record'
                  : 'No operational events reported'}
            </h4>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {activeTab === 'active'
                ? 'All corridor sections report clear track operations and normal headway.'
                : 'Corridor updates and clearance events will appear here as they occur.'}
            </p>
          </div>
        )}

        {/* Events List */}
        {!isLoading && !error && filteredEvents.length > 0 && (
          <div className="flex flex-col gap-3">
            {filteredEvents.map((event) => {
              const Icon = getEventTypeIcon(event.type)
              const styles = getSeverityStyles(event.severity)
              const typeLabel = getEventTypeLabel(event.type)

              return (
                <div
                  key={event.id}
                  className={cn(
                    'group relative flex flex-col gap-2.5 rounded-xl border border-border/70 border-l-4 p-3.5 transition-all sm:p-4',
                    styles.cardBorder,
                  )}
                >
                  {/* Top line: Icon + Title + Badges */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                          styles.iconBg,
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-display text-sm font-bold text-foreground">
                            {event.title}
                          </h4>
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.2 font-mono text-[10px] font-bold uppercase tracking-wider',
                              styles.badge,
                            )}
                          >
                            {styles.label}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-[10px] font-semibold text-muted-foreground">
                            {typeLabel}
                          </span>
                        </div>

                        {/* Location context (Station or Section) */}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          {event.section && (
                            <span className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                              <RouteIcon className="size-3 text-primary" />
                              <span>{event.section}</span>
                            </span>
                          )}
                          {event.station && (
                            <span className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                              <MapPinIcon className="size-3 text-primary" />
                              <span>
                                {event.station}
                                {event.stationCode ? ` (${event.stationCode})` : ''}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Active / Resolved Status Badge */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {event.active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="relative flex size-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                          </span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                          <CheckCircle2Icon className="size-3 text-muted-foreground" />
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message / Description */}
                  <p className="text-xs leading-relaxed text-muted-foreground sm:pl-11">
                    {event.message}
                  </p>

                  {/* Footer / Timestamps */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-2 text-[11px] text-muted-foreground sm:pl-11">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3" />
                      <span>Reported: {event.occurredAt}</span>
                    </span>
                    {event.resolvedAt && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <span>•</span>
                        <CheckCircle2Icon className="size-3" />
                        <span>Resolved: {event.resolvedAt}</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Bottom Disclaimer and API Contract Ribbon */}
        <div className="mt-5 flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldAlertIcon className="size-3.5 shrink-0 text-primary" />
            <span>
              {isPassenger
                ? 'Information synchronized with live railway signaling and headway telemetry.'
                : 'Mock operational events for testing corridor advisory integration.'}
            </span>
          </div>
          {!isPassenger && (
            <div className="font-mono text-[10px] text-muted-foreground">
              Endpoint: GET /trains/{'{train_number}'}/events
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
