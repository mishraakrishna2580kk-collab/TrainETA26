'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  LIVE_REFRESH_CONFIG,
  clampInterval,
  deriveFreshnessState,
  formatElapsedTime,
  type FreshnessState,
} from '@/lib/live-refresh-config'
import {
  getTrackingSnapshot,
  type TrackingSnapshot,
} from '@/lib/train-service'
import type { LiveTrainStatus, Train } from '@/lib/types'

export interface UseLiveRefreshOptions {
  /** Polling interval in milliseconds (clamped between min and max) */
  intervalMs?: number
  /** Whether live auto-refresh polling is enabled */
  enabled?: boolean
  /** Whether to pause polling when the tab is backgrounded / hidden */
  pauseOnHidden?: boolean
  /** Whether to refresh immediately when refocusing if data is stale */
  refreshOnRefocus?: boolean
  /** Threshold in ms after which data is considered stale */
  staleAfterMs?: number
  /** Callback fired on successful refresh */
  onSuccess?: (snapshot: TrackingSnapshot) => void
  /** Callback fired on failed refresh */
  onError?: (error: Error) => void
}

export interface UseLiveRefreshReturn {
  train: Train | null
  status: LiveTrainStatus | null
  isLoading: boolean
  isInitialLoading: boolean
  isRefreshing: boolean
  isStale: boolean
  isOffline: boolean
  freshness: FreshnessState
  lastUpdated: Date | null
  elapsedText: string
  error: Error | null
  refreshError: Error | null
  triggerRefresh: (manual?: boolean) => Promise<void>
  intervalMs: number
}

