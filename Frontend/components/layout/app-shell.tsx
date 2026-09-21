import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { MobileNav } from '@/components/layout/mobile-nav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1 pb-24 md:pb-8">{children}</main>
      <MobileNav />
    </div>
  )
}
