import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SearchPageContent } from '@/components/search/search-page-content'
import { TrainListSkeleton } from '@/components/states/loading-skeletons'

export const metadata: Metadata = {
  title: 'Search Trains — Find Schedules & Live Status | Train ETA',
  description:
    'Search passenger trains across India by train number, train name, or between stations. Compare schedules, duration, classes, and live status.',
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:py-12">
          <TrainListSkeleton count={4} />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  )
}
