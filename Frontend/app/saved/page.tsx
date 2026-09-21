import type { Metadata } from 'next'
import { SavedPageContent } from '@/components/saved/saved-page-content'

export const metadata: Metadata = {
  title: 'Saved Trains — Monitor Bookmarked Journeys | Train ETA',
  description:
    'Quickly access and track your saved passenger trains. Monitor delays, platform changes, and estimated arrival times for your regular journeys.',
}

export default function SavedPage() {
  return <SavedPageContent />
}
