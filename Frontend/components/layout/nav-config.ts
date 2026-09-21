export const desktopNav = [
  { href: '/', label: 'Home' },
  { href: '/track', label: 'Track Train' },
  { href: '/search', label: 'Search' },
  { href: '/saved', label: 'Saved Trains' },
  { href: '/notifications', label: 'Notifications' },
] as const

export const mobileNav = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/search', label: 'Search', icon: 'search' },
  { href: '/track', label: 'Track', icon: 'track' },
  { href: '/saved', label: 'Saved', icon: 'saved' },
  { href: '/profile', label: 'Profile', icon: 'profile' },
] as const

export function isNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
