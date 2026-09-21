'use client'

import Link from 'next/link'
import { ArrowRightIcon, BellIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/train/status-badge'
import type { SavedTrain } from '@/lib/types'

interface SavedTrainCardProps {
  saved: SavedTrain
  onRemove: (trainNumber: string) => void
  onToggleNotifications: (trainNumber: string) => void
}

export function SavedTrainCard({
  saved,
  onRemove,
  onToggleNotifications,
}: SavedTrainCardProps) {
  const { train } = saved
  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-0 shadow-xs backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-card">
      <CardContent className="flex flex-col gap-4 p-5">
        {/* Header: Identity & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {train.number}
              </span>
              <h3 className="truncate font-display text-base font-bold tracking-tight text-foreground">
                {train.name}
              </h3>
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {train.type} Express
            </p>
          </div>
          <StatusBadge status={train.status} delayMinutes={train.delayMinutes} />
        </div>

        {/* Journey corridor & timings */}
        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-3.5 py-2.5">
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold tabular-nums text-foreground">
              {train.from.time}
            </span>
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {train.from.code}
            </span>
          </div>

          <div className="flex flex-1 flex-col items-center px-3">
            <span className="text-[10px] font-medium text-muted-foreground">
              {train.duration}
            </span>
            <div className="relative my-1 flex w-full max-w-24 items-center">
              <span className="h-px w-full bg-border" />
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground/80">Direct</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="font-display text-sm font-bold tabular-nums text-foreground">
              {train.to.time}
            </span>
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {train.to.code}
            </span>
          </div>
        </div>

        {/* Footer: Alerts Toggle & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
          <Label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
            <BellIcon className="size-3.5 text-primary" />
            <span>Live Alerts</span>
            <Switch
              checked={saved.notificationsEnabled}
              onCheckedChange={() => onToggleNotifications(train.number)}
              aria-label="Toggle notifications"
            />
          </Label>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove saved train"
              className="text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                onRemove(train.number)
                toast.success(`Removed ${train.name}`)
              }}
            >
              <Trash2Icon className="size-4" />
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1 px-3 text-xs font-semibold"
              render={<Link href={`/track/${train.number}`} />}
            >
              <span>Track live</span>
              <ArrowRightIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
