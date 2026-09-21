'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Map, Marker, setWorkerUrl, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// Explicitly configure MapLibre Web Worker to use local static assets in /public/maplibre
// This prevents Next.js / Turbopack from failing module script resolution for the worker
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')
import {
  AlertTriangleIcon,
  CrosshairIcon,
  Maximize2Icon,
  MinusIcon,
  PlusIcon,
  RadioIcon,
  RotateCcwIcon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LiveTrainStatus, Train } from '@/lib/types'
import {
  getRailwayMapData,
  type MapStationStop,
  type RailwayMapData,
} from '@/lib/map-data'

interface RailwayRouteMapProps {
  train: Train
  live: LiveTrainStatus
  className?: string
}

/**
 * Returns the MapLibre style definition.
 * Uses OpenFreeMap (Positron for light mode, Dark for dark mode).
 * OpenFreeMap is free, open-source, production-ready, requires NO API key,
 * and does NOT show watermarks like "API KEY REQUIRED".
 *
 * Optional environment variable overrides:
 * - NEXT_PUBLIC_MAP_STYLE_LIGHT
 * - NEXT_PUBLIC_MAP_STYLE_DARK
 * - NEXT_PUBLIC_MAP_STYLE_URL
 */
function getBasemapStyle(isDark: boolean): string | StyleSpecification {
  const customStyle = isDark
    ? process.env.NEXT_PUBLIC_MAP_STYLE_DARK || process.env.NEXT_PUBLIC_MAP_STYLE_URL
    : process.env.NEXT_PUBLIC_MAP_STYLE_LIGHT || process.env.NEXT_PUBLIC_MAP_STYLE_URL

  if (customStyle) {
    return customStyle
  }

  // OpenFreeMap vector styles (hosted, free, open-source, no key needed)
  return isDark
    ? 'https://tiles.openfreemap.org/styles/dark'
    : 'https://tiles.openfreemap.org/styles/positron'
}

