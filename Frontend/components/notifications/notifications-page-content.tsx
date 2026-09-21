'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BellCheckIcon,
  BellIcon,
  CheckCheckIcon,
  RefreshCwIcon,
  TrainFrontIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { NotificationCard } from '@/components/notifications/notification-card'
import { TrainListSkeleton } from '@/components/states/loading-skeletons'
import { EmptyState, ErrorState } from '@/components/states/status-states'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/lib/hooks'
import type { AppNotification } from '@/lib/types'
import { cn } from '@/lib/utils'

type FilterCategory = 'all' | 'unread' | 'delay' | 'platform' | 'journey'

export function NotificationsPageContent() {
  const { notifications, unread, isLoading, error, mutate } = useNotifications()
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  async function handleRefresh() {
    setIsRefreshing(true)
    try {
      await mutate()
      toast.success('Notifications refreshed')
    } catch {
      toast.error('Failed to refresh notifications')
    } finally {
      setIsRefreshing(false)
    }
  }

  function handleMarkAllAsRead() {
    if (!notifications || notifications.length === 0) return
    const updated: AppNotification[] = notifications.map((n) => ({
      ...n,
      read: true,
    }))
    void mutate(updated, false)
    toast.success('All notifications marked as read')
  }

  const filteredNotifications = useMemo(() => {
    if (!notifications) return []

    switch (activeFilter) {
      case 'unread':
        return notifications.filter((n) => !n.read)
      case 'delay':
        return notifications.filter((n) => n.type === 'delay')
      case 'platform':
        return notifications.filter((n) => n.type === 'platform')
      case 'journey':
        return notifications.filter(
          (n) => n.type === 'arrival' || n.type === 'departure',
        )
      case 'all':
      default:
        return notifications
    }
  }, [notifications, activeFilter])

  // Split into Today vs Earlier
  const { todayList, earlierList } = useMemo(() => {
    const today: AppNotification[] = []
    const earlier: AppNotification[] = []

    filteredNotifications.forEach((n) => {
      const timeLower = n.time.toLowerCase()
      if (timeLower.includes('yesterday') || timeLower.includes('/')) {
        earlier.push(n)
      } else {
        today.push(n)
      }
    })

    return { todayList: today, earlierList: earlier }
  }, [filteredNotifications])

  const filterTabs: { id: FilterCategory; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: notifications?.length ?? 0 },
    { id: 'unread', label: 'Unread', count: unread },
    {
      id: 'delay',
      label: 'Delays',
      count: notifications?.filter((n) => n.type === 'delay').length ?? 0,
    },
    {
      id: 'platform',
      label: 'Platform',
      count: notifications?.filter((n) => n.type === 'platform').length ?? 0,
    },
    {
      id: 'journey',
      label: 'Schedule',
      count:
        notifications?.filter(
          (n) => n.type === 'arrival' || n.type === 'departure',
        ).length ?? 0,
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 md:py-10">
      {/* Header section */}
      <section className="relative flex flex-col gap-3">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute -left-20 -top-16 -z-10 size-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <BellIcon className="size-3.5" />
            Live Train Alerts
          </span>
          {unread > 0 && (
            <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
              {unread} unread
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Notifications
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Stay updated about delays, platforms, arrivals, and departures for
              your trains.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <CheckCheckIcon className="size-3.5" />
                <span>Mark all read</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh notifications"
              className="size-8"
            >
              <RefreshCwIcon
                className={cn('size-3.5', isRefreshing && 'animate-spin')}
              />
            </Button>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      {!isLoading && notifications && notifications.length > 0 && (
        <section aria-label="Notification filters">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
            {filterTabs.map((tab) => {
              const active = activeFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'border border-border/70 bg-card/60 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground',
                  )}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 font-mono text-[10px] font-semibold',
                        active
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Main Notifications Feed */}
      <section aria-label="Alerts feed" className="flex flex-col gap-6">
        {/* Loading state */}
        {isLoading && <TrainListSkeleton count={4} />}

        {/* Error state */}
        {error && (
          <ErrorState
            title="Failed to load notifications"
            description="We were unable to retrieve your notifications. Please try again."
            onRetry={() => void mutate()}
          />
        )}

        {/* Empty state when no notifications match filter or none exist */}
        {!isLoading && !error && filteredNotifications.length === 0 && (
          <EmptyState
            icon={BellCheckIcon}
            title={
              activeFilter !== 'all'
                ? 'No matching notifications'
                : "You're all caught up"
            }
            description={
              activeFilter !== 'all'
                ? `There are currently no ${activeFilter} alerts to display. Check the other tabs or clear your filter.`
                : 'New train alerts will appear here when delays, platform adjustments, or arrivals occur.'
            }
            action={
              activeFilter !== 'all' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveFilter('all')}
                >
                  Show all notifications
                </Button>
              ) : (
                <Button size="sm" render={<Link href="/track" />}>
                  <TrainFrontIcon data-icon="inline-start" />
                  Track Running Trains
                </Button>
              )
            }
          />
        )}

        {/* Grouped Notifications List */}
        {!isLoading && !error && filteredNotifications.length > 0 && (
          <div className="flex flex-col gap-6">
            {/* Today Group */}
            {todayList.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Today
                  </h2>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
                <div className="flex flex-col gap-2.5">
                  {todayList.map((item) => (
                    <NotificationCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Earlier Group */}
            {earlierList.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Earlier
                  </h2>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
                <div className="flex flex-col gap-2.5">
                  {earlierList.map((item) => (
                    <NotificationCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
