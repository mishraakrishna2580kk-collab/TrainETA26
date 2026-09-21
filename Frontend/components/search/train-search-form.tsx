'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useState, type FormEvent } from 'react'
import {
  ArrowRightLeftIcon,
  MapPinIcon,
  SearchIcon,
  TrainFrontIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { STATION_SUGGESTIONS, TRAINS } from '@/lib/mock-data'
import { addRecentSearch } from '@/lib/train-service'
import { useRecentSearches } from '@/lib/hooks'
import { cn } from '@/lib/utils'

interface TrainSearchFormProps {
  defaultQuery?: string
  defaultFrom?: string
  defaultTo?: string
  defaultDate?: string
  className?: string
}

const TRAIN_NUMBER = /^\d{4,5}$/

function buildSearchHref(values: {
  query: string
  from: string
  to: string
  date: string
}) {
  const params = new URLSearchParams()
  if (values.query) params.set('query', values.query)
  if (values.from) params.set('from', values.from)
  if (values.to) params.set('to', values.to)
  if (values.date) params.set('date', values.date)
  return `/search?${params.toString()}`
}

export function TrainSearchForm({
  defaultQuery = '',
  defaultFrom = '',
  defaultTo = '',
  defaultDate = '',
  className,
}: TrainSearchFormProps) {
  const router = useRouter()
  const { mutate } = useRecentSearches()
  const formId = useId()
  const [query, setQuery] = useState(defaultQuery)
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [date, setDate] = useState(defaultDate)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setQuery(defaultQuery)
    setFrom(defaultFrom)
    setTo(defaultTo)
    if (defaultDate) {
      setDate(defaultDate)
    } else {
      // Default to today's local date YYYY-MM-DD on client to avoid hydration mismatch
      const today = new Date().toLocaleDateString('en-CA')
      setDate(today)
    }
  }, [defaultQuery, defaultFrom, defaultTo, defaultDate])

  function validate() {
    const q = query.trim()
    const origin = from.trim()
    const dest = to.trim()
    if (!q && !origin && !dest) {
      return 'Enter a train number or name, or both origin and destination.'
    }
    if ((origin && !dest) || (!origin && dest)) {
      return 'Enter both origin and destination, or search by train instead.'
    }
    return null
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const message = validate()
    if (message) {
      setError(message)
      return
    }
    setError(null)

    const values = {
      query: query.trim(),
      from: from.trim(),
      to: to.trim(),
      date: date.trim(),
    }

    addRecentSearch({
      query:
        values.query ||
        [values.from, values.to].filter(Boolean).join(' → '),
      from: values.from || undefined,
      to: values.to || undefined,
    })
    await mutate()

    if (!values.from && !values.to && values.query) {
      const qLower = values.query.toLowerCase()
      const matched = TRAINS.find(
        (t) =>
          t.number === values.query ||
          t.name.toLowerCase() === qLower ||
          t.name.toLowerCase().includes(qLower),
      )
      if (matched) {
        router.push(`/track/${matched.number}`)
        return
      }
    }

    if (TRAIN_NUMBER.test(values.query) && !values.from && !values.to) {
      router.push(`/track/${values.query}`)
      return
    }

    router.push(buildSearchHref(values))
  }

  function swapStations() {
    setFrom(to)
    setTo(from)
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={cn('flex flex-col gap-4', className)}
      aria-describedby={error ? `${formId}-error` : undefined}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_auto_1fr_1fr]">
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor={`${formId}-query`} className="text-xs font-semibold text-foreground/80">
            Train number / name
          </Label>
          <div className="relative">
            <TrainFrontIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${formId}-query`}
              name="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 12951 or Rajdhani"
              list={`${formId}-trains`}
              autoComplete="off"
              className="h-11 pl-9 text-base md:text-sm shadow-2xs transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor={`${formId}-from`} className="text-xs font-semibold text-foreground/80">
              From
            </Label>
            <button
              type="button"
              onClick={swapStations}
              aria-label="Swap origin and destination"
              className="inline-flex items-center gap-1 rounded px-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 lg:hidden focus-visible:outline-none"
            >
              <ArrowRightLeftIcon className="size-3" />
              <span>Swap</span>
            </button>
          </div>
          <div className="relative">
            <MapPinIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${formId}-from`}
              name="from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Origin station"
              list={`${formId}-stations`}
              autoComplete="off"
              className="h-11 pl-9 text-base md:text-sm shadow-2xs transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="hidden items-end justify-center pb-0.5 lg:flex">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Swap origin and destination"
            onClick={swapStations}
            className="size-11 rounded-xl transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:text-primary active:scale-95"
          >
            <ArrowRightLeftIcon className="size-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${formId}-to`} className="text-xs font-semibold text-foreground/80">
            To
          </Label>
          <div className="relative">
            <MapPinIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${formId}-to`}
              name="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Destination station"
              list={`${formId}-stations`}
              autoComplete="off"
              className="h-11 pl-9 text-base md:text-sm shadow-2xs transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${formId}-date`} className="text-xs font-semibold text-foreground/80">
            Date
          </Label>
          <div className="relative">
            <Input
              id={`${formId}-date`}
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 text-base md:text-sm shadow-2xs transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      <datalist id={`${formId}-trains`}>
        {TRAINS.map((train) => (
          <option key={train.number} value={train.number}>
            {train.name} ({train.from.code} → {train.to.code})
          </option>
        ))}
      </datalist>

      <datalist id={`${formId}-stations`}>
        {STATION_SUGGESTIONS.map((station) => (
          <option key={station} value={station} />
        ))}
      </datalist>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        {error ? (
          <p id={`${formId}-error`} role="alert" className="text-xs font-medium text-destructive">
            {error}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Search by train number, or choose a route pair to get live status and estimated arrival.
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/90 px-7 font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-all hover:scale-[1.01] hover:shadow-md hover:shadow-primary/30 active:scale-[0.99] sm:w-auto"
        >
          <SearchIcon className="size-4" />
          <span>Track Train</span>
        </Button>
      </div>
    </form>
  )
}
