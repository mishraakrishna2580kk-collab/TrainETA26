'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookmarkIcon,
  HomeIcon,
  SearchIcon,
  TrainFrontIcon,
  UserIcon,
} from 'lucide-react'
import { mobileNav, isNavActive } from '@/components/layout/nav-config'
import { cn } from '@/lib/utils'

const icons = {
  home: HomeIcon,
  search: SearchIcon,
  track: TrainFrontIcon,
  saved: BookmarkIcon,
  profile: UserIcon,
} as const

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg shadow-floating md:hidden transition-all"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 px-1.5 py-1">
        {mobileNav.map((item) => {
          const Icon = icons[item.icon]
          const active = isNavActive(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[0.68rem] font-medium transition-all duration-150',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  active
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-lg transition-transform duration-150',
                    active && 'bg-primary/10 scale-105',
                  )}
                >
                  <Icon className="size-4.5" aria-hidden />
                </span>
                <span>{item.label}</span>
                {active && (
                  <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
