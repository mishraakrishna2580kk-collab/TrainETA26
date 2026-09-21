import type { Metadata } from 'next'
import { ProfileContent } from '@/components/profile/profile-content'

export const metadata: Metadata = {
  title: 'Profile Settings — Manage Account | Train ETA',
  description:
    'Manage your passenger profile, update display name, view authentication credentials, and configure account session settings.',
}

export default function ProfilePage() {
  return <ProfileContent />
}
