import type { Metadata } from 'next'
import { TrackLanding } from '@/components/track/track-landing'

export const metadata: Metadata = {
  title: 'Track Train — Live Running Status & ETA | Train ETA',
  description:
    'Real-time train tracking across Indian Railways. Check live GPS locations, delay status, platform arrivals, and accurate ETA predictions.',
}

export default function TrackPage() {
  return <TrackLanding />
}
