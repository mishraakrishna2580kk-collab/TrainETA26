import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = {
  title: 'Create Account — Save Trains & Real-Time Alerts | Train ETA',
  description:
    'Register for a Train ETA account to bookmark your frequently tracked trains, customize delay notifications, and plan your railway trips.',
}

export default function RegisterPage() {
  return <RegisterForm />
}