export function RailwayRouteMap({
  train,
  live,
  className,
}: RailwayRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<Marker[]>([])
  const trainMarkerRef = useRef<Marker | null>(null)

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [selectedStation, setSelectedStation] = useState<MapStationStop | null>(
    null,
  )
  const [mapError, setMapError] = useState<string | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)

  // Compute GeoJSON map data
  const mapData: RailwayMapData = getRailwayMapData(train, live)

  // Fit bounds helper — sensible framing focused on the active route
  const fitRoute = useCallback(() => {
    if (!mapRef.current) return
    mapRef.current.fitBounds(mapData.bounds, {
      padding: { top: 48, bottom: 48, left: 36, right: 36 },
      maxZoom: 9,
      duration: 800,
    })
  }, [mapData.bounds])

  // Center on current train position
  const centerOnTrain = useCallback(() => {
    if (!mapRef.current) return
    mapRef.current.flyTo({
      center: mapData.currentTrainPosition,
      zoom: 8,
      speed: 1.2,
      curve: 1.4,
      essential: true,
    })
  }, [mapData.currentTrainPosition])

  // Zoom controls
  const handleZoomIn = () => mapRef.current?.zoomIn({ duration: 300 })
  const handleZoomOut = () => mapRef.current?.zoomOut({ duration: 300 })

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    let isMounted = true

    try {
      const map = new Map({
        container: mapContainerRef.current,
        style: getBasemapStyle(isDark),
        center: mapData.routeCenter,
        bounds: mapData.bounds,
        fitBoundsOptions: {
          padding: { top: 48, bottom: 48, left: 36, right: 36 },
          maxZoom: 9,
        },
        attributionControl: false, // custom accessible attribution rendered below
      })

      mapRef.current = map

      map.on('load', () => {
        if (!isMounted) return

        // 1. Add route sources and lines
        map.addSource('route-full', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: mapData.fullRoute,
            },
          },
        })

        // Route casing / backing underlay for high contrast
        map.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route-full',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': isDark ? '#020617' : '#ffffff',
            'line-width': 8,
            'line-opacity': isDark ? 0.9 : 0.85,
          },
        })

        // Remaining track (dashed / secondary)
        map.addSource('route-remaining', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: mapData.remainingRoute,
            },
          },
        })

        map.addLayer({
          id: 'route-remaining-line',
          type: 'line',
          source: 'route-remaining',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': isDark ? '#94a3b8' : '#64748b',
            'line-width': 3.5,
            'line-dasharray': [3, 2],
          },
        })

        // Completed / Traversed track (solid emerald / primary)
        map.addSource('route-completed', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: mapData.completedRoute,
            },
          },
        })

        map.addLayer({
          id: 'route-completed-line',
          type: 'line',
          source: 'route-completed',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': isDark ? '#10b981' : '#059669',
            'line-width': 5,
            'line-opacity': 0.95,
          },
        })

        // 2. Add Station HTML Markers
        markersRef.current.forEach((m) => m.remove())
        markersRef.current = []

        mapData.stations.forEach((station) => {
          const el = document.createElement('button')
          el.type = 'button'
          el.setAttribute(
            'aria-label',
            `Station ${station.name} (${station.code}) - ${station.status}`,
          )
          el.className =
            'group relative flex items-center justify-center transition-transform duration-200 hover:scale-125 focus:outline-hidden'

          if (station.isOrigin) {
            // Origin marker (blue badge with ORG indicator)
            el.innerHTML = `
              <div class="relative flex items-center gap-1 rounded-md bg-sky-600 px-1.5 py-0.5 text-white font-mono font-bold text-[10px] shadow-md border-2 border-background ring-2 ring-sky-500/30">
                <span>${station.code}</span>
                <span class="text-[8px] opacity-80">ORG</span>
              </div>
            `
          } else if (station.isDestination) {
            // Destination marker (red badge with DST indicator)
            el.innerHTML = `
              <div class="relative flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-white font-mono font-bold text-[10px] shadow-md border-2 border-background ring-2 ring-rose-500/30">
                <span>${station.code}</span>
                <span class="text-[8px] opacity-80">DST</span>
              </div>
            `
          } else if (station.status === 'current') {
            // Current station stop
            el.innerHTML = `
              <div class="relative flex items-center justify-center size-6 rounded-full bg-emerald-600 text-white shadow-md border-2 border-background ring-4 ring-emerald-500/40 animate-pulse">
                <div class="size-2 rounded-full bg-white"></div>
              </div>
            `
          } else if (station.status === 'passed' || station.status === 'departed') {
            // Passed station (emerald / checkmark)
            el.innerHTML = `
              <div class="relative flex items-center justify-center size-5 rounded-full bg-emerald-600 text-white shadow-xs border-2 border-background">
                <svg class="size-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            `
          } else {
            // Upcoming station (neutral ring)
            el.innerHTML = `
              <div class="relative flex items-center justify-center size-4 rounded-full bg-background border-2 border-slate-500 dark:border-slate-400 shadow-2xs">
                <div class="size-1.5 rounded-full bg-slate-500 dark:bg-slate-400"></div>
              </div>
            `
          }

          // Tooltip on hover
          const label = document.createElement('div')
          label.className =
            'pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex whitespace-nowrap rounded-md bg-foreground/90 px-2 py-0.5 font-mono text-[10px] font-bold text-background shadow-xs'
          label.innerText = `${station.code} • ${station.name}`
          el.appendChild(label)

          el.onclick = (e) => {
            e.stopPropagation()
            setSelectedStation(station)
          }

          const marker = new Marker({ element: el })
            .setLngLat(station.coordinates)
            .addTo(map)

          markersRef.current.push(marker)
        })

        // 3. Add Live Train Beacon Marker
        const trainEl = document.createElement('div')
        trainEl.setAttribute(
          'aria-label',
          `Live Train ${train.number} ${train.name} at ${mapData.currentStationName}, speed ${mapData.speedKmh} km/h`,
        )
        trainEl.className =
          'relative flex items-center justify-center cursor-pointer group'
        trainEl.innerHTML = `
          <div class="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping motion-reduce:hidden"></div>
          <div class="absolute -inset-1 rounded-full bg-emerald-500/40 animate-pulse"></div>
          <div class="relative flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-600 px-2.5 py-1 text-white shadow-elevated transition-transform group-hover:scale-105">
            <svg class="size-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M4 15.5C4 17.43 5.57 19 7.5 19L6 20.5V21H18V20.5L16.5 19C18.43 19 20 17.43 20 15.5V5C20 2.5 16.42 2 12 2C7.58 2 4 2.5 4 5V15.5ZM12 4C17 4 18 4.65 18 6V10H6V6C6 4.65 7 4 12 4ZM6 12H18V15.5C18 16.33 17.33 17 16.5 17H7.5C6.67 17 6 16.33 6 15.5V12ZM8.5 16C9.33 16 10 15.33 10 14.5C10 13.67 9.33 13 8.5 13C7.67 13 7 13.67 7 14.5C7 15.33 7.67 16 8.5 16ZM15.5 16C16.33 16 17 15.33 17 14.5C17 13.67 16.33 13 15.5 13C14.67 13 14 13.67 14 14.5C14 15.33 14.67 16 15.5 16Z"/>
            </svg>
            <span class="font-mono text-[10px] font-bold tracking-tight">LIVE • ${mapData.speedKmh} km/h</span>
          </div>
        `

        trainEl.onclick = () => {
          centerOnTrain()
        }

        const trainMarker = new Marker({ element: trainEl })
          .setLngLat(mapData.currentTrainPosition)
          .addTo(map)

        trainMarkerRef.current = trainMarker
        markersRef.current.push(trainMarker)

        setIsMapReady(true)
      })

      map.on('error', () => {
        setMapError('Failed to load map canvas')
      })
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'MapLibre initialization failed'
      setMapError(msg)
    }

    return () => {
      isMounted = false
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      trainMarkerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [isDark, mapData.fullRoute.length]) // re-mount if theme changes

  /*
   * Keep the live train marker synchronized with the latest
   * RailRadar position without rebuilding the entire map.
   */
  useEffect(() => {
    const marker = trainMarkerRef.current
    const map = mapRef.current

    if (!marker || !map || !isMapReady) return

    marker.setLngLat(mapData.currentTrainPosition)

    const remainingSource = map.getSource('route-remaining')

    if (remainingSource && 'setData' in remainingSource) {
      remainingSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: mapData.remainingRoute,
        },
      })
    }

    const completedSource = map.getSource('route-completed')

    if (completedSource && 'setData' in completedSource) {
      completedSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: mapData.completedRoute,
        },
      })
    }
  }, [
    isMapReady,
    mapData.currentTrainPosition,
    mapData.remainingRoute,
    mapData.completedRoute,
  ])

  // Dismiss station popup on map background click
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const onMapClick = () => setSelectedStation(null)
    map.on('click', onMapClick)
    return () => {
      map.off('click', onMapClick)
    }
  }, [isMapReady])

  // Fallback state if WebGL/Map fails to load
  if (mapError) {
    return (
      <div
        role="region"
        aria-label="Railway Route Map Fallback"
        className={cn(
          'relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-6 shadow-card backdrop-blur-xs',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangleIcon className="size-4" />
            </span>
            <span className="font-display text-sm font-bold text-foreground">
              Interactive Map Unavailable
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMapError(null)}
            className="h-7 gap-1 text-xs"
          >
            <RotateCcwIcon className="size-3" />
            Retry
          </Button>
        </div>

        {/* Schematic fallback corridor */}
        <div className="my-6 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Hardware acceleration or WebGL tiles could not be initialized. Showing
            schematic route progression:
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 p-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Origin
              </span>
              <span className="font-display text-sm font-bold text-foreground">
                {train.from.station} ({train.from.code})
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                Dep {train.from.time}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <RadioIcon className="size-2.5 animate-pulse" />
                Live: {mapData.currentStationName}
              </span>
              <div className="my-1 h-px w-24 bg-border" />
              <span className="text-[10px] text-muted-foreground">
                Next: {mapData.nextStationName}
              </span>
            </div>

            <div className="flex flex-col text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Destination
              </span>
              <span className="font-display text-sm font-bold text-foreground">
                {train.to.station} ({train.to.code})
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                ETA {train.eta}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      role="region"
      aria-label={`Interactive railway route map for train ${train.number} ${train.name}`}
      className={cn(
        'group relative h-[380px] w-full overflow-hidden rounded-2xl border border-border/70 bg-card/85 shadow-card backdrop-blur-xs sm:h-[450px] lg:h-[520px]',
        className,
      )}
    >
      {/* MapLibre WebGL Canvas Container */}
      <div ref={mapContainerRef} className="size-full" />

      {/* Top Left: Live Status Pill */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 shadow-md backdrop-blur-md">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-display text-xs font-bold tracking-tight text-foreground">
            Live Route Radar
          </span>
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
            • {train.number} ({train.from.code} → {train.to.code})
          </span>
        </div>
      </div>

      {/* Top Right: Map Controls Toolbar */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-background/90 text-foreground shadow-md backdrop-blur-md transition-all hover:bg-muted hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PlusIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-background/90 text-foreground shadow-md backdrop-blur-md transition-all hover:bg-muted hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MinusIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={centerOnTrain}
          aria-label="Center on live train"
          title="Center on live train"
          className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-background/90 text-primary shadow-md backdrop-blur-md transition-all hover:bg-primary/10 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CrosshairIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={fitRoute}
          aria-label="Fit entire route"
          title="Fit entire route"
          className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-background/90 text-foreground shadow-md backdrop-blur-md transition-all hover:bg-muted hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Maximize2Icon className="size-4" />
        </button>
      </div>

      {/* Bottom Left: Route Legend Badge */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-3 rounded-xl border border-border/60 bg-background/85 px-3 py-1.5 shadow-sm backdrop-blur-md text-[11px] text-muted-foreground font-medium">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-sky-500" />
          Origin
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-3 rounded-full bg-emerald-500" />
          Traversed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Train
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-3 rounded-full bg-slate-400 dark:bg-slate-600" />
          Upcoming
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-rose-500" />
          Destination
        </span>
      </div>

      {/* Bottom Right: Required Basemap Attribution */}
      <div className="pointer-events-auto absolute bottom-2 right-2 z-10 rounded-md bg-background/80 px-2 py-0.5 text-[9px] text-muted-foreground backdrop-blur-xs sm:text-[10px]">
        <span>Map data © </span>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          OpenStreetMap
        </a>
        <span> • Tiles © </span>
        <a
          href="https://openfreemap.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          OpenFreeMap
        </a>
      </div>

      {/* Interactive Selected Station Details Card */}
      {selectedStation && (
        <div
          role="dialog"
          aria-label={`Station details for ${selectedStation.name}`}
          className="absolute bottom-3 left-3 right-3 z-20 mx-auto max-w-sm rounded-2xl border border-border/80 bg-background/95 p-4 shadow-elevated backdrop-blur-lg transition-all animate-in fade-in slide-in-from-bottom-2 sm:left-3 sm:right-auto"
        >
          <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2.5">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                  {selectedStation.code}
                </span>
                <span className="font-display text-sm font-bold text-foreground">
                  {selectedStation.name}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Day {selectedStation.day} • {selectedStation.city}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedStation(null)}
              aria-label="Close station info"
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 text-xs">
            <div className="flex flex-col rounded-lg border border-border/50 bg-muted/30 p-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Scheduled
              </span>
              <span className="font-display font-semibold tabular-nums text-foreground">
                {selectedStation.arrival || selectedStation.departure || '—'}
              </span>
            </div>

            <div className="flex flex-col rounded-lg border border-border/50 bg-muted/30 p-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Status / Delay
              </span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  (selectedStation.delayMinutes ?? 0) > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {(selectedStation.delayMinutes ?? 0) > 0
                  ? `+${selectedStation.delayMinutes}m late`
                  : 'On time'}
              </span>
            </div>

            {selectedStation.platform && (
              <div className="col-span-2 flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5">
                <span className="text-[11px] text-muted-foreground">
                  Arrival Platform
                </span>
                <span className="font-mono text-xs font-bold text-foreground">
                  Platform {selectedStation.platform}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
