/**
 * Centralized Live Auto-Refresh Configuration and Utilities
 *
 * Single source of truth for telemetry polling rates, stale thresholds,
 * visibility policies, and freshness states.
 */

export interface LiveRefreshConfig {
  /** Default polling interval in milliseconds (30 seconds) */
  defaultIntervalMs: number
  /** Minimum allowable polling interval in milliseconds (10 seconds) */
  minIntervalMs: number
  /** Maximum allowable polling interval in milliseconds (120 seconds) */
  maxIntervalMs: number
  /** Time after which data is considered stale if not refreshed (90 seconds) */
  staleAfterMs: number
  /** Whether to pause polling when the browser tab is hidden */
  pauseOnHidden: boolean
  /** Whether to trigger an immediate refresh upon tab refocus if data is stale */
  refreshOnRefocus: boolean
}

export const LIVE_REFRESH_CONFIG: Readonly<LiveRefreshConfig> = {
  defaultIntervalMs: 30_000,
  minIntervalMs: 10_000,
  maxIntervalMs: 120_000,
  staleAfterMs: 90_000,
  pauseOnHidden: true,
  refreshOnRefocus: true,
}

export type FreshnessState =
  | 'live'
  | 'updating'
  | 'stale'
  | 'offline'
  | 'unavailable'

/**
 * Clamps a given interval to the allowed min and max bounds.
 */
export function clampInterval(intervalMs?: number): number {
  if (intervalMs === undefined || Number.isNaN(intervalMs)) {
    return LIVE_REFRESH_CONFIG.defaultIntervalMs
  }
  return Math.min(
    Math.max(intervalMs, LIVE_REFRESH_CONFIG.minIntervalMs),
    LIVE_REFRESH_CONFIG.maxIntervalMs,
  )
}

/**
 * Formats elapsed time since a given date into a human-readable string.
 *
 * Examples:
 * - Updated just now (< 5s)
 * - Updated 14s ago (< 60s)
 * - Updated 2m ago (>= 60s)
 */
export function formatElapsedTime(
  date: Date | number | null,
  now = Date.now(),
): string {
  if (!date) return 'Waiting for update...'

  const timestamp = typeof date === 'number' ? date : date.getTime()
  const deltaMs = Math.max(0, now - timestamp)
  const deltaSec = Math.floor(deltaMs / 1000)

  if (deltaSec < 5) {
    return 'Updated just now'
  }
  if (deltaSec < 60) {
    return `Updated ${deltaSec}s ago`
  }
  const deltaMin = Math.floor(deltaSec / 60)
  if (deltaMin < 60) {
    return `Updated ${deltaMin}m ago`
  }
  const deltaHours = Math.floor(deltaMin / 60)
  return `Updated ${deltaHours}h ago`
}

/**
 * Derives the semantic freshness state given connectivity, refresh activity,
 * timestamps, and stale thresholds.
 */
export function deriveFreshnessState({
  isOnline,
  isRefreshing,
  lastUpdated,
  staleAfterMs = LIVE_REFRESH_CONFIG.staleAfterMs,
  hasData,
  now = Date.now(),
}: {
  isOnline: boolean
  isRefreshing: boolean
  lastUpdated: Date | number | null
  staleAfterMs?: number
  hasData: boolean
  now?: number
}): FreshnessState {
  if (!isOnline) {
    return 'offline'
  }
  if (isRefreshing) {
    return 'updating'
  }
  if (!hasData) {
    return 'unavailable'
  }
  if (lastUpdated) {
    const ts =
      typeof lastUpdated === 'number' ? lastUpdated : lastUpdated.getTime()
    if (now - ts > staleAfterMs) {
      return 'stale'
    }
  }
  return 'live'
}
