import type { Metadata } from 'next'
import { TrackTrainView } from '@/components/train/track-train-view'

interface PageProps {
  params: Promise<{ trainNumber: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { trainNumber } = await params
  return {
    title: `Track Train ${trainNumber} — Live Status & ETA | Train ETA`,
    description: `Real-time GPS status, station delay, platform arrival, and estimated time of arrival for train ${trainNumber}.`,
  }
}

export default async function TrackTrainPage({ params }: PageProps) {
  const { trainNumber } = await params
  return <TrackTrainView trainNumber={trainNumber} />
}
