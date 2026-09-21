'use client'

import Link from 'next/link'
import { RadioIcon, TrainFrontIcon, ZapIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TrainCard } from '@/components/train/train-card'
import { TrainSearchForm } from '@/components/search/train-search-form'
import { LiveIndicator } from '@/components/train/live-indicator'
import { TRAINS } from '@/lib/mock-data'

export function TrackLanding() {
  const runningTrains = TRAINS.filter((t) => t.status !== 'cancelled')

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 md:py-12">
      {/* Header */}
      <section className="relative flex max-w-2xl flex-col gap-3">
        {/* Subtle decorative radial glow */}
        <div className="pointer-events-none absolute -left-20 -top-20 -z-10 size-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <RadioIcon className="size-3.5" />
            Live Train Radar
          </span>
          <LiveIndicator />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
          Track any train in real time.
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Get live running status, platform arrival estimates, GPS delay updates,
          and station progression across Indian Railways.
        </p>
      </section>

      {/* Main Search & Tracking Input */}
      <section aria-labelledby="track-search-heading">
        <Card className="overflow-hidden border-border/70 bg-card/85 shadow-card backdrop-blur-xs">
          <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <TrainFrontIcon className="size-4" />
                </span>
                <h2
                  id="track-search-heading"
                  className="font-display text-xl font-bold tracking-tight"
                >
                  Enter train number or name
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Type a 5-digit number or select a popular train to jump straight into live tracking.
              </p>
            </div>

            <TrainSearchForm />

            {/* Quick-select pills */}
            <div className="flex flex-col gap-2.5 border-t border-border/60 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Popular trains running right now:
              </span>
              <div className="flex flex-wrap gap-2">
                {TRAINS.slice(0, 5).map((train) => (
                  <Link
                    key={train.number}
                    href={`/track/${train.number}`}
                    className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3.5 py-1 text-xs font-medium text-foreground transition-all duration-150 hover:border-primary/50 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="font-mono font-bold text-primary">
                      {train.number}
                    </span>
                    <span className="font-medium">{train.name}</span>
                    <span className="text-muted-foreground">
                      ({train.from.code} → {train.to.code})
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Currently running trains catalog */}
      <section aria-labelledby="running-trains-heading" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="running-trains-heading"
                className="font-display text-2xl font-semibold tracking-tight"
              >
                Currently running trains
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                {runningTrains.length} active
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Trains currently in transit with real-time GPS tracking enabled.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ZapIcon className="size-3.5 text-primary" />
            <span>Updates every 30 seconds</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {runningTrains.map((train) => (
            <TrainCard key={train.number} train={train} />
          ))}
        </div>
      </section>
    </div>
  )
}
