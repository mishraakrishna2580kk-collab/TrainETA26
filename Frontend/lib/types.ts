export type TrainRunStatus =
  | 'on-time'
  | 'running'
  | 'late'
  | 'cancelled'

export type StationStatus =
  | 'departed'
  | 'passed'
  | 'current'
  | 'upcoming'
  | 'destination'

export interface GeoPosition {
  latitude: number
  longitude: number
}

export interface StationStop {
  code: string
  name: string
  city: string

  /** Real geographic coordinates when supplied by the backend/live source. */
  coordinates?: [number, number]

  /** Scheduled arrival, e.g. "09:12 PM". Empty for origin. */
  arrival: string

  /** Scheduled departure, e.g. "09:17 PM". Empty for destination. */
  departure: string

  /** Day of journey (1-based). */
  day: number

  status: StationStatus

  /** Platform number if known. */
  platform?: string

  /** Kilometres from origin. */
  distanceFromOrigin: number

  /** Delay in minutes at this stop (0 = on time). */
  delayMinutes?: number

  /** Dynamic predicted arrival time (e.g. "08:47 AM") */
  predictedArrival?: string | null

  /** Actual arrival for the same journey, when observed/received from the backend. */
  actualArrival?: string | null

  /** Absolute prediction error in minutes, when actual arrival is available. */
  predictionErrorMinutes?: number | null

  /** Dynamic predicted departure time (e.g. "04:32 AM") */
  predictedDeparture?: string | null
}

/** Alias for ETA route prediction stops */
export type EtaRouteStop = StationStop

export interface TrainEndpoint {
  code: string
  station: string
  city: string
  time: string
}

export interface Train {
  number: string
  name: string
  type: string
  from: TrainEndpoint
  to: TrainEndpoint

  /** Total scheduled duration, e.g. "15h 47m". */
  duration: string

  runsOn: string[]
  classes: string[]
  status: TrainRunStatus

  /** Positive = late, 0 = on time. */
  delayMinutes: number

  /** Predicted arrival at destination, e.g. "06:42 PM". */
  eta: string
}

export type DelayFactorType =
  | 'current'
  | 'historical'
  | 'network'
  | 'speed'
  | 'weather'
  | 'preceding-train'
  | 'event'
  | 'ml'

export interface DelayFactor {
  id: string
  type: DelayFactorType
  label: string
  description?: string

  /** Signed impact in minutes (e.g. +4, -3, 0) */
  impactMinutes: number

  available: boolean
}

export interface DelayAnalysis {
  trainNumber: string
  currentDelayMinutes: number
  predictedDelayMinutes: number
  scheduledArrival: string
  predictedArrival: string
  factors: DelayFactor[]
  predictionBasis?: string[]
  generatedAt?: string
  lastUpdatedSeconds?: number
}

export type OperationalEventType =
  | 'delay'
  | 'congestion'
  | 'speed-restriction'
  | 'weather'
  | 'track-issue'
  | 'operational'
  | 'unscheduled'

export type OperationalEventSeverity =
  | 'info'
  | 'warning'
  | 'critical'

export interface OperationalEvent {
  id: string
  trainNumber: string
  type: OperationalEventType
  severity: OperationalEventSeverity
  title: string
  message: string
  station?: string
  stationCode?: string
  section?: string
  occurredAt: string
  resolvedAt?: string
  active: boolean
}

export interface LiveTrainStatus {
  trainNumber: string
  status: TrainRunStatus
  delayMinutes: number
  eta: string
  originalArrival: string
  currentStation: string
  nextStation: string

  distanceRemaining: number
  totalDistance: number

  speedKmh: number
  platform: string
  lastUpdatedSeconds: number

  /** Journey completion between 0 and 1. */
  progress: number

  stations: StationStop[]

  /**
   * Actual live geographic position supplied by the backend/RailRadar.
   * Format: [longitude, latitude] for MapLibre/GeoJSON.
   */
  livePosition?: [number, number]

  /** Source of the live position. */
  positionSource?: 'railradar' | 'station' | 'estimated'

  /** Predictive breakdown of factors influencing ETA */
  delayAnalysis?: DelayAnalysis

  /** Live or simulated operational alerts & corridor events */
  operationalEvents?: OperationalEvent[]

  /** Live or simulated corridor network & congestion status */
  networkStatus?: NetworkStatus
}

export type CongestionLevel =
  | 'normal'
  | 'moderate'
  | 'high'

export interface NetworkStatus {
  trainNumber: string
  currentSection: string
  currentStation?: string
  currentStationCode?: string
  congestionLevel: CongestionLevel
  affectedTrainCount: number
  networkDelayMinutes: number
  precedingTrainImpactMinutes: number
  sectionDelayMinutes?: number
  averageSectionSpeedKmph?: number
  statusMessage?: string
  generatedAt?: string
  lastUpdatedSeconds?: number
}

export type NotificationType =
  | 'delay'
  | 'platform'
  | 'arrival'
  | 'departure'
  | 'info'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  trainNumber?: string
  time: string
  read: boolean
}

export interface SavedTrain {
  train: Train
  savedAt: string
  notificationsEnabled: boolean
}

export interface RecentSearch {
  id: string
  query: string
  from?: string
  to?: string
  at: string
}