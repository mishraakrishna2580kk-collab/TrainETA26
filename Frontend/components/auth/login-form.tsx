'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  MailIcon,
  SparklesIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/components/providers/auth-provider'

export function LoginForm() {
  const router = useRouter()
  const {
    user,
    loading: authLoading,
    firebaseMode,
    signInWithEmail,
    signInWithGoogle,
    sendPasswordReset,
  } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Forgot password flow state
  const [isForgotMode, setIsForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Please enter both email and password.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await signInWithEmail(email.trim(), password)
      toast.success('Welcome back!')
      router.push('/dashboard')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid email or password.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setIsLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      toast.success('Signed in with Google')
      router.push('/dashboard')
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Google sign-in was cancelled or failed.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDemoSignIn() {
    setIsLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      toast.success('Signed in as Demo User (Aarav Sharma)')
      router.push('/dashboard')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Demo sign-in failed.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email to receive password reset instructions.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await sendPasswordReset(email.trim())
      setResetSent(true)
      toast.success('Password reset email sent', {
        description: firebaseMode
          ? `Check your inbox at ${email}.`
          : 'Demo mode simulated: check console or proceed with demo login.',
      })
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not send password reset email.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Decorative ambient glow */}
      <div className="pointer-events-none absolute -top-16 left-1/2 -z-10 size-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      {/* Back to Home Link */}
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        <span>Back to Train ETA</span>
      </Link>

      <Card className="overflow-hidden border-border/70 bg-card/85 shadow-card backdrop-blur-xs">
        <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col gap-2 text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isForgotMode ? 'Reset password' : 'Welcome back'}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isForgotMode
                ? 'Enter your account email to receive a password reset link.'
                : 'Sign in to access your saved trains and travel alerts.'}
            </p>
          </div>

          {/* Demo Mode Notice & 1-Click Login */}
          {!firebaseMode && (
            <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-xs text-foreground">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <SparklesIcon className="size-4 shrink-0" />
                <span>SIH Demo Mode Active</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Test with any local account, or use 1-click demo login to explore saved trains, alerts, and passenger dashboard.
              </p>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleDemoSignIn}
                disabled={isLoading}
                className="mt-1 h-9 w-full gap-1.5 font-semibold shadow-xs"
              >
                <span>Sign in as Demo User (Aarav Sharma)</span>
                <ArrowRightIcon className="size-3.5" />
              </Button>
            </div>
          )}

          {/* Inline error alert */}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
            >
              {error}
            </div>
          )}

          {/* Password Reset Confirmation */}
          {isForgotMode && resetSent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2Icon className="size-6" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-sm">Reset link dispatched</p>
                <p className="text-xs text-muted-foreground">
                  If an account with <strong>{email}</strong> exists,
                  instructions have been sent.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setIsForgotMode(false)
                  setResetSent(false)
                }}
              >
                Back to Sign in
              </Button>
            </div>
          ) : isForgotMode ? (
            /* Forgot Password Form */
            <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reset-email">Account Email</Label>
                <div className="relative">
                  <Input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="h-10 pr-9"
                  />
                  <MailIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-10 w-full"
              >
                {isLoading ? 'Sending link...' : 'Send Reset Link'}
              </Button>

              <button
                type="button"
                onClick={() => setIsForgotMode(false)}
                className="text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel and return to sign in
              </button>
            </form>
          ) : (
            /* Standard Login Form */
            <form onSubmit={handleSignIn} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="h-10 pr-9"
                  />
                  <MailIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Password</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(true)
                      setError(null)
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-10 w-full font-medium"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
                <ArrowRightIcon className="ml-1 size-4" />
              </Button>

              <div className="relative my-2 flex items-center justify-center">
                <span className="w-full border-t" />
                <span className="bg-card px-2 text-[0.7rem] text-muted-foreground uppercase">
                  or
                </span>
              </div>

              {/* Google 1-Click Sign-in */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="h-10 w-full"
              >
                <svg
                  className="mr-2 size-4"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
            </form>
          )}

          {/* Link to Register */}
          <div className="border-t pt-4 text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Create account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
