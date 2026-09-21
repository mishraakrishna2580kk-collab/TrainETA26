'use client'

import Link from 'next/link'
import {
  BookmarkIcon,
  LogInIcon,
  SearchIcon,
  TrainFrontIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { SavedTrainCard } from '@/components/train/saved-train-card'
import { TrainListSkeleton } from '@/components/states/loading-skeletons'
import { EmptyState, ErrorState } from '@/components/states/status-states'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'
import { useSavedTrains } from '@/lib/hooks'
import {
  removeSavedTrain,
  toggleSavedNotifications,
} from '@/lib/train-service'

export function SavedPageContent() {
  const { user } = useAuth()
  const { saved, isLoading, error, mutate } = useSavedTrains()

  async function handleRemove(trainNumber: string) {
    try {
      const updated = await removeSavedTrain(trainNumber)
      await mutate(updated, false)
    } catch {
      toast.error('Failed to remove train')
    }
  }

  async function handleToggleNotifications(trainNumber: string) {
    try {
      const updated = await toggleSavedNotifications(trainNumber)
      await mutate(updated, false)
      const target = updated.find((s) => s.train.number === trainNumber)
      if (target?.notificationsEnabled) {
        toast.success('Live alerts enabled for this journey')
      } else {
        toast.info('Live alerts muted for this journey')
      }
    } catch {
      toast.error('Failed to update notifications')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 md:py-10">
      {/* Header section */}
      <section className="relative flex flex-col gap-3">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute -left-20 -top-16 -z-10 size-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <BookmarkIcon className="size-3.5" />
            Personal Journeys
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Saved Trains
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Keep your frequently tracked trains close at hand for fast ETA
              lookups and platform alerts.
            </p>
          </div>
          {!isLoading && saved && saved.length > 0 && (
            <span className="self-start rounded-full border border-border/70 bg-muted/50 px-3 py-1 font-mono text-xs font-semibold text-foreground sm:self-auto">
              {saved.length} {saved.length === 1 ? 'train' : 'trains'} saved
            </span>
          )}
        </div>
      </section>

      {/* Guest Mode Notice */}
      {!user && (
        <section aria-label="Demo mode notice">
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-2 rounded-full bg-primary" />
              <span>
                <strong>Local Storage Mode</strong>: Your saved trains are stored
                locally on this device. Sign in to sync across devices.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-fit shrink-0 gap-1.5 border-primary/30 px-3 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
              render={<Link href="/login" />}
            >
              <LogInIcon className="size-3.5" />
              Sign in
            </Button>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <section aria-label="Saved trains list" className="flex flex-col gap-4">
        {/* Loading state */}
        {isLoading && <TrainListSkeleton count={3} />}

        {/* Error state */}
        {error && (
          <ErrorState
            title="Unable to load saved trains"
            description="We encountered an issue retrieving your saved trains. Please try again."
            onRetry={() => void mutate()}
          />
        )}

        {/* Empty state */}
        {!isLoading && !error && (!saved || saved.length === 0) && (
          <EmptyState
            icon={BookmarkIcon}
            title="No saved trains yet"
            description="Bookmark trains from your search results or live tracking pages to monitor schedules, platform updates, and delays in one place."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" render={<Link href="/search" />}>
                  <SearchIcon data-icon="inline-start" />
                  Search Trains
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href="/track" />}
                >
                  <TrainFrontIcon data-icon="inline-start" />
                  Live Train Radar
                </Button>
              </div>
            }
          />
        )}

        {/* Saved Trains Grid */}
        {!isLoading && !error && saved && saved.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {saved.map((item) => (
              <SavedTrainCard
                key={item.train.number}
                saved={item}
                onRemove={handleRemove}
                onToggleNotifications={handleToggleNotifications}
              />
            ))}
          </div>
        )}
      </section>

      {/* Helpful tips footer when trains exist */}
      {!isLoading && saved && saved.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground">
          <span>
            Tip: Toggle the alert switch on any train to receive delay and
            platform changes.
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-primary"
            render={<Link href="/search" />}
          >
            Find more trains →
          </Button>
        </div>
      )}
    </div>
  )
}
