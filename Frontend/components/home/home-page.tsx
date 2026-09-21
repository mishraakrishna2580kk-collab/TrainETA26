'use client'

import Link from 'next/link'
import {
  BellIcon,
  BookmarkIcon,
  MapPinIcon,
  TrainFrontIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TrainCard } from '@/components/train/train-card'
import { TrainCardSkeleton } from '@/components/states/loading-skeletons'
import { EmptyState, ErrorState } from '@/components/states/status-states'
import { TrainSearchForm } from '@/components/search/train-search-form'
import { Button } from '@/components/ui/button'
import { useRecentSearches, useTrainDetails, useTrainStatus } from '@/lib/hooks'
import { POPULAR_ROUTES } from '@/lib/mock-data'

const FEATURED_TRAIN = '12951'

const quickActions = [
  {
    href: '/track',
    label: 'Track a Train',
    description: 'Follow a running train live',
    icon: TrainFrontIcon,
  },
  {
    href: '/search',
    label: 'Search by Station',
    description: 'Find trains between stations',
    icon: MapPinIcon,
  },
  {
    href: '/saved',
    label: 'Saved Trains',
    description: 'Jump back to your journeys',
    icon: BookmarkIcon,
  },
  {
    href: '/notifications',
    label: 'Alerts',
    description: 'Delays and platform updates',
    icon: BellIcon,
  },
] as const

export function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-8 sm:px-6 md:py-12">
      <Hero />
      <SearchSection />
      <QuickActions />
      <LivePreview />
      <PopularRoutes />
      <RecentSearches />
    </div>
  )
}

function Hero() {
  return (
    <section className="relative flex flex-col items-center gap-4 text-center sm:gap-5 md:py-4">
      {/* Pill Badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary shadow-2xs">
        <span className="size-1.5 rounded-full bg-primary animate-pulse" />
        <span>Live Indian Railways Tracking & Smart ETA</span>
      </div>

      {/* Main Headline */}
      <h1 className="max-w-3xl font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl text-balance">
        Track smarter. <span className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">Arrive better.</span>
      </h1>

      {/* Supporting Copy */}
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg text-balance">
        Search trains, monitor live running status, and get reliable arrival estimates across Indian Railways.
      </p>
    </section>
  )
}

function SearchSection() {
  return (
    <section aria-labelledby="search-heading" className="relative -mt-2 sm:-mt-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -top-8 h-32 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-2xl"
      />
      <Card className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-elevated backdrop-blur-sm p-2 sm:p-3">
        <CardContent className="flex flex-col gap-5 p-4 sm:p-6 md:p-8">
          <div className="flex flex-col gap-1 border-b border-border/60 pb-4">
            <h2 id="search-heading" className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Find & Track Your Train
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Enter train number, name, or choose origin and destination stations.
            </p>
          </div>
          <TrainSearchForm />
        </CardContent>
      </Card>
    </section>
  )
}

function QuickActions() {
  return (
    <section aria-labelledby="quick-actions-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 id="quick-actions-heading" className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
          Quick Transit Services
        </h2>
      </div>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quickActions.map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className="group flex h-full flex-col justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4.5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-elevated focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <action.icon className="size-5" aria-hidden />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                  {action.label}
                </span>
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {action.description}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function LivePreview() {
  const { train, isLoading, error, mutate: mutateTrain } = useTrainDetails(FEATURED_TRAIN)
  const { status: live, mutate: mutateLive } = useTrainStatus(FEATURED_TRAIN)

  return (
    <section aria-labelledby="live-heading" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <h2 id="live-heading" className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
              Live Transit Feed
            </h2>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Real-time telemetry example from our running catalog.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-semibold"
          render={<Link href={`/track/${FEATURED_TRAIN}`} />}
        >
          Open full tracker →
        </Button>
      </div>

      {isLoading && <TrainCardSkeleton />}
      {error && (
        <ErrorState
          title="Could not load live trains"
          onRetry={() => {
            void mutateTrain()
            void mutateLive()
          }}
        />
      )}
      {!isLoading && !error && !train && (
        <EmptyState
          title="No live trains"
          description="Live examples will appear here when trains are running."
        />
      )}
      {train && (
        <div className="flex flex-col gap-3">
          <TrainCard train={train} />
        </div>
      )}
    </section>
  )
}

function PopularRoutes() {
  return (
    <section aria-labelledby="routes-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 id="routes-heading" className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
          Popular Railway Corridors
        </h2>
        <span className="text-xs text-muted-foreground">High frequency routes</span>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {POPULAR_ROUTES.map((route) => {
          const href = `/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`
          return (
            <li key={`${route.from}-${route.to}`}>
              <Link
                href={href}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-elevated focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary/15 group-hover:text-primary">
                    <TrainFrontIcon className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                      {route.from} → {route.to}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Multiple express & superfast options
                    </span>
                  </div>
                </div>
                <span className="inline-flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function RecentSearches() {
  const { recent, isLoading } = useRecentSearches()

  if (isLoading || !recent?.length) return null

  return (
    <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
      <h2 id="recent-heading" className="font-display text-sm font-semibold tracking-tight text-muted-foreground uppercase">
        Recent lookups
      </h2>
      <ul className="flex flex-wrap gap-2">
        {recent.map((item) => {
          const params = new URLSearchParams()
          if (item.from) params.set('from', item.from)
          if (item.to) params.set('to', item.to)
          if (!item.from && !item.to && item.query) params.set('query', item.query)
          const href = params.size
            ? `/search?${params.toString()}`
            : `/search?query=${encodeURIComponent(item.query)}`
          return (
            <li key={item.id}>
              <Link
                href={href}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-all duration-150 hover:border-primary/40 hover:bg-accent hover:text-primary shadow-2xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span>{item.query}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
