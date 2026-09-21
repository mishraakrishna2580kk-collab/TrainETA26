import type {
  LiveTrainStatus,
  StationStop,
  Train,
} from '@/lib/types'

/**
 * Known Indian Railway station coordinates.
 * Format: [longitude, latitude]
 */
export const STATION_COORDINATES: Record<
  string,
  [number, number]
> = {
  NDLS: [77.2188, 28.6143],
  DEC: [77.135, 28.591],
  GGN: [77.014, 28.468],
  RE: [76.621, 28.192],
  AWR: [76.608, 27.553],
  DO: [76.34, 26.892],
  GADJ: [75.803, 26.883],
  JP: [75.7878, 26.9196],
  MTJ: [77.6737, 27.4924],
  KOTA: [75.8648, 25.2138],
  RTM: [75.0374, 23.3342],
  BRC: [73.1812, 22.3107],
  ANND: [72.9519, 22.5546],
  ADI: [72.6012, 23.027],
  ST: [72.8411, 21.2049],
  BL: [72.9342, 20.6105],
  VAPI: [72.9106, 20.3713],
  BVI: [72.8574, 19.229],
  BDTS: [72.8427, 19.0607],
  MMCT: [72.8193, 18.9696],

  SBC: [77.5694, 12.9784],
  BNC: [77.599, 12.993],
  KJM: [77.688, 13.001],
  BWT: [78.181, 12.993],
  JTJ: [78.583, 12.583],
  KPD: [79.136, 12.9702],
  AJJ: [79.6687, 13.0784],
  PER: [80.228, 13.107],
  MAS: [80.2755, 13.0827],
}

export interface MapStationStop
  extends StationStop {
  coordinates: [number, number]
  isOrigin: boolean
  isDestination: boolean
}

export interface RailwayMapData {
  trainNumber: string
  trainName: string
  speedKmh: number
  stations: MapStationStop[]

  /** Actual live train position when available. */
  currentTrainPosition: [number, number]

  currentStationName: string
  nextStationName: string

  completedRoute: [number, number][]
  remainingRoute: [number, number][]
  fullRoute: [number, number][]

  bounds: [
    [number, number],
    [number, number],
  ]

  routeCenter: [number, number]
}

function interpolate(
  coordA: [number, number],
  coordB: [number, number],
  t: number,
): [number, number] {
  const clamped = Math.max(
    0,
    Math.min(1, t),
  )

  return [
    coordA[0] +
      (coordB[0] - coordA[0]) *
        clamped,

    coordA[1] +
      (coordB[1] - coordA[1]) *
        clamped,
  ]
}

function getFallbackCoordinate(
  train: Train,
  stop: StationStop,
  index: number,
  totalStops: number,
): [number, number] {
  if (stop.coordinates) {
    return stop.coordinates
  }

  const dictionaryCoordinate =
    STATION_COORDINATES[stop.code]

  if (dictionaryCoordinate) {
    return dictionaryCoordinate
  }

  const origin =
    STATION_COORDINATES[
      train.from.code
    ] || [77.2188, 28.6143]

  const destination =
    STATION_COORDINATES[
      train.to.code
    ] || [76.7794, 30.7333]

  const progress =
    totalStops > 1
      ? index / (totalStops - 1)
      : 0

  return interpolate(
    origin,
    destination,
    progress,
  )
}

export function getRailwayMapData(
  train: Train,
  status: LiveTrainStatus,
): RailwayMapData {
  const totalStops =
    status.stations.length

  const mappedStations: MapStationStop[] =
    status.stations.map(
      (stop, index) => ({
        ...stop,

        coordinates:
          getFallbackCoordinate(
            train,
            stop,
            index,
            totalStops,
          ),

        isOrigin: index === 0,

        isDestination:
          index === totalStops - 1,
      }),
    )

  const fullRoute: [
    number,
    number,
  ][] = mappedStations.map(
    (station) =>
      station.coordinates,
  )

  /*
   * Determine the logical current station.
   */
  let currentIndex =
    mappedStations.findIndex(
      (station) =>
        station.status === 'current',
    )

  if (currentIndex === -1) {
    const lastPassedIndex =
      mappedStations.findLastIndex(
        (station) =>
          station.status ===
            'passed' ||
          station.status ===
            'departed',
      )

    currentIndex =
      lastPassedIndex >= 0
        ? lastPassedIndex
        : 0
  }

  const currentStation =
    mappedStations[currentIndex]

  const nextStation =
    mappedStations[currentIndex + 1]

  /*
   * IMPORTANT:
   *
   * Prefer the actual RailRadar GPS
   * position supplied by the backend.
   *
   * Only estimate between stations if
   * live GPS is unavailable.
   */
  let currentTrainPosition:
    [number, number]

  if (status.livePosition) {
    currentTrainPosition =
      status.livePosition
  } else if (
    currentStation &&
    nextStation
  ) {
    currentTrainPosition =
      interpolate(
        currentStation.coordinates,
        nextStation.coordinates,
        0.35,
      )
  } else if (currentStation) {
    currentTrainPosition =
      currentStation.coordinates
  } else {
    currentTrainPosition =
      fullRoute[0] || [
        77.2188,
        28.6143,
      ]
  }

  /*
   * Completed route.
   */
  const completedRoute: [
    number,
    number,
  ][] = []

  for (
    let index = 0;
    index <= currentIndex;
    index++
  ) {
    completedRoute.push(
      mappedStations[index]
        .coordinates,
    )
  }

  /*
   * Connect the last known station
   * to the actual live GPS position.
   */
  if (
    completedRoute.length === 0 ||
    completedRoute[
      completedRoute.length - 1
    ][0] !==
      currentTrainPosition[0] ||
    completedRoute[
      completedRoute.length - 1
    ][1] !==
      currentTrainPosition[1]
  ) {
    completedRoute.push(
      currentTrainPosition,
    )
  }

  /*
   * Remaining route starts exactly
   * from the live train position.
   */
  const remainingRoute: [
    number,
    number,
  ][] = [currentTrainPosition]

  for (
    let index = currentIndex + 1;
    index < mappedStations.length;
    index++
  ) {
    remainingRoute.push(
      mappedStations[index]
        .coordinates,
    )
  }

  /*
   * Calculate bounds.
   */
  const allCoords = [
    ...fullRoute,
    currentTrainPosition,
  ]

  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  allCoords.forEach(
    ([lng, lat]) => {
      minLng = Math.min(
        minLng,
        lng,
      )

      maxLng = Math.max(
        maxLng,
        lng,
      )

      minLat = Math.min(
        minLat,
        lat,
      )

      maxLat = Math.max(
        maxLat,
        lat,
      )
    },
  )

  const bounds: [
    [number, number],
    [number, number],
  ] = [
    [minLng, minLat],
    [maxLng, maxLat],
  ]

  const routeCenter: [
    number,
    number,
  ] = [
    (minLng + maxLng) / 2,
    (minLat + maxLat) / 2,
  ]

  return {
    trainNumber: train.number,
    trainName: train.name,
    speedKmh: status.speedKmh,

    stations:
      mappedStations,

    currentTrainPosition,

    currentStationName:
      status.currentStation,

    nextStationName:
      status.nextStation,

    completedRoute,
    remainingRoute,
    fullRoute,

    bounds,
    routeCenter,
  }
}
