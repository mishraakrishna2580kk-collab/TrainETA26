import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Sign In — Access Saved Trains & Alerts | Train ETA',
  description:
    'Sign in to your Train ETA account to monitor saved journeys, manage delay alerts, and sync settings.',
}

export default function LoginPage() {
  return <LoginForm />
}
