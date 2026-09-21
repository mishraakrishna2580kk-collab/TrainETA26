'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRightIcon,
  BellIcon,
  BookmarkIcon,
  CompassIcon,
  LogInIcon,
  RadioIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/states/status-states'
import { TrainCardSkeleton } from '@/components/states/loading-skeletons'
import { StatusBadge } from '@/components/train/status-badge'
import { useAuth } from '@/components/providers/auth-provider'
import { useNotifications, useSavedTrains } from '@/lib/hooks'

export function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'overview'

  const { user, loading: authLoading, firebaseMode } = useAuth()
  const { saved, isLoading: savedLoading } = useSavedTrains()
  const { notifications, unread, isLoading: notifsLoading } = useNotifications()

  const displayName = useMemo(() => {
    if (!user?.name) return 'Passenger'
    return user.name.trim()
  }, [user?.name])

  // Loading state
  if (authLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 md:py-12">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TrainCardSkeleton />
          <TrainCardSkeleton />
          <TrainCardSkeleton />
        </div>
      </div>
    )
  }

  // Unauthenticated state
  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-16 sm:px-6">
        <EmptyState
          icon={UserIcon}
          title="Sign in to view your dashboard"
          description="Access your personal passenger dashboard to view saved journeys, real-time platform updates, and customized delay alerts."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="sm" render={<Link href="/login" />}>
                <LogInIcon data-icon="inline-start" />
                Sign in
              </Button>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/register" />}
              >
                Create an account
              </Button>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 md:py-10">
      {/* Welcome Greeting Header */}
      <section className="relative flex flex-col gap-3">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute -left-20 -top-16 -z-10 size-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <UserCheckIcon className="size-3.5" />
            Passenger Account
          </span>
          <span className="rounded-full border border-border/70 bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {firebaseMode ? 'Cloud Account' : 'Demo Mode Active'}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Welcome back, {displayName}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Manage your saved trains, review live journey alerts, and plan
              your travels.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="self-start gap-1.5 sm:self-auto"
            render={<Link href="/profile" />}
          >
            <UserIcon className="size-3.5" />
            <span>Profile Settings</span>
          </Button>
        </div>
      </section>

      {/* Summary Cards Grid */}
      <section
        aria-label="Account statistics and summaries"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {/* Saved Trains Card */}
        <Card className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-0 shadow-xs backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Saved Trains
            </CardTitle>
            <span className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-2xs">
              <BookmarkIcon className="size-4" />
            </span>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold tabular-nums text-foreground">
                {savedLoading ? '...' : saved?.length ?? 0}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {saved?.length === 1 ? 'train journey' : 'train journeys'}
              </span>
            </div>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {saved && saved.length > 0
                ? `Currently tracking ${saved.map((s) => s.train.number).slice(0, 3).join(', ')}.`
                : 'No saved journeys yet. Bookmark trains to monitor live ETA.'}
            </p>
            <div className="border-t border-border/50 pt-2">
              <Link
                href="/saved"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
              >
                <span>Manage saved trains</span>
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Card */}
        <Card className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-0 shadow-xs backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Alerts
            </CardTitle>
            <span className="flex size-9 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 shadow-2xs dark:text-amber-400">
              <BellIcon className="size-4" />
            </span>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold tabular-nums text-foreground">
                {notifsLoading ? '...' : unread}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                unread alerts
              </span>
            </div>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {unread > 0
                ? 'You have unread delay and platform adjustment notifications.'
                : 'All caught up! No urgent journey alerts at this moment.'}
            </p>
            <div className="border-t border-border/50 pt-2">
              <Link
                href="/notifications"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
              >
                <span>View alerts feed</span>
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Account Status Card */}
        <Card className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-0 shadow-xs backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-card sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Account Status
            </CardTitle>
            <span className="flex size-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 shadow-2xs dark:text-emerald-400">
              <ShieldCheckIcon className="size-4" />
            </span>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-display text-lg font-bold text-foreground">Active</span>
            </div>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {user.email}
            </p>
            <div className="border-t border-border/50 pt-2">
              <Link
                href="/profile"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
              >
                <span>Account settings</span>
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Passenger Actions */}
      <section aria-labelledby="quick-nav-heading" className="flex flex-col gap-4">
        <h2
          id="quick-nav-heading"
          className="font-display text-lg font-bold tracking-tight text-foreground"
        >
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/track"
            className="group flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/80 p-4.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-2xs transition-transform duration-200 group-hover:scale-105">
              <RadioIcon className="size-5" />
            </span>
            <span className="font-display text-sm font-bold text-foreground">Track Train</span>
            <span className="text-xs text-muted-foreground">
              Follow a train by number or name
            </span>
          </Link>

          <Link
            href="/search"
            className="group flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/80 p-4.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-10 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-600 shadow-2xs transition-transform duration-200 group-hover:scale-105 dark:text-sky-400">
              <CompassIcon className="size-5" />
            </span>
            <span className="font-display text-sm font-bold text-foreground">Search Trains</span>
            <span className="text-xs text-muted-foreground">
              Find trains between station pairs
            </span>
          </Link>

          <Link
            href="/saved"
            className="group flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/80 p-4.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 shadow-2xs transition-transform duration-200 group-hover:scale-105 dark:text-amber-400">
              <BookmarkIcon className="size-5" />
            </span>
            <span className="font-display text-sm font-bold text-foreground">Saved Journeys</span>
            <span className="text-xs text-muted-foreground">
              Jump directly into bookmarked trains
            </span>
          </Link>

          <Link
            href="/notifications"
            className="group flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/80 p-4.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 shadow-2xs transition-transform duration-200 group-hover:scale-105 dark:text-indigo-400">
              <BellIcon className="size-5" />
            </span>
            <span className="font-display text-sm font-bold text-foreground">Alerts Center</span>
            <span className="text-xs text-muted-foreground">
              Delays, arrivals, and platforms
            </span>
          </Link>
        </div>
      </section>

      {/* Recent Saved Journeys Preview */}
      {saved && saved.length > 0 && (
        <section
          aria-labelledby="saved-preview-heading"
          className="flex flex-col gap-4 border-t pt-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                id="saved-preview-heading"
                className="font-display text-lg font-semibold tracking-tight"
              >
                Your Saved Trains
              </h2>
              <p className="text-xs text-muted-foreground">
                Quick access to your most tracked routes
              </p>
            </div>
            <Link
              href="/saved"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all ({saved.length}) →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {saved.slice(0, 2).map(({ train }) => (
              <div
                key={train.number}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/85 p-4 shadow-xs backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-card"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                      {train.number}
                    </span>
                    <span className="truncate font-display text-sm font-bold text-foreground">
                      {train.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground/80">{train.from.code}</span>
                    <span>→</span>
                    <span className="font-semibold text-foreground/80">{train.to.code}</span>
                    <span>·</span>
                    <span>{train.duration}</span>
                  </div>
                  <div className="pt-0.5">
                    <StatusBadge
                      status={train.status}
                      delayMinutes={train.delayMinutes}
                      size="sm"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-8 shrink-0 gap-1 px-3 text-xs font-semibold"
                  render={<Link href={`/track/${train.number}`} />}
                >
                  <span>Track</span>
                  <ArrowRightIcon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Latest Alerts Preview */}
      {notifications && notifications.length > 0 && (
        <section
          aria-labelledby="notifications-preview-heading"
          className="flex flex-col gap-4 border-t border-border/60 pt-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                id="notifications-preview-heading"
                className="font-display text-lg font-bold tracking-tight text-foreground"
              >
                Recent Alerts
              </h2>
              <p className="text-xs text-muted-foreground">
                Latest updates from your running trains
              </p>
            </div>
            <Link
              href="/notifications"
              className="text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              View all alerts →
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            {notifications.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/85 p-4 shadow-xs backdrop-blur-xs transition-all duration-150 hover:border-border"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold text-foreground">{item.title}</span>
                    {!item.read && (
                      <span className="size-1.5 rounded-full bg-primary ring-2 ring-primary/20" />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.message}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {item.time}
                  </span>
                  {item.trainNumber && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs font-medium"
                      render={<Link href={`/track/${item.trainNumber}`} />}
                    >
                      Track
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
