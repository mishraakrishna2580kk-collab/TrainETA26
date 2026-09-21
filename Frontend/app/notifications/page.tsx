import type { Metadata } from 'next'
import { NotificationsPageContent } from '@/components/notifications/notifications-page-content'

export const metadata: Metadata = {
  title: 'Notifications — Live Train Alerts & Updates | Train ETA',
  description:
    'Live railway notifications, delay alerts, platform changes, and arrival warnings for your journeys.',
}

export default function NotificationsPage() {
  return <NotificationsPageContent />
}
