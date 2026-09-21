import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { TrainCardSkeleton } from '@/components/states/loading-skeletons'

export const metadata: Metadata = {
  title: 'Dashboard — Passenger Account Overview | Train ETA',
  description:
    'View your saved trains, delay notifications, and account settings in your personal Train ETA dashboard.',
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 md:py-12">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TrainCardSkeleton />
            <TrainCardSkeleton />
            <TrainCardSkeleton />
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
