'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CalendarIcon,
  MapPinIcon,
  RotateCcwIcon,
  SearchXIcon,
  TrainFrontIcon,
} from 'lucide-react'
import { TrainSearchForm } from '@/components/search/train-search-form'
import { TrainCard } from '@/components/train/train-card'
import { TrainListSkeleton } from '@/components/states/loading-skeletons'
import { EmptyState, ErrorState } from '@/components/states/status-states'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useRecentSearches, useTrainSearch } from '@/lib/hooks'
import { POPULAR_ROUTES, TRAINS } from '@/lib/mock-data'

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return 0
  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const period = match[3].toUpperCase()
  if (period === 'PM' && hours < 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return hours * 60 + minutes
}

function parseDurationToMinutes(durationStr: string): number {
  if (!durationStr) return 0
  const hMatch = durationStr.match(/(\d+)\s*h/i)
  const mMatch = durationStr.match(/(\d+)\s*m/i)
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0
  const minutes = mMatch ? parseInt(mMatch[1], 10) : 0
  return hours * 60 + minutes
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    if (!y || !m || !d) return dateStr
    const dt = new Date(y, m - 1, d)
    return dt.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const query = searchParams.get('query') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const date = searchParams.get('date') ?? ''

  const hasSearch = Boolean(query || from || to)

  // Fetch results based on search query params, or null if no search specified yet
  const searchArg = useMemo(() => {
    return {
      query: query || undefined,
      from: from || undefined,
      to: to || undefined,
    }
  }, [query, from, to])

  const { results, isLoading, error } = useTrainSearch(searchArg)
  const { recent } = useRecentSearches()

  // Client-side filter and sort states
  const [sortBy, setSortBy] = useState<
    'default' | 'departure-asc' | 'arrival-asc' | 'duration-asc'
  >('default')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const trainTypes = useMemo(() => {
    const types = new Set<string>()
    TRAINS.forEach((t) => types.add(t.type))
    return Array.from(types)
  }, [])

  const filteredAndSorted = useMemo(() => {
    if (!results) return []

    let list = [...results]

    // Filter by type
    if (selectedType !== 'all') {
      list = list.filter(
        (t) => t.type.toLowerCase() === selectedType.toLowerCase(),
      )
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      list = list.filter((t) => t.status === selectedStatus)
    }

    // Sort
    if (sortBy === 'departure-asc') {
      list.sort(
        (a, b) =>
          parseTimeToMinutes(a.from.time) - parseTimeToMinutes(b.from.time),
      )
    } else if (sortBy === 'arrival-asc') {
      list.sort(
        (a, b) => parseTimeToMinutes(a.to.time) - parseTimeToMinutes(b.to.time),
      )
    } else if (sortBy === 'duration-asc') {
      list.sort(
        (a, b) =>
          parseDurationToMinutes(a.duration) -
          parseDurationToMinutes(b.duration),
      )
    }

    return list
  }, [results, selectedType, selectedStatus, sortBy])

  const hasActiveFilters =
    sortBy !== 'default' || selectedType !== 'all' || selectedStatus !== 'all'

  function resetFilters() {
    setSortBy('default')
    setSelectedType('all')
    setSelectedStatus('all')
  }

  // Summary heading text
  const summaryTitle = useMemo(() => {
    if (from && to) return `Trains from ${from} to ${to}`
    if (from && !to) return `Trains departing from ${from}`
    if (!from && to) return `Trains arriving at ${to}`
    if (query) return `Search results for "${query}"`
    return 'All Available Trains'
  }, [from, to, query])

  const formattedDate = date ? formatDateDisplay(date) : null

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 md:py-10">
      {/* Header section */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <TrainFrontIcon className="size-3.5" />
            Railway Directory
          </span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Search Trains
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          Find the right train for your journey. Check schedules, travel
          durations, and live availability.
        </p>
      </section>

      {/* Search Form Card */}
      <section aria-labelledby="search-box-heading">
        <Card className="rounded-3xl border border-border/80 bg-card/95 p-2 shadow-card backdrop-blur-sm sm:p-3">
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            <h2 id="search-box-heading" className="sr-only">
              Train search filters
            </h2>
            <TrainSearchForm
              defaultQuery={query}
              defaultFrom={from}
              defaultTo={to}
              defaultDate={date}
            />
          </CardContent>
        </Card>
      </section>

      {/* Search Results / Content */}
      <section aria-label="Train search results" className="flex flex-col gap-5">
        {/* Results Header & Summary */}
        <div className="flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {summaryTitle}
              </h2>
              {!isLoading && results && (
                <span className="rounded-full bg-primary/10 px-3 py-0.5 font-mono text-xs font-semibold text-primary ring-1 ring-primary/20">
                  {filteredAndSorted.length}{' '}
                  {filteredAndSorted.length === 1 ? 'train' : 'trains'}
                </span>
              )}
            </div>
            {formattedDate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarIcon className="size-3.5 text-primary" />
                <span>Travel Date: <strong className="text-foreground">{formattedDate}</strong></span>
              </div>
            )}
          </div>

          {/* Filter & Sort controls bar */}
          {!isLoading && results && results.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Sort selector */}
              <div className="flex items-center gap-1">
                <label htmlFor="search-sort" className="sr-only">
                  Sort trains
                </label>
                <select
                  id="search-sort"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as
                        | 'default'
                        | 'departure-asc'
                        | 'arrival-asc'
                        | 'duration-asc',
                    )
                  }
                  className="h-9 rounded-xl border border-border/80 bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs outline-none transition-all hover:border-border hover:bg-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="default">Sort: Recommended</option>
                  <option value="departure-asc">Departure: Earliest</option>
                  <option value="arrival-asc">Arrival: Earliest</option>
                  <option value="duration-asc">Duration: Fastest</option>
                </select>
              </div>

              {/* Train type filter */}
              <div className="flex items-center gap-1">
                <label htmlFor="search-type" className="sr-only">
                  Filter by train type
                </label>
                <select
                  id="search-type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="h-9 rounded-xl border border-border/80 bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs outline-none transition-all hover:border-border hover:bg-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">All Types</option>
                  {trainTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-1">
                <label htmlFor="search-status" className="sr-only">
                  Filter by running status
                </label>
                <select
                  id="search-status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-9 rounded-xl border border-border/80 bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs outline-none transition-all hover:border-border hover:bg-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">All Statuses</option>
                  <option value="on-time">On time</option>
                  <option value="running">Running</option>
                  <option value="late">Late</option>
                </select>
              </div>

              {/* Clear filters button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-9 rounded-xl px-2.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <RotateCcwIcon className="size-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Loading state */}
        {isLoading && <TrainListSkeleton count={4} />}

        {/* Error state */}
        {error && (
          <ErrorState
            title="Search failed"
            description="We were unable to complete your train search. Please check your network and try again."
            onRetry={() => router.refresh()}
          />
        )}

        {/* Empty state when no trains match */}
        {!isLoading && !error && filteredAndSorted.length === 0 && (
          <EmptyState
            icon={SearchXIcon}
            title={
              hasActiveFilters
                ? 'No trains match your filters'
                : 'No trains found'
            }
            description={
              hasActiveFilters
                ? 'Try clearing your sort or status filters to see available trains for this route.'
                : from && to
                  ? `No direct trains found between "${from}" and "${to}". Try swapping the origin/destination or search for nearby junction stations.`
                  : query
                    ? `No trains found matching "${query}". Try searching by a 5-digit number (e.g. 12951) or train name (e.g. Rajdhani).`
                    : 'No trains currently available in the schedule.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Clear all filters
                </Button>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/search')}
                  >
                    View all trains
                  </Button>
                  <Button
                    size="sm"
                    render={<Link href="/track" />}
                  >
                    Track a running train
                  </Button>
                </div>
              )
            }
          />
        )}

        {/* Results List */}
        {!isLoading && !error && filteredAndSorted.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredAndSorted.map((train) => (
              <TrainCard key={train.number} train={train} />
            ))}
          </div>
        )}
      </section>

      {/* Popular Routes Section */}
      <section
        aria-labelledby="popular-routes-search-heading"
        className="flex flex-col gap-4 border-t pt-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="popular-routes-search-heading"
              className="font-display text-lg font-semibold tracking-tight"
            >
              Popular train routes
            </h2>
            <p className="text-xs text-muted-foreground">
              Frequently traveled corridors across the railway network
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {POPULAR_ROUTES.map((route) => {
            const href = `/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`
            return (
              <Link
                key={`${route.from}-${route.to}`}
                href={href}
                className="group flex flex-col gap-1 rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPinIcon className="size-3 text-primary" />
                  <span>Route</span>
                </div>
                <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                  {route.from} → {route.to}
                </span>
                <span className="text-xs text-primary font-medium pt-1">
                  Search trains →
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Recent Searches Section */}
      {recent && recent.length > 0 && (
        <section
          aria-labelledby="recent-searches-heading"
          className="flex flex-col gap-3 border-t pt-6"
        >
          <h2
            id="recent-searches-heading"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Your Recent Searches
          </h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((item) => {
              const params = new URLSearchParams()
              if (item.from) params.set('from', item.from)
              if (item.to) params.set('to', item.to)
              if (!item.from && !item.to && item.query) {
                params.set('query', item.query)
              }
              const href = `/search?${params.toString()}`

              return (
                <Link
                  key={item.id}
                  href={href}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium transition-colors hover:bg-muted hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>{item.query}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
