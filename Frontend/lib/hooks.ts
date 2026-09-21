'use client'

import useSWR from 'swr'
import {
  getNotifications,
  getRecentSearches,
  getSavedTrains,
  getTrainDetails,
  getTrainStatus,
  searchTrains,
  type SearchParams,
} from '@/lib/train-service'

export function useNotifications() {
  const { data, isLoading, error, mutate } = useSWR(
    'notifications',
    getNotifications,
  )
  const unread = data?.filter((n) => !n.read).length ?? 0
  return { notifications: data, unread, isLoading, error, mutate }
}

export function useSavedTrains() {
  const { data, isLoading, error, mutate } = useSWR(
    'saved-trains',
    getSavedTrains,
  )
  return { saved: data, isLoading, error, mutate }
}

export function useTrainSearch(params: SearchParams | null) {
  const key = params
    ? ['search', params.query ?? '', params.from ?? '', params.to ?? '']
    : null
  const { data, isLoading, error } = useSWR(key, () => searchTrains(params!))
  return { results: data, isLoading, error }
}

export function useTrainDetails(trainNumber: string | null) {
  const { data, isLoading, error, mutate } = useSWR(
    trainNumber ? ['train', trainNumber] : null,
    () => getTrainDetails(trainNumber!),
  )
  return { train: data, isLoading, error, mutate }
}

export function useTrainStatus(
  trainNumber: string | null,
  options?: { refreshInterval?: number },
) {
  const { data, isLoading, error, mutate } = useSWR(
    trainNumber ? ['status', trainNumber] : null,
    () => getTrainStatus(trainNumber!),
    { refreshInterval: options?.refreshInterval ?? 0 },
  )
  return { status: data, isLoading, error, mutate }
}

export function useRecentSearches() {
  const { data, isLoading, error, mutate } = useSWR(
    'recent-searches',
    getRecentSearches,
  )
  return { recent: data, isLoading, error, mutate }
}
