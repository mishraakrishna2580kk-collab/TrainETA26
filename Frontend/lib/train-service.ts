import type {
  AppNotification,
  DelayAnalysis,
  LiveTrainStatus,
  NetworkStatus,
  OperationalEvent,
  RecentSearch,
  SavedTrain,
  Train,
  StationStop,
} from '@/lib/types'

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:8000'

async function api<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null as T
    }

    let message = `API request failed (${response.status})`

    try {
      const body = await response.json()
      message = body.detail || message
    } catch {
      // Keep HTTP status message.
    }

    throw new Error(message)
  }

  return response.json() as Promise<T>
}

function normalize(value: string | undefined | null) {
  return (value ?? '').trim().toLowerCase()
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface SearchParams {
  query?: string
  from?: string
  to?: string
}

interface BackendTrain {
  train_number: string
  train_name: string
  source_station_code: string
  destination_station_code: string
}

interface BackendRouteStop {
  train_number?: string
  stop_sequence: number
  station_code: string
  station_name: string
  distance_km: number | null
  scheduled_arrival: string | null
  scheduled_departure: string | null
}

interface BackendRouteResponse {
  train_number: string
  route: BackendRouteStop[]
}

interface BackendStationObject {
  code?: string
  name?: string
  sequence?: number
  status?: string
  is_halt?: boolean
}

type BackendStationValue =
  | string
  | BackendStationObject
  | null
  | undefined

interface BackendPosition {
  latitude?: number | null
  longitude?: number | null
  distance_from_origin_km?: number | null
  distance_to_next_station_km?: number | null
  segment_progress?: number | null
}

interface BackendLive {
  train_number: string
  status?: string | null
  delay_minutes?: number | null
  eta?: string | null
  original_arrival?: string | null

  current_station?: BackendStationValue
  current_station_code?: string | null

  next_station?: BackendStationValue
  next_station_code?: string | null

  distance_remaining?: number | null
  total_distance?: number | null
  speed_kmph?: number | null
  platform?: string | number | null
  last_updated_seconds?: number | null
  progress?: number | null

  last_updated_at?: string | null
  tracking_mode?: string | null

  position?: BackendPosition | null
}

interface BackendEtaDynamic {
  train_number: string
  train_name?: string | null

  current_station?: BackendStationValue
  next_station?: BackendStationValue
  destination?: BackendStationValue

  current_delay_minutes?: number | null
  predicted_propagation_minutes?: number | null
  predicted_delay_minutes?: number | null

  scheduled_arrival?: string | null
  predicted_arrival?: string | null

  progress?: number | null
  remaining_distance_km?: number | null

  basis?: string | null
  model?: string | null
  notes?: string[]

  live_data?: BackendLive
}

interface BackendEtaRouteStop {
  stop_sequence: number
  station_code: string
  station_name: string
  distance_km: number
  scheduled_arrival: string
  predicted_arrival: string
  predicted_delay_minutes: number
  actual_arrival?: string | null
  prediction_error_minutes?: number | null
  route_progress: number
  status: string
}

interface BackendEtaRouteResponse {
  train_number: string
  train_name?: string | null

  current_station?: BackendStationValue
  next_station?: BackendStationValue
  destination?: BackendStationValue

  current_delay_minutes?: number | null
  predicted_destination_delay_minutes?: number | null
  final_predicted_destination_delay_minutes?: number | null

  live_speed_kmph?: number | null
  expected_speed_kmph?: number | null

  speed_adjustment_minutes?: number | null
  operational_adjustment_minutes?: number | null
  event_adjustment_minutes?: number | null

  congestion?: {
    level?: string
    score?: number
    delay_signal_minutes?: number
    speed_ratio?: number | null
  }

  preceding_train?: {
    estimated_effect_minutes?: number
    method?: string
  }

  events?: unknown[]

  position?: BackendPosition | null

  stations?: BackendEtaRouteStop[]
  route?: BackendEtaRouteStop[]
  remaining_stops?: BackendEtaRouteStop[]
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function stationLabel(value: BackendStationValue): string {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object') {
    if (
      typeof value.name === 'string' &&
      value.name.trim()
    ) {
      return value.name
    }

    if (
      typeof value.code === 'string' &&
      value.code.trim()
    ) {
      return value.code
    }
  }

  return ''
}

function stationCity(name: string) {
  return name
}

/*
 * Converts:
 *
 * 2026-09-18T18:14:33.995883
 *
 * into:
 *
 * 18:14
 *
 * This prevents the raw ISO timestamp from being rendered
 * as the passenger-facing ETA.
 */
function formatDateTime(value: string | null | undefined) {
  if (!value) return ''

  const match = value.match(
    /T(\d{2}):(\d{2})/,
  )

  if (match) {
    return `${match[1]}:${match[2]}`
  }

  return value.length >= 5
    ? value.slice(0, 5)
    : value
}

function formatTime(
  value: string | null | undefined,
) {
  if (!value) return ''

  const match = value.match(
    /^(\d{2}):(\d{2})/,
  )

  if (match) {
    return `${match[1]}:${match[2]}`
  }

  return formatDateTime(value)
}

function clampProgress(value: number) {
  return Math.max(
    0,
    Math.min(1, value),
  )
}

/* -------------------------------------------------------------------------- */
/* Train mapping                                                              */
/* -------------------------------------------------------------------------- */

function mapTrain(
  data: BackendTrain,
  route: BackendRouteStop[] = [],
): Train {
  const first = route[0]
  const last = route[route.length - 1]

  return {
    number: data.train_number,
    name: data.train_name,
    type: 'Coaching Train',

    from: {
      code: data.source_station_code,
      station:
        first?.station_name ??
        data.source_station_code,
      city:
        first?.station_name ??
        data.source_station_code,
      time: formatTime(
        first?.scheduled_departure ??
          first?.scheduled_arrival,
      ),
    },

    to: {
      code: data.destination_station_code,
      station:
        last?.station_name ??
        data.destination_station_code,
      city:
        last?.station_name ??
        data.destination_station_code,
      time: formatTime(
        last?.scheduled_arrival ??
          last?.scheduled_departure,
      ),
    },

    duration: '',
    runsOn: [],
    classes: [],
    status: 'running',
    delayMinutes: 0,
    eta: '',
  }
}

/* -------------------------------------------------------------------------- */
/* Route mapping                                                              */
/* -------------------------------------------------------------------------- */

function mapRouteStop(
  stop: BackendRouteStop,
  index: number,
  total: number,
): StationStop {
  return {
    code: stop.station_code,
    name: stop.station_name,
    city: stationCity(stop.station_name),

    arrival: formatTime(
      stop.scheduled_arrival,
    ),

    departure: formatTime(
      stop.scheduled_departure,
    ),

    day: 1,

    status:
      index === total - 1
        ? 'destination'
        : index === 0
          ? 'current'
          : 'upcoming',

    distanceFromOrigin: Number(
      stop.distance_km ?? 0,
    ),
  }
}

function mapEtaStop(
  stop: BackendEtaRouteStop,
  index: number,
  total: number,
): StationStop {
  return {
    code: stop.station_code,
    name: stop.station_name,
    city: stationCity(stop.station_name),

    arrival: formatTime(
      stop.scheduled_arrival,
    ),

    departure: '',

    day: 1,

    status:
      stop.status === 'destination' ||
      index === total - 1
        ? 'destination'
        : stop.status === 'current'
          ? 'current'
          : 'upcoming',

    distanceFromOrigin: Number(
      stop.distance_km ?? 0,
    ),

    predictedArrival:
      formatDateTime(stop.predicted_arrival),

    actualArrival:
      formatDateTime(stop.actual_arrival),

    predictionErrorMinutes:
      stop.prediction_error_minutes ?? null,

    predictedDeparture: null,

    delayMinutes: Number(
      stop.predicted_delay_minutes ?? 0,
    ),
  }
}

/* -------------------------------------------------------------------------- */
/* Live status mapping                                                        */
/* -------------------------------------------------------------------------- */

function mapStatus(
  train: BackendTrain,
  live: BackendLive,
  route: BackendRouteStop[],
  etaRoute?: BackendEtaRouteResponse | null,
): LiveTrainStatus {
  const routeStops =
    etaRoute?.stations ??
    etaRoute?.route ??
    etaRoute?.remaining_stops ??
    []

  const stations =
    routeStops.length > 0
      ? routeStops.map((stop, index) =>
          mapEtaStop(
            stop,
            index,
            routeStops.length,
          ),
        )
      : route.map((stop, index) =>
          mapRouteStop(
            stop,
            index,
            route.length,
          ),
        )

  const delayMinutes = Number(
    live.delay_minutes ?? 0,
  )

  const rawEta =
    live.eta ??
    etaRoute?.stations?.at(-1)?.predicted_arrival ??
    ''

  const eta = formatDateTime(rawEta)

  const currentStation =
    stationLabel(live.current_station) ||
    live.current_station_code ||
    ''

  const nextStation =
    stationLabel(live.next_station) ||
    live.next_station_code ||
    ''

  /*
   * Use ONE consistent position source:
   *
   * RailRadar live position
   *        +
   * ETA route position
   *
   * The destination distance comes from the actual
   * scheduled route, while the current distance comes
   * from the live position.
   */
  const position =
    etaRoute?.position ??
    live.position ??
    null

  const destinationDistance =
    Number(
      route.at(-1)?.distance_km ??
        live.total_distance ??
        0,
    )

  const distanceFromOrigin =
    Number(
      position?.distance_from_origin_km ??
        0,
    )

  let progress = 0

  if (
    destinationDistance > 0 &&
    distanceFromOrigin >= 0
  ) {
    progress =
      distanceFromOrigin /
      destinationDistance
  } else if (
    live.progress != null
  ) {
    progress =
      Number(live.progress)
  }

  progress = clampProgress(progress)

  /*
   * Remaining distance MUST be calculated from
   * the same two values used for progress.
   */
  let distanceRemaining =
    destinationDistance > 0
      ? Math.max(
          0,
          destinationDistance -
            distanceFromOrigin,
        )
      : Number(
          live.distance_remaining ?? 0,
        )

  /*
   * If the backend has a more direct remaining-distance
   * value and the route position is unavailable, use it.
   */
  if (
    destinationDistance <= 0 &&
    live.distance_remaining != null
  ) {
    distanceRemaining =
      Number(
        live.distance_remaining,
      )
  }

  return {
    trainNumber:
      train.train_number,

    status:
      live.status === 'cancelled'
        ? 'cancelled'
        : delayMinutes > 0
          ? 'late'
          : 'running',

    delayMinutes,

    eta,

    originalArrival:
      formatTime(
        live.original_arrival ??
          route.at(-1)?.scheduled_arrival ??
          '',
      ),

    currentStation,

    nextStation,

    distanceRemaining:
      Math.round(
        distanceRemaining * 10,
      ) / 10,

    totalDistance:
      destinationDistance,

    speedKmh:
      Number(
        live.speed_kmph ?? 0,
      ),

    platform:
      String(
        live.platform ?? '',
      ),

    lastUpdatedSeconds:
      Number(
        live.last_updated_seconds ?? 0,
      ),

    progress,

    stations,

    // Actual RailRadar GPS position for MapLibre.
    livePosition:
      position?.latitude != null && position?.longitude != null
        ? [Number(position.longitude), Number(position.latitude)] as [number, number]
        : undefined,

    positionSource:
      position?.latitude != null && position?.longitude != null
        ? 'railradar'
        : 'estimated',
  }
}

/* -------------------------------------------------------------------------- */
/* Train details                                                              */
/* -------------------------------------------------------------------------- */

export async function getTrainDetails(
  trainNumber: string,
): Promise<Train | null> {
  try {
    const data =
      await api<BackendTrain>(
        `/trains/${encodeURIComponent(
          trainNumber,
        )}`,
      )

    if (!data) {
      return null
    }

    let route: BackendRouteStop[] = []

    try {
      const routeResponse =
        await api<BackendRouteResponse>(
          `/trains/${encodeURIComponent(
            trainNumber,
          )}/route`,
        )

      route =
        routeResponse?.route ?? []
    } catch {
      // Details still remain usable.
    }

    return mapTrain(
      data,
      route,
    )
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

export async function getTrainRoute(
  trainNumber: string,
): Promise<StationStop[]> {
  const response =
    await api<BackendRouteResponse>(
      `/trains/${encodeURIComponent(
        trainNumber,
      )}/route`,
    )

  const route =
    response?.route ?? []

  return route.map(
    (stop, index) =>
      mapRouteStop(
        stop,
        index,
        route.length,
      ),
  )
}

/* -------------------------------------------------------------------------- */
/* Live status                                                                */
/* -------------------------------------------------------------------------- */

export async function getTrainStatus(
  trainNumber: string,
): Promise<LiveTrainStatus | null> {
  try {
    const [
      train,
      live,
      route,
      etaRoute,
    ] = await Promise.all([
      api<BackendTrain>(
        `/trains/${encodeURIComponent(
          trainNumber,
        )}`,
      ),

      api<BackendLive>(
        `/trains/${encodeURIComponent(
          trainNumber,
        )}/live`,
      ),

      api<BackendRouteResponse>(
        `/trains/${encodeURIComponent(
          trainNumber,
        )}/route`,
      ),

      api<BackendEtaRouteResponse>(
        `/trains/${encodeURIComponent(
          trainNumber,
        )}/eta/route`,
      ).catch(() => null),
    ])

    if (!train || !live) {
      return null
    }

    return mapStatus(
      train,
      live,
      route?.route ?? [],
      etaRoute,
    )
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/* Tracking snapshot                                                          */
/* -------------------------------------------------------------------------- */

export interface TrackingSnapshot {
  train: Train | null
  status: LiveTrainStatus | null
  fetchedAt: string
}

export async function getTrackingSnapshot(
  trainNumber: string,
): Promise<TrackingSnapshot> {
  const [
    train,
    status,
  ] = await Promise.all([
    getTrainDetails(trainNumber),
    getTrainStatus(trainNumber),
  ])

  return {
    train,
    status,
    fetchedAt:
      new Date().toISOString(),
  }
}

/* -------------------------------------------------------------------------- */
/* Delay analysis                                                             */
/* -------------------------------------------------------------------------- */

export async function getDelayAnalysis(
  trainNumber: string,
): Promise<DelayAnalysis | null> {
  try {
    const [
      dynamic,
      etaRoute,
    ] = await Promise.all([
      api<BackendEtaDynamic>(
        `/trains/${encodeURIComponent(
          trainNumber,
        )}/eta/dynamic`,
      ),

      api<BackendEtaRouteResponse>(
        `/trains/${encodeURIComponent(
          trainNumber,
        )}/eta/route`,
      ),
    ])

    if (!dynamic && !etaRoute) {
      return null
    }

    const currentDelay =
      Number(
        dynamic?.current_delay_minutes ??
          etaRoute?.current_delay_minutes ??
          0,
      )

    const predictedDelay =
      Number(
        dynamic?.predicted_delay_minutes ??
          etaRoute
            ?.final_predicted_destination_delay_minutes ??
          etaRoute
            ?.predicted_destination_delay_minutes ??
          currentDelay,
      )

    const scheduledArrival =
      formatTime(
        dynamic?.scheduled_arrival ??
          etaRoute?.stations?.at(-1)
            ?.scheduled_arrival ??
          '',
      )

    const predictedArrival =
      formatDateTime(
        dynamic?.predicted_arrival ??
          etaRoute?.stations?.at(-1)
            ?.predicted_arrival ??
          '',
      )

    const speedAdjustment =
      Number(
        etaRoute
          ?.speed_adjustment_minutes ??
          0,
      )

    const operationalAdjustment =
      Number(
        etaRoute
          ?.operational_adjustment_minutes ??
          0,
      )

    const eventAdjustment =
      Number(
        etaRoute
          ?.event_adjustment_minutes ??
          0,
      )

    const precedingTrainImpact =
      Number(
        etaRoute?.preceding_train
          ?.estimated_effect_minutes ??
          0,
      )

    return {
      trainNumber,

      currentDelayMinutes:
        currentDelay,

      predictedDelayMinutes:
        predictedDelay,

      scheduledArrival,

      predictedArrival,

      factors: [
        {
          id: 'current-delay',
          type: 'current',
          label: 'Current Delay',
          description:
            'Delay currently reported by live train tracking.',
          impactMinutes:
            currentDelay,
          available: true,
        },

        {
          id: 'speed',
          type: 'speed',
          label: 'Live Speed Adjustment',
          description:
            'Adjustment calculated from live and scheduled section speed.',
          impactMinutes:
            speedAdjustment,
          available:
            etaRoute !== null,
        },

        {
          id: 'network',
          type: 'network',
          label: 'Network / Congestion',
          description:
            'Operational congestion proxy used by the backend.',
          impactMinutes:
            precedingTrainImpact,
          available:
            etaRoute !== null,
        },

        {
          id: 'event',
          type: 'event',
          label: 'Operational Events',
          description:
            'Active operational-event adjustment from the backend.',
          impactMinutes:
            eventAdjustment,
          available:
            etaRoute !== null,
        },

        {
          id: 'ml',
          type: 'ml',
          label: 'ML ETA Prediction',
          description:
            dynamic?.basis ??
            'Backend ML ETA prediction.',
          impactMinutes:
            Number(
              dynamic
                ?.predicted_propagation_minutes ??
                0,
            ),
          available:
            Boolean(dynamic),
        },

        {
          id: 'operational',
          type: 'network',
          label: 'Operational Adjustment',
          description:
            'Combined operational adjustment applied to the ETA.',
          impactMinutes:
            operationalAdjustment,
          available:
            etaRoute !== null,
        },
      ],

      predictionBasis: [
        dynamic?.basis ??
          'Backend ETA prediction',

        dynamic?.model
          ? `Model: ${dynamic.model}`
          : 'Dynamic backend ETA model',

        ...(dynamic?.notes ?? []),
      ],

      generatedAt:
        new Date().toISOString(),

      lastUpdatedSeconds: 0,
    }
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/* Operational events                                                         */
/* -------------------------------------------------------------------------- */

export async function getOperationalEvents(
  trainNumber: string,
): Promise<OperationalEvent[]> {
  try {
    const response =
      await api<{
        train_number: string
        events: Array<{
          id?: string
          type?: string
          severity?: string
          title?: string
          message?: string
          description?: string
          station?: string
          station_code?: string
          section?: string
          occurred_at?: string
          active?: boolean
        }>
      }>(
        `/trains/${encodeURIComponent(
          trainNumber,
        )}/events`,
      )

    return (
      response?.events ?? []
    ).map(
      (event, index) => ({
        id:
          event.id ??
          `event-${trainNumber}-${index}`,

        trainNumber,

        type:
          (event.type ??
            'operational') as OperationalEvent['type'],

        severity:
          (event.severity ??
            'info') as OperationalEvent['severity'],

        title:
          event.title ??
          event.type ??
          'Operational Event',

        message:
          event.message ??
          event.description ??
          'Operational event reported by the backend.',

        station:
          event.station,

        stationCode:
          event.station_code,

        section:
          event.section,

        occurredAt:
          event.occurred_at ??
          new Date().toISOString(),

        active:
          event.active ?? true,
      }),
    )
  } catch {
    return []
  }
}

/* -------------------------------------------------------------------------- */
/* Network status                                                             */
/* -------------------------------------------------------------------------- */

export async function getNetworkStatus(
  trainNumber: string,
): Promise<NetworkStatus | null> {
  try {
    const response =
      await api<{
        train_number: string
        network_status?: string
        delay_minutes?: number
        speed_kmph?: number | null
        current_station?: string | null
        next_station?: string | null
        last_updated_at?: string | null
        tracking_mode?: string | null
        status?: string | null
      }>(
        `/trains/${encodeURIComponent(
          trainNumber,
        )}/network-status`,
      )

    if (!response) {
      return null
    }

    const level =
      response.network_status ??
      'normal'

    return {
      trainNumber,

      currentSection:
        `${response.current_station ?? ''} → ${response.next_station ?? ''}`,

      currentStation:
        response.current_station ??
        undefined,

      congestionLevel:
        level === 'high'
          ? 'high'
          : level === 'medium' ||
              level === 'low'
            ? 'moderate'
            : 'normal',

      affectedTrainCount: 0,

      networkDelayMinutes:
        Number(
          response.delay_minutes ??
            0,
        ),

      precedingTrainImpactMinutes: 0,

      sectionDelayMinutes:
        Number(
          response.delay_minutes ??
            0,
        ),

      averageSectionSpeedKmph:
        response.speed_kmph != null
          ? Number(
              response.speed_kmph,
            )
          : undefined,

      statusMessage:
        response.tracking_mode
          ? `Tracking mode: ${response.tracking_mode}`
          : response.status ??
            undefined,

      generatedAt:
        response.last_updated_at ??
        new Date().toISOString(),

      lastUpdatedSeconds: 0,
    }
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/* Train search                                                               */
/* -------------------------------------------------------------------------- */

export async function searchTrains(
  params: SearchParams,
): Promise<Train[]> {
  const query =
    normalize(params.query)

  if (
    !query ||
    !/^\d+$/.test(query)
  ) {
    return []
  }

  const train =
    await getTrainDetails(query)

  if (!train) {
    return []
  }

  const from =
    normalize(params.from)

  const to =
    normalize(params.to)

  const fromMatches =
    !from ||
    normalize(train.from.city)
      .includes(from) ||
    normalize(train.from.station)
      .includes(from) ||
    normalize(train.from.code)
      .includes(from)

  const toMatches =
    !to ||
    normalize(train.to.city)
      .includes(to) ||
    normalize(train.to.station)
      .includes(to) ||
    normalize(train.to.code)
      .includes(to)

  return fromMatches &&
    toMatches
    ? [train]
    : []
}

/* -------------------------------------------------------------------------- */
/* Notifications                                                              */
/* -------------------------------------------------------------------------- */

export async function getNotifications(): Promise<
  AppNotification[]
> {
  return []
}

/* -------------------------------------------------------------------------- */
/* Local saved trains / recent searches                                      */
/* -------------------------------------------------------------------------- */

const SAVED_KEY =
  'train-eta:saved-trains'

const RECENT_KEY =
  'train-eta:recent-searches'

function readStore<T>(
  key: string,
  fallback: T,
): T {
  if (
    typeof window ===
    'undefined'
  ) {
    return fallback
  }

  try {
    const raw =
      window.localStorage.getItem(
        key,
      )

    return raw
      ? (JSON.parse(raw) as T)
      : fallback
  } catch {
    return fallback
  }
}

function writeStore<T>(
  key: string,
  value: T,
) {
  if (
    typeof window ===
    'undefined'
  ) {
    return
  }

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(value),
    )
  } catch {
    // Ignore storage errors.
  }
}

export async function getSavedTrains(): Promise<
  SavedTrain[]
> {
  return readStore<
    SavedTrain[]
  >(
    SAVED_KEY,
    [],
  )
}

export async function saveTrain(
  train: Train,
): Promise<SavedTrain[]> {
  const current =
    readStore<SavedTrain[]>(
      SAVED_KEY,
      [],
    )

  if (
    !current.some(
      (s) =>
        s.train.number ===
        train.number,
    )
  ) {
    current.unshift({
      train,
      savedAt:
        new Date().toISOString(),
      notificationsEnabled:
        true,
    })

    writeStore(
      SAVED_KEY,
      current,
    )
  }

  return current
}

export async function removeSavedTrain(
  trainNumber: string,
): Promise<SavedTrain[]> {
  const current =
    readStore<SavedTrain[]>(
      SAVED_KEY,
      [],
    ).filter(
      (s) =>
        s.train.number !==
        trainNumber,
    )

  writeStore(
    SAVED_KEY,
    current,
  )

  return current
}

export async function toggleSavedNotifications(
  trainNumber: string,
): Promise<SavedTrain[]> {
  const current =
    readStore<SavedTrain[]>(
      SAVED_KEY,
      [],
    ).map((s) =>
      s.train.number ===
      trainNumber
        ? {
            ...s,
            notificationsEnabled:
              !s.notificationsEnabled,
          }
        : s,
    )

  writeStore(
    SAVED_KEY,
    current,
  )

  return current
}

export function isTrainSaved(
  trainNumber: string,
): boolean {
  return readStore<
    SavedTrain[]
  >(
    SAVED_KEY,
    [],
  ).some(
    (s) =>
      s.train.number ===
      trainNumber,
  )
}

export async function getRecentSearches(): Promise<
  RecentSearch[]
> {
  return readStore<
    RecentSearch[]
  >(
    RECENT_KEY,
    [],
  )
}

export function addRecentSearch(
  entry: Omit<
    RecentSearch,
    'id' | 'at'
  >,
) {
  const current =
    readStore<RecentSearch[]>(
      RECENT_KEY,
      [],
    )

  const next: RecentSearch = {
    ...entry,
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
  }

  const deduped = [
    next,
    ...current.filter(
      (r) =>
        r.query !==
        next.query,
    ),
  ].slice(0, 6)

  writeStore(
    RECENT_KEY,
    deduped,
  )
}