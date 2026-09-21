'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BellIcon } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { UserMenu } from '@/components/layout/user-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { desktopNav, isNavActive } from '@/components/layout/nav-config'
import { useNotifications } from '@/lib/hooks'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const pathname = usePathname()
  const { unread } = useNotifications()

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group shrink-0 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label="Train ETA Home"
        >
          <Logo size={34} />
        </Link>

        <nav
          aria-label="Primary Navigation"
          className="hidden min-w-0 items-center justify-center lg:flex"
        >
          <div className="flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 p-1 shadow-2xs backdrop-blur-xs">
            {desktopNav.map((item) => {
              const active = isNavActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    active
                      ? 'bg-card text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/notifications"
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
            className={cn(
              'relative inline-flex size-9 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-all hover:border-border/60 hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              pathname === '/notifications' && 'border-border/80 bg-accent text-accent-foreground font-semibold',
            )}
          >
            <BellIcon className="size-4" />
            {unread > 0 && (
              <span className="absolute top-2 right-2 flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-destructive animate-ping opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-destructive ring-2 ring-background" />
              </span>
            )}
          </Link>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
