import Link from 'next/link'
import { ArrowRightIcon, ClockIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/train/status-badge'
import { SaveTrainButton } from '@/components/train/save-train-button'
import { Button } from '@/components/ui/button'
import type { Train } from '@/lib/types'

export function TrainCard({ train }: { train: Train }) {
  const isDelayed = train.delayMinutes > 0 && train.status !== 'cancelled'
  const isCancelled = train.status === 'cancelled'

  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-elevated">
      <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
        {/* Header: Train Number, Type, Live Badge & Bookmark */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary ring-1 ring-primary/20">
              {train.number}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {train.type}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={train.status} delayMinutes={train.delayMinutes} size="sm" />
            <SaveTrainButton train={train} />
          </div>
        </div>

        {/* Train Name */}
        <div className="-mt-2">
          <h3 className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {train.name}
          </h3>
        </div>

        {/* Station Timeline / Vector */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          {/* Origin */}
          <div className="flex flex-col">
            <span className="font-display text-xl font-bold tracking-tight tabular-nums text-foreground sm:text-2xl">
              {train.from.time}
            </span>
            <span className="font-semibold text-xs text-foreground/90 sm:text-sm">
              {train.from.code}
            </span>
            <span className="truncate text-[0.75rem] text-muted-foreground">
              {train.from.station}
            </span>
          </div>

          {/* Route Vector Indicator */}
          <div className="flex flex-col items-center gap-1.5 px-2">
            <span className="flex items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
              <ClockIcon className="size-3" />
              {train.duration}
            </span>
            <div className="flex w-24 sm:w-32 items-center">
              <span className="size-2 rounded-full border-2 border-primary bg-background" />
              <span className="h-0.5 flex-1 bg-gradient-to-r from-primary/70 via-primary/50 to-primary/70" />
              <ArrowRightIcon className="size-3.5 shrink-0 text-primary -ml-1" />
            </div>
            <span className="text-[0.65rem] text-muted-foreground">
              Direct
            </span>
          </div>

          {/* Destination */}
          <div className="flex flex-col items-end text-right">
            <span className="font-display text-xl font-bold tracking-tight tabular-nums text-foreground sm:text-2xl">
              {train.eta || train.to.time}
            </span>
            <span className="font-semibold text-xs text-foreground/90 sm:text-sm">
              {train.to.code}
            </span>
            <span className="truncate text-[0.75rem] text-muted-foreground">
              {train.to.station}
            </span>
          </div>
        </div>

        {/* Live Arrival Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">
              Expected Arrival:
            </span>
            <span className="font-display font-semibold text-foreground">
              {train.eta || train.to.time}
            </span>
          </div>

          {isDelayed ? (
            <span className="font-medium text-warning-foreground dark:text-warning">
              Running +{train.delayMinutes} min late
            </span>
          ) : isCancelled ? (
            <span className="font-medium text-destructive">
              Service cancelled today
            </span>
          ) : (
            <span className="font-medium text-success-foreground dark:text-success">
              Right on schedule
            </span>
          )}
        </div>

        {/* Footer: Class tags & Track Button */}
        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
          <div className="flex flex-wrap gap-1.5">
            {train.classes.map((c) => (
              <span
                key={c}
                className="rounded-md border border-border/70 bg-background/60 px-2 py-0.5 font-mono text-[0.68rem] font-medium text-muted-foreground shadow-2xs"
              >
                {c}
              </span>
            ))}
          </div>
          <Button
            size="sm"
            className="group/btn gap-1.5 rounded-xl font-semibold shadow-2xs"
            render={<Link href={`/track/${train.number}`} />}
          >
            <span>Track live</span>
            <ArrowRightIcon className="size-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