export function useLiveRefresh(
  trainNumber: string | null,
  options: UseLiveRefreshOptions = {},
): UseLiveRefreshReturn {
  const {
    intervalMs: rawInterval = LIVE_REFRESH_CONFIG.defaultIntervalMs,
    enabled = true,
    pauseOnHidden = LIVE_REFRESH_CONFIG.pauseOnHidden,
    refreshOnRefocus = LIVE_REFRESH_CONFIG.refreshOnRefocus,
    staleAfterMs = LIVE_REFRESH_CONFIG.staleAfterMs,
    onSuccess,
    onError,
  } = options

  const intervalMs = useMemo(() => clampInterval(rawInterval), [rawInterval])

  const [train, setTrain] = useState<Train | null>(null)
  const [status, setStatus] = useState<LiveTrainStatus | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [elapsedText, setElapsedText] = useState('Waiting for update...')
  const [error, setError] = useState<Error | null>(null)
  const [refreshError, setRefreshError] = useState<Error | null>(null)

  // Mutable refs to prevent stale closures and serialize requests
  const isRefreshingRef = useRef(false)
  const lastUpdatedRef = useRef<Date | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null)
  const optionsRef = useRef({ onSuccess, onError })
  optionsRef.current = { onSuccess, onError }

  // Unified refresh executor with concurrency lock and error resilience
  const executeRefresh = useCallback(
    async (manual = false) => {
      if (!trainNumber) return

      // Concurrency lock: prevent overlapping requests
      if (isRefreshingRef.current) {
        return
      }

      // Check offline
      if (typeof window !== 'undefined' && !window.navigator.onLine) {
        if (manual) {
          toast.warning('Network offline', {
            description: 'Showing last known telemetry data.',
          })
        }
        return
      }

      isRefreshingRef.current = true
      setIsRefreshing(true)

      try {
        const snapshot = await getTrackingSnapshot(trainNumber)

        if (!snapshot.train && !snapshot.status) {
          throw new Error('Train ' + trainNumber + ' records not found')
        }

        // Error resilience: only update if non-null, retaining previous data
        if (snapshot.train) setTrain(snapshot.train)
        if (snapshot.status) setStatus(snapshot.status)

        const now = new Date()
        setLastUpdated(now)
        lastUpdatedRef.current = now
        setElapsedText('Updated just now')
        setRefreshError(null)
        setError(null)

        if (manual) {
          toast.success('Live status updated')
        }
        optionsRef.current.onSuccess?.(snapshot)
      } catch (err) {
        const errorObj =
          err instanceof Error
            ? err
            : new Error('Failed to update live train telemetry')

        setRefreshError(errorObj)

        if (manual) {
          toast.error('Failed to update status', {
            description:
              errorObj.message ||
              'Please check your connection and try again.',
          })
        }
        optionsRef.current.onError?.(errorObj)
      } finally {
        isRefreshingRef.current = false
        setIsRefreshing(false)
        setIsInitialLoading(false)
      }
    },
    [trainNumber],
  )

  const executeRefreshRef = useRef(executeRefresh)
  executeRefreshRef.current = executeRefresh

  // Check online status on mount and trigger centralized refresh upon network recovery
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!window.navigator.onLine)

      const handleOnline = () => {
        setIsOffline(false)
        void executeRefreshRef.current(false)
      }
      const handleOffline = () => {
        setIsOffline(true)
      }

      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  // Initial load
  useEffect(() => {
    if (!trainNumber) {
      setIsInitialLoading(false)
      return
    }

    let isMounted = true
    setIsInitialLoading(true)
    setError(null)

    getTrackingSnapshot(trainNumber)
      .then((snapshot) => {
        if (!isMounted) return
        setTrain(snapshot.train)
        setStatus(snapshot.status)
        const now = new Date()
        setLastUpdated(now)
        lastUpdatedRef.current = now
        setElapsedText('Updated just now')
        setIsInitialLoading(false)
      })
      .catch((err) => {
        if (!isMounted) return
        const errorObj =
          err instanceof Error
            ? err
            : new Error('Failed to load train details')
        setError(errorObj)
        setIsInitialLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [trainNumber])

  // Periodic elapsed time ticker (every 1 second)
  useEffect(() => {
    elapsedTimerRef.current = setInterval(() => {
      if (lastUpdatedRef.current) {
        setElapsedText(formatElapsedTime(lastUpdatedRef.current))
      }
    }, 1000)

    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current)
      }
    }
  }, [])

  // Central interval polling coordinator & Page Visibility handler
  useEffect(() => {
    if (!enabled || !trainNumber) return

    const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        void executeRefresh(false)
      }, intervalMs)
    }

    const stopTimer = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    startTimer()

    // Page Visibility listener
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return

      if (document.hidden) {
        if (pauseOnHidden) {
          stopTimer()
        }
      } else {
        // Tab refocus
        if (refreshOnRefocus) {
          const now = Date.now()
          const lastTs = lastUpdatedRef.current?.getTime() ?? 0
          const elapsed = now - lastTs

          // If elapsed time is greater than or equal to interval, refresh immediately
          if (elapsed >= intervalMs) {
            void executeRefresh(false)
          }
        }
        startTimer()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopTimer()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [
    enabled,
    trainNumber,
    intervalMs,
    pauseOnHidden,
    refreshOnRefocus,
    executeRefresh,
  ])

  // Derive stale state and freshness state
  const isStale = useMemo(() => {
    if (!lastUpdated) return false
    return Date.now() - lastUpdated.getTime() > staleAfterMs
  }, [lastUpdated, staleAfterMs, elapsedText])

  const freshness = useMemo(() => {
    return deriveFreshnessState({
      isOnline: !isOffline,
      isRefreshing,
      lastUpdated,
      staleAfterMs,
      hasData: Boolean(status && train),
    })
  }, [isOffline, isRefreshing, lastUpdated, staleAfterMs, status, train, isStale])

  return {
    train,
    status,
    isLoading: isInitialLoading,
    isInitialLoading,
    isRefreshing,
    isStale,
    isOffline,
    freshness,
    lastUpdated,
    elapsedText,
    error,
    refreshError,
    triggerRefresh: executeRefresh,
    intervalMs,
  }
}
