'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRightIcon,
  BellIcon,
  BookmarkIcon,
  CheckCircle2Icon,
  CheckIcon,
  CopyIcon,
  FingerprintIcon,
  LayoutDashboardIcon,
  Loader2Icon,
  LogInIcon,
  LogOutIcon,
  MailIcon,
  MonitorIcon,
  MoonIcon,
  PencilIcon,
  ShieldCheckIcon,
  SunIcon,
  UserCheckIcon,
  UserIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/states/status-states'
import { useAuth } from '@/components/providers/auth-provider'
import { useNotifications, useSavedTrains } from '@/lib/hooks'
import { cn } from '@/lib/utils'

function getInitials(name?: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function ProfileContent() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const {
    user,
    loading: authLoading,
    firebaseMode,
    updateName,
    signOut,
  } = useAuth()

  const { saved } = useSavedTrains()
  const { unread } = useNotifications()

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Logout Dialog State
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  // Copy UID State
  const [copiedUid, setCopiedUid] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (user?.name && !isEditing) {
      setName(user.name)
    }
  }, [user?.name, isEditing])

  // Redirect unauthenticated visitors to login
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [authLoading, user, router])

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed.length < 2) {
      toast.error('Display name must be at least 2 characters.')
      return
    }

    if (trimmed === user?.name) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await updateName(trimmed)
      toast.success('Profile updated successfully')
      setIsEditing(false)
    } catch {
      toast.error('Failed to update profile name. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancelEdit() {
    setName(user?.name || '')
    setIsEditing(false)
  }

  async function handleConfirmLogout() {
    setIsSigningOut(true)
    try {
      await signOut()
      toast.success('Signed out successfully')
      setIsLogoutDialogOpen(false)
      router.replace('/login')
    } catch {
      toast.error('Failed to sign out. Please try again.')
      setIsSigningOut(false)
    }
  }

  async function handleCopyUid(uid: string) {
    try {
      await navigator.clipboard.writeText(uid)
      setCopiedUid(true)
      toast.success('User ID copied to clipboard')
      setTimeout(() => setCopiedUid(false), 2000)
    } catch {
      toast.error('Failed to copy User ID')
    }
  }

  // 1. Loading State Skeleton
  if (authLoading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 md:py-12 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-muted" />
            <div className="flex flex-col gap-2">
              <div className="h-6 w-44 rounded-md bg-muted" />
              <div className="h-4 w-56 rounded-md bg-muted/60" />
            </div>
          </div>
          <div className="h-9 w-28 rounded-lg bg-muted" />
        </div>

        {/* Cards Skeletons */}
        <div className="h-52 rounded-2xl border border-border/60 bg-card" />
        <div className="h-44 rounded-2xl border border-border/60 bg-card" />
        <div className="h-32 rounded-2xl border border-border/60 bg-card" />
      </div>
    )
  }

  // 2. Unauthenticated Fallback (while redirecting)
  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6">
        <EmptyState
          icon={UserIcon}
          title="Redirecting to sign in..."
          description="You need to be signed in to manage your account profile and travel preferences."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="sm" render={<Link href="/login" />}>
                <LogInIcon data-icon="inline-start" />
                Go to Sign In
              </Button>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/register" />}
              >
                Create account
              </Button>
            </div>
          }
        />
      </div>
    )
  }

  const initials = getInitials(user.name)
  const isNameChanged = name.trim() !== (user.name || '')
  const isNameValid = name.trim().length >= 2

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 md:py-10">
      {/* 1. Profile Hero & Header */}
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-6 shadow-card backdrop-blur-xs sm:p-8">
        {/* Ambient radial glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 -z-10 size-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Initials-based Avatar */}
            <Avatar className="size-16 rounded-2xl border-2 border-primary/20 shadow-md sm:size-20">
              {user.photoURL && (
                <AvatarImage src={user.photoURL} alt={user.name} />
              )}
              <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 font-display text-xl font-bold text-primary sm:text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {user.name}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2Icon className="size-3" />
                  Active
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                {user.email || 'No email attached'}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <ShieldCheckIcon className="size-3 text-primary" />
                  {firebaseMode ? 'Firebase Cloud Auth' : 'Local Demo Mode'}
                </span>
              </div>
            </div>
          </div>

          {!isEditing && (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setName(user.name)
                  setIsEditing(true)
                }}
                className="gap-1.5 font-semibold"
              >
                <PencilIcon className="size-3.5" />
                <span>Edit Profile</span>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* 2. Personal Information Card */}
      <Card className="overflow-hidden border-border/70 bg-card/85 shadow-card backdrop-blur-xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <UserIcon className="size-3.5" />
              </span>
              <CardTitle className="font-display text-base font-bold tracking-tight text-foreground">
                Personal Information
              </CardTitle>
            </div>
            {isEditing && (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Editing
              </span>
            )}
          </div>
          <CardDescription className="text-xs">
            Your passenger details are used for journey predictions, status cards, and live notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          {isEditing ? (
            <form onSubmit={handleSaveName} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-name" className="text-xs font-semibold">
                  Full Name / Display Name
                </Label>
                <div className="relative">
                  <Input
                    id="edit-name"
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="h-10 pr-9 text-sm"
                  />
                  <UserIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                {!isNameValid && name.length > 0 && (
                  <p className="text-[11px] text-destructive">
                    Name must be at least 2 characters.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-email-readonly" className="text-xs font-semibold text-muted-foreground">
                  Email Address (Read-only)
                </Label>
                <div className="relative">
                  <Input
                    id="edit-email-readonly"
                    type="email"
                    disabled
                    value={user.email || 'No email attached'}
                    className="h-10 cursor-not-allowed bg-muted/40 pr-9 text-sm opacity-80"
                  />
                  <MailIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Email is bound to your authentication identity and cannot be changed here.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
                <span className="text-xs text-muted-foreground">
                  {isNameChanged ? 'Unsaved changes' : 'No changes made'}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="gap-1 text-xs"
                  >
                    <XIcon className="size-3.5" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!isNameChanged || !isNameValid || isSaving}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    {isSaving ? (
                      <>
                        <Loader2Icon className="size-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="size-3.5" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/20 p-3.5">
                <span className="text-[11px] font-medium text-muted-foreground">Full Name</span>
                <span className="text-sm font-semibold text-foreground">{user.name}</span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/20 p-3.5">
                <span className="text-[11px] font-medium text-muted-foreground">Email Address</span>
                <span className="truncate text-sm font-semibold text-foreground">
                  {user.email || 'No email attached'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Account Information Card */}
      <Card className="overflow-hidden border-border/70 bg-card/85 shadow-card backdrop-blur-xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <ShieldCheckIcon className="size-3.5" />
            </span>
            <CardTitle className="font-display text-base font-bold tracking-tight text-foreground">
              Account Credentials
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Security credentials and session identifier
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3.5 pt-5">
          {/* Provider row */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <UserCheckIcon className="size-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">Authentication Provider</span>
                <span className="text-[11px] text-muted-foreground">
                  {firebaseMode
                    ? user.email.includes('@gmail')
                      ? 'Google Authentication (Firebase Cloud)'
                      : 'Email & Password (Firebase Cloud)'
                    : 'Local Client-side Demo Provider'}
                </span>
              </div>
            </div>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Verified
            </span>
          </div>

          {/* User ID row */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-accent text-accent-foreground">
                <FingerprintIcon className="size-4" />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground">Unique User ID (UID)</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {user.uid}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyUid(user.uid)}
              className="shrink-0 gap-1 text-xs"
              aria-label="Copy User ID"
            >
              {copiedUid ? (
                <>
                  <CheckIcon className="size-3 text-emerald-500" />
                  <span className="text-emerald-500 text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon className="size-3 text-muted-foreground" />
                  <span className="text-muted-foreground text-[11px]">Copy</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 4. Quick Account Actions */}
      <Card className="overflow-hidden border-border/70 bg-card/85 shadow-card backdrop-blur-xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <LayoutDashboardIcon className="size-3.5" />
            </span>
            <CardTitle className="font-display text-base font-bold tracking-tight text-foreground">
              Travel Workspace
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Quick shortcuts to your personal railway dashboard, saved routes, and live notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 pt-5 sm:grid-cols-3">
          {/* Saved Trains */}
          <Link
            href="/saved"
            className="group flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-4 transition-all hover:border-primary/40 hover:bg-card hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <BookmarkIcon className="size-4" />
              </span>
              <span className="rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {saved?.length ?? 0} saved
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Saved Trains
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Pinned itineraries
                </span>
              </div>
              <ArrowRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>
          </Link>

          {/* Notifications */}
          <Link
            href="/notifications"
            className="group flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-4 transition-all hover:border-primary/40 hover:bg-card hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <BellIcon className="size-4" />
              </span>
              {unread > 0 ? (
                <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                  {unread} new
                </span>
              ) : (
                <span className="rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  0 unread
                </span>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Notifications
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Platform & delay alerts
                </span>
              </div>
              <ArrowRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>
          </Link>

          {/* Dashboard */}
          <Link
            href="/dashboard"
            className="group flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-4 transition-all hover:border-primary/40 hover:bg-card hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <LayoutDashboardIcon className="size-4" />
              </span>
              <span className="rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Live
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Dashboard
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Full status overview
                </span>
              </div>
              <ArrowRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* 5. Appearance Section */}
      <Card className="overflow-hidden border-border/70 bg-card/85 shadow-card backdrop-blur-xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <SunIcon className="size-3.5" />
            </span>
            <CardTitle className="font-display text-base font-bold tracking-tight text-foreground">
              Appearance & Theme
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Customize the color scheme to suit daylight travel or night-time monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          {mounted ? (
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  theme === 'light'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border/60 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <SunIcon className="size-4" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  theme === 'dark'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border/60 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <MoonIcon className="size-4" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('system')}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  theme === 'system'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border/60 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <MonitorIcon className="size-4" />
                <span>System</span>
              </button>
            </div>
          ) : (
            <div className="h-14 rounded-xl bg-muted/40 animate-pulse" />
          )}
        </CardContent>
      </Card>

      {/* 6. Security & Session (Logout Section) */}
      <Card className="overflow-hidden border-destructive/25 bg-card/85 shadow-card backdrop-blur-xs">
        <CardHeader className="border-b border-destructive/20 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive">
              <LogOutIcon className="size-3.5" />
            </span>
            <CardTitle className="font-display text-base font-bold tracking-tight text-destructive">
              Security & Session
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Manage your account authentication session on this browser
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">Sign out of this device</span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              End your active session. You will need to sign in again to access saved trains and live alerts.
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsLogoutDialogOpen(true)}
            className="w-full shrink-0 gap-1.5 font-semibold sm:w-auto"
          >
            <LogOutIcon className="size-3.5" />
            <span>Log out</span>
          </Button>
        </CardContent>
      </Card>

      {/* 7. Logout Confirmation Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent showCloseButton={!isSigningOut} className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
                <LogOutIcon className="size-4" />
              </span>
              <DialogTitle className="font-display text-lg font-bold">
                Log out of Train ETA?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs leading-relaxed text-muted-foreground pt-1">
              Are you sure you want to end your session? Your pinned trains, custom notification preferences, and trip history remain securely stored.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSigningOut}
              onClick={() => setIsLogoutDialogOpen(false)}
              className="text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isSigningOut}
              onClick={handleConfirmLogout}
              className="gap-1.5 text-xs font-semibold"
            >
              {isSigningOut ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOutIcon className="size-3.5" />
                  <span>Log out</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
