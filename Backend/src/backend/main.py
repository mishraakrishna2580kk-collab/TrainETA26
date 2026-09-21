from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware 

from fastapi import FastAPI, HTTPException, Query

from src.backend.eta.ml_predictor import DynamicMLPredictor

from src.backend.eta.operational_events import (
    calculate_event_adjustment,
)

from src.backend.eta.operational_factors import (
    calculate_operational_adjustment,
)

from src.backend.eta.route_eta import (
    build_route_eta,
    find_remaining_stops,
    calculate_scheduled_segment_speed,
    calculate_speed_adjustment,
)

from src.backend.live.railradar import (
    RailRadarClient,
    RailRadarError,
)

from src.backend.database import get_connection

from src.backend.eta.predictor import (
    ETAPrediction,
    RouteNotFoundError,
    StationNotOnRouteError,
    predict_eta,
)

from src.backend.eta.repository import (
    get_destination_historical_delays,
    get_train_info,
    get_train_route as get_eta_train_route,
)


app = FastAPI(
    title="Indian Railway Dynamic ETA API",
    description="Backend API for dynamic train ETA prediction",
    version="0.2.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# HEALTH
# =========================================================

@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Indian Railway Dynamic ETA API is running"
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "railway-eta-backend",
        "version": "0.2.0",
    }


# =========================================================
# STATIONS
# =========================================================

@app.get("/stations/{station_code}", tags=["Stations"])
def get_station(station_code: str):

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT station_code, station_name, railway_zone
                FROM stations
                WHERE station_code = %s
                """,
                (station_code.upper(),),
            )

            station = cur.fetchone()

    if station is None:
        raise HTTPException(
            status_code=404,
            detail=f"Station '{station_code.upper()}' not found",
        )

    return {
        "station_code": station[0],
        "station_name": station[1],
        "railway_zone": station[2],
    }


# =========================================================
# TRAIN INFORMATION
# =========================================================

@app.get("/trains/{train_number}", tags=["Trains"])
def get_train(train_number: str):

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    train_number,
                    train_name,
                    source_station_code,
                    destination_station_code
                FROM trains
                WHERE train_number = %s
                """,
                (train_number,),
            )

            train = cur.fetchone()

    if train is None:
        raise HTTPException(
            status_code=404,
            detail=f"Train '{train_number}' not found",
        )

    return {
        "train_number": train[0],
        "train_name": train[1],
        "source_station_code": train[2],
        "destination_station_code": train[3],
    }


# =========================================================
# TRAIN ROUTE
# =========================================================

@app.get("/trains/{train_number}/route", tags=["Trains"])
def get_train_route(train_number: str):

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    stop_sequence,
                    station_code,
                    station_name,
                    distance_km,
                    scheduled_arrival,
                    scheduled_departure
                FROM train_routes
                WHERE train_number = %s
                ORDER BY stop_sequence
                """,
                (train_number,),
            )

            rows = cur.fetchall()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"Route for train '{train_number}' not found",
        )

    return {
        "train_number": train_number,
        "stop_count": len(rows),
        "route": [
            {
                "stop_sequence": row[0],
                "station_code": row[1],
                "station_name": row[2],
                "distance_km": (
                    float(row[3])
                    if row[3] is not None
                    else None
                ),
                "scheduled_arrival": (
                    row[4].isoformat()
                    if row[4]
                    else None
                ),
                "scheduled_departure": (
                    row[5].isoformat()
                    if row[5]
                    else None
                ),
            }
            for row in rows
        ],
    }


# =========================================================
# TRAIN HISTORICAL DELAYS
# =========================================================

@app.get(
    "/trains/{train_number}/delays",
    tags=["Historical Delays"],
)
def get_train_delays(
    train_number: str,
    limit: int = Query(
        default=50,
        ge=1,
        le=500,
    ),
):

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    train_number,
                    service_date,
                    station_code,
                    scheduled_arrival,
                    actual_arrival,
                    arrival_delay_minutes,
                    scheduled_departure,
                    actual_departure,
                    departure_delay_minutes
                FROM historical_delays
                WHERE train_number = %s
                ORDER BY service_date DESC
                LIMIT %s
                """,
                (train_number, limit),
            )

            rows = cur.fetchall()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No historical delay records found "
                f"for train '{train_number}'"
            ),
        )

    return {
        "train_number": train_number,
        "record_count": len(rows),
        "delays": [
            {
                "service_date": (
                    row[1].isoformat()
                    if row[1]
                    else None
                ),
                "station_code": row[2],
                "scheduled_arrival": (
                    row[3].isoformat()
                    if row[3]
                    else None
                ),
                "actual_arrival": (
                    row[4].isoformat()
                    if row[4]
                    else None
                ),
                "arrival_delay_minutes": row[5],
                "scheduled_departure": (
                    row[6].isoformat()
                    if row[6]
                    else None
                ),
                "actual_departure": (
                    row[7].isoformat()
                    if row[7]
                    else None
                ),
                "departure_delay_minutes": row[8],
            }
            for row in rows
        ],
    }


# =========================================================
# STATION HISTORICAL DELAYS
# =========================================================

@app.get(
    "/stations/{station_code}/delays",
    tags=["Historical Delays"],
)
def get_station_delays(
    station_code: str,
    limit: int = Query(
        default=50,
        ge=1,
        le=500,
    ),
):

    station_code = station_code.strip().upper()

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    train_number,
                    service_date,
                    station_code,
                    scheduled_arrival,
                    actual_arrival,
                    arrival_delay_minutes,
                    scheduled_departure,
                    actual_departure,
                    departure_delay_minutes
                FROM historical_delays
                WHERE station_code = %s
                ORDER BY service_date DESC
                LIMIT %s
                """,
                (station_code, limit),
            )

            rows = cur.fetchall()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No historical delay records found "
                f"for station '{station_code}'"
            ),
        )

    return {
        "station_code": station_code,
        "record_count": len(rows),
        "delays": [
            {
                "train_number": row[0],
                "service_date": (
                    row[1].isoformat()
                    if row[1]
                    else None
                ),
                "station_code": row[2],
                "scheduled_arrival": (
                    row[3].isoformat()
                    if row[3]
                    else None
                ),
                "actual_arrival": (
                    row[4].isoformat()
                    if row[4]
                    else None
                ),
                "arrival_delay_minutes": row[5],
                "scheduled_departure": (
                    row[6].isoformat()
                    if row[6]
                    else None
                ),
                "actual_departure": (
                    row[7].isoformat()
                    if row[7]
                    else None
                ),
                "departure_delay_minutes": row[8],
            }
            for row in rows
        ],
    }


# =========================================================
# BASELINE ETA
# =========================================================

@app.get(
    "/trains/{train_number}/eta",
    response_model=ETAPrediction,
    tags=["ETA"],
)
def get_train_eta(
    train_number: str,
    current_station: str = Query(
        ...,
        min_length=1,
        description=(
            "Station code where the train currently is"
        ),
    ),
    current_delay_minutes: float = Query(
        ...,
        ge=0,
        description="Current train delay in minutes",
    ),
) -> ETAPrediction:

    train_info = get_train_info(train_number)

    if train_info is None:
        raise HTTPException(
            status_code=404,
            detail=f"Train '{train_number}' not found.",
        )

    train_name, expected_destination_code = train_info

    route_stops = get_eta_train_route(train_number)

    if not route_stops:
        raise HTTPException(
            status_code=404,
            detail=f"Train '{train_number}' has no route data.",
        )

    destination_stop = route_stops[-1]

    historical_delays = get_destination_historical_delays(
        train_number,
        destination_stop.station_code,
    )

    try:

        prediction = predict_eta(
            train_number=train_number,
            current_station=current_station,
            current_delay_minutes=current_delay_minutes,
            route_stops=route_stops,
            historical_destination_delays=historical_delays,
            train_name=train_name,
            expected_destination_code=expected_destination_code,
        )

    except RouteNotFoundError as exc:

        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except StationNotOnRouteError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return prediction


# =========================================================
# ML ETA
# =========================================================

@app.get(
    "/trains/{train_number}/eta/ml",
    tags=["ETA"],
)
def get_train_eta_ml(
    train_number: str,
    current_station: str = Query(
        ...,
        min_length=1,
        description="Current station code",
    ),
    current_delay_minutes: float = Query(
        ...,
        ge=0,
        description="Current train delay",
    ),
):

    train_info = get_train_info(train_number)

    if train_info is None:
        raise HTTPException(
            status_code=404,
            detail=f"Train '{train_number}' not found.",
        )

    train_name, _ = train_info

    route_stops = get_eta_train_route(train_number)

    if not route_stops:
        raise HTTPException(
            status_code=404,
            detail=f"Train '{train_number}' has no route data.",
        )

    destination_stop = route_stops[-1]

    historical_delays = get_destination_historical_delays(
        train_number,
        destination_stop.station_code,
    )

    try:

        predictor = DynamicMLPredictor()

        prediction = predictor.predict(
            train_number=train_number,
            current_station=current_station,
            current_delay_minutes=current_delay_minutes,
            route_stops=route_stops,
            train_name=train_name,
            historical_destination_delays=historical_delays,
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except FileNotFoundError as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

    return prediction


# =========================================================
# REAL-TIME TRAIN STATUS
# =========================================================

@app.get("/trains/{train_number}/live")
def get_live_train_status(train_number: str):

    try:

        client = RailRadarClient()

        return client.get_normalized_live_train(
            train_number
        )

    except RailRadarError as exc:

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        )


# =========================================================
# REAL-TIME DYNAMIC ETA
# =========================================================

@app.get(
    "/trains/{train_number}/eta/dynamic"
)
def get_dynamic_train_eta(train_number: str):

    try:

        # ---------------------------------------------------------
        # 1. Get real-time train state
        # ---------------------------------------------------------

        live_client = RailRadarClient()

        live = live_client.get_normalized_live_train(
            train_number
        )

        live_station = (
            live["current_station"]["code"]
        )

        live_delay = float(
            live["delay_minutes"] or 0
        )

        live_next_station = (
            live["next_station"]["code"]
        )

        # ---------------------------------------------------------
        # 2. Get scheduled route
        # ---------------------------------------------------------

        route = get_eta_train_route(
            train_number
        )

        if not route:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Route not found for train "
                    f"{train_number}"
                ),
            )

        # ---------------------------------------------------------
        # 3. Align live position with scheduled route
        # ---------------------------------------------------------

        route_codes = [
            stop.station_code
            for stop in route
        ]

        if live_station in route_codes:

            prediction_station = live_station
            position_mode = "scheduled_stop"

        else:

            prediction_station = None
            position_mode = (
                "between_scheduled_stops"
            )

            next_index = None

            for i, stop in enumerate(route):

                if (
                    stop.station_code
                    == live_next_station
                ):
                    next_index = i
                    break

            if (
                next_index is not None
                and next_index > 0
            ):

                prediction_station = (
                    route[next_index - 1]
                    .station_code
                )

            else:

                live_distance = (
                    live["position"].get(
                        "distance_from_origin_km"
                    )
                )

                if live_distance is not None:

                    previous_stops = [
                        stop
                        for stop in route
                        if (
                            stop.distance_km
                            <= live_distance
                        )
                    ]

                    if previous_stops:

                        prediction_station = (
                            previous_stops[-1]
                            .station_code
                        )

        if prediction_station is None:

            raise HTTPException(
                status_code=422,
                detail=(
                    "Could not align the real-time "
                    "train position with the scheduled route."
                ),
            )

        # ---------------------------------------------------------
        # 4. Run ML predictor
        # ---------------------------------------------------------

        predictor = DynamicMLPredictor()

        prediction = predictor.predict(
            train_number=train_number,
            current_station=prediction_station,
            current_delay_minutes=live_delay,
            route_stops=route,
        )

        # ---------------------------------------------------------
        # 5. Attach live information
        # ---------------------------------------------------------

        prediction["live_data"] = {
            "is_live": live["is_live"],
            "tracking_mode": live["tracking_mode"],
            "last_updated_at": live[
                "last_updated_at"
            ],
            "current_station": live[
                "current_station"
            ],
            "previous_station": live[
                "previous_station"
            ],
            "next_station": live[
                "next_station"
            ],
            "delay_minutes": live_delay,
            "position": live["position"],
            "speed_kmph": live.get(
                "speed_kmph"
            ),
        }

        prediction["route_alignment"] = {
            "live_station": live_station,
            "prediction_anchor_station": (
                prediction_station
            ),
            "next_scheduled_station": (
                live_next_station
            ),
            "position_mode": position_mode,
        }

        prediction["live_current_station"] = (
            live["current_station"]
        )

        prediction["prediction_anchor_station"] = (
            prediction_station
        )

        prediction["live_next_station"] = (
            live["next_station"]
        )

        prediction["prediction_mode"] = (
            "real_time_dynamic"
        )

        return prediction

    except RailRadarError as exc:

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        )

    except HTTPException:

        raise

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# =========================================================
# REAL-TIME ETA FOR EVERY REMAINING STATION
# =========================================================

@app.get(
    "/trains/{train_number}/eta/route"
)
def get_train_route_eta(train_number: str):

    try:

        # ---------------------------------------------------------
        # 1. REAL-TIME DATA
        # ---------------------------------------------------------

        live_client = RailRadarClient()

        live = live_client.get_normalized_live_train(
            train_number
        )

        live_station = (
            live["current_station"]["code"]
        )

        next_station = (
            live["next_station"]["code"]
        )

        live_delay = float(
            live["delay_minutes"] or 0
        )

        live_distance = (
            live["position"].get(
                "distance_from_origin_km"
            )
        )

        live_speed = live.get(
            "speed_kmph"
        )

        # ---------------------------------------------------------
        # 2. SCHEDULED ROUTE
        # ---------------------------------------------------------

        route = get_eta_train_route(
            train_number
        )

        if not route:

            raise HTTPException(
                status_code=404,
                detail=(
                    f"Route not found for train "
                    f"{train_number}"
                ),
            )

        # ---------------------------------------------------------
        # 3. REMAINING STATIONS
        # ---------------------------------------------------------

        remaining_stops = find_remaining_stops(
            route=route,
            live_station_code=live_station,
            next_station_code=next_station,
            live_distance_km=live_distance,
        )

        if not remaining_stops:

            return {
                "train_number": train_number,
                "train_name": live.get(
                    "train_name"
                ),
                "is_live": live["is_live"],
                "tracking_mode": live[
                    "tracking_mode"
                ],
                "current_location": live[
                    "current_station"
                ],
                "next_station": live[
                    "next_station"
                ],
                "current_delay_minutes": live_delay,
                "speed_kmph": live_speed,
                "stations": [],
                "total_remaining_stations": 0,
                "message": (
                    "No remaining scheduled stops."
                ),
            }

        # ---------------------------------------------------------
        # 4. ML PREDICTION ANCHOR
        # ---------------------------------------------------------

        route_codes = [
            stop.station_code
            for stop in route
        ]

        if live_station in route_codes:

            prediction_anchor = live_station

        elif next_station in route_codes:

            next_index = route_codes.index(
                next_station
            )

            prediction_anchor = (
                route[
                    max(0, next_index - 1)
                ].station_code
            )

        else:

            prediction_anchor = (
                remaining_stops[0]
                .station_code
            )

        # ---------------------------------------------------------
        # 5. ML PREDICTION
        # ---------------------------------------------------------

        predictor = DynamicMLPredictor()

        ml_prediction = predictor.predict(
            train_number=train_number,
            current_station=prediction_anchor,
            current_delay_minutes=live_delay,
            route_stops=route,
        )

        predicted_destination_delay = float(
            ml_prediction.get(
                "predicted_delay_minutes",
                live_delay,
            )
        )

        # ---------------------------------------------------------
        # 6. EXPECTED SECTION SPEED
        # ---------------------------------------------------------

        expected_speed = (
            calculate_scheduled_segment_speed(
                route=route,
                current_station_code=(
                    prediction_anchor
                ),
                next_station_code=(
                    next_station
                ),
            )
        )

        # ---------------------------------------------------------
        # 7. OPERATIONAL FACTORS
        # ---------------------------------------------------------

        operational_factors = (
            calculate_operational_adjustment(
                live_delay_minutes=live_delay,
                live_speed_kmph=live_speed,
                expected_speed_kmph=expected_speed,
            )
        )

        preceding_train_adjustment = float(
            operational_factors[
                "preceding_train"
            ][
                "estimated_effect_minutes"
            ]
        )

        # ---------------------------------------------------------
        # 8. SPEED ADJUSTMENT
        # ---------------------------------------------------------

        speed_adjustment_minutes = (
            calculate_speed_adjustment(
                remaining_distance_km=(
                    (
                        float(
                            remaining_stops[-1]
                            .distance_km
                        )
                        - float(live_distance)
                    )
                    if (
                        live_distance is not None
                        and remaining_stops[-1]
                        .distance_km is not None
                    )
                    else None
                ),
                live_speed_kmph=live_speed,
                expected_speed_kmph=expected_speed,
            )
        )

        # ---------------------------------------------------------
        # 9. FINAL DESTINATION DELAY
        #
        # ML prediction
        # + preceding-train/network effect
        # + live-speed effect
        # ---------------------------------------------------------

        final_destination_delay = (
            predicted_destination_delay
            + preceding_train_adjustment
            + speed_adjustment_minutes
        )

        final_destination_delay = max(
            0.0,
            final_destination_delay,
        )

        # ---------------------------------------------------------
        # 9B. OPERATIONAL EVENTS
        # ---------------------------------------------------------
        # MVP event feed. Keep empty until real operational-event
        # data is available; this avoids fabricating disruptions.
        operational_events = []

        event_adjustment = calculate_event_adjustment(
            operational_events
        )

        event_adjustment_minutes = float(
            event_adjustment[
                "total_adjustment_minutes"
            ]
        )

        final_destination_delay = (
            final_destination_delay
            + event_adjustment_minutes
        )

        final_destination_delay = max(
            0.0,
            final_destination_delay,
        )

        # ---------------------------------------------------------
        # 10. JOURNEY DATE
        # ---------------------------------------------------------

        start_date = live.get(
            "start_date"
        )

        if start_date:

            journey_date = datetime.strptime(
                start_date,
                "%Y-%m-%d",
            ).date()

        else:

            journey_date = datetime.now().date()

        # ---------------------------------------------------------
        # 11. BUILD STATION-BY-STATION ETA
        # ---------------------------------------------------------

        stations = build_route_eta(
            route=route,
            remaining_stops=remaining_stops,
            journey_date=journey_date,
            live_delay_minutes=live_delay,
            predicted_destination_delay=(
                predicted_destination_delay
                + preceding_train_adjustment
            ),
            live_distance_km=live_distance,
            live_speed_kmph=live_speed,
            expected_speed_kmph=expected_speed,
        )

        # ---------------------------------------------------------
        # 12. SPEED STATUS
        # ---------------------------------------------------------

        if (
            live_speed is not None
            and expected_speed is not None
        ):

            if live_speed > expected_speed:

                speed_effect = (
                    "faster_than_schedule"
                )

            elif live_speed < expected_speed:

                speed_effect = (
                    "slower_than_schedule"
                )

            else:

                speed_effect = "normal"

        else:

            speed_effect = "unavailable"

        # ---------------------------------------------------------
        # 13. FINAL RESPONSE
        # ---------------------------------------------------------

        return {

            "train_number": train_number,

            "train_name": live.get(
                "train_name"
            ),

            "prediction_mode": (
                "real_time_dynamic_route"
            ),

            "is_live": live[
                "is_live"
            ],

            "tracking_mode": live[
                "tracking_mode"
            ],

            "last_updated_at": live[
                "last_updated_at"
            ],

            "current_location": live[
                "current_station"
            ],

            "next_station": live[
                "next_station"
            ],

            "current_delay_minutes": (
                live_delay
            ),

            "ml_predicted_destination_delay_minutes": (
                round(
                    predicted_destination_delay,
                    2,
                )
            ),

            "predicted_destination_delay_minutes": (
                round(
                    final_destination_delay,
                    2,
                )
            ),

            "operational_factors": {

                "live_speed_kmph": (
                    round(
                        live_speed,
                        2,
                    )
                    if live_speed is not None
                    else None
                ),

                "expected_speed_kmph": (
                    round(
                        expected_speed,
                        2,
                    )
                    if expected_speed is not None
                    else None
                ),

                "speed_effect": (
                    speed_effect
                ),

                "speed_adjustment_minutes": (
                    round(
                        speed_adjustment_minutes,
                        2,
                    )
                ),

                "congestion": (
                    operational_factors[
                        "congestion"
                    ]
                ),

                "preceding_train": (
                    operational_factors[
                        "preceding_train"
                    ]
                ),

                "preceding_train_adjustment_minutes": (
                    round(
                        preceding_train_adjustment,
                        2,
                    )
                ),

                "total_operational_adjustment_minutes": (
                    round(
                        preceding_train_adjustment
                        + speed_adjustment_minutes,
                        2,
                    )
                ),

                "event_adjustment_minutes": (
                    round(
                        event_adjustment_minutes,
                        2,
                    )
                ),

                "events": (
                    event_adjustment[
                        "events"
                    ]
                ),
            },

            "position": live[
                "position"
            ],

            "stations": stations,

            "total_remaining_stations": len(
                stations
            ),
        }

    except RailRadarError as exc:

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        )

    except HTTPException:

        raise

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )
@app.get("/trains/{train_number}/events")
def get_train_events(train_number: str):
    """
    Return operational events affecting the train.
    Currently uses the backend event-processing layer.
    """
    try:
        event_adjustment = calculate_event_adjustment([])

        return {
            "train_number": train_number,
            "events": event_adjustment["events"],
            "total_adjustment_minutes": event_adjustment[
                "total_adjustment_minutes"
            ],
            "status": "no_active_events",
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


@app.get("/trains/{train_number}/network-status")
def get_network_status(train_number: str):
    """
    Return network/operational status derived from the live train state.
    """
    try:
        client = RailRadarClient()
        live = client.get_normalized_live_train(train_number)

        delay_minutes = float(
            live.get("delay_minutes") or 0
        )

        speed_kmph = live.get("speed_kmph")

        if delay_minutes >= 90:
            network_level = "high"
        elif delay_minutes >= 45:
            network_level = "medium"
        elif delay_minutes >= 15:
            network_level = "low"
        else:
            network_level = "normal"

        return {
            "train_number": train_number,
            "network_status": network_level,
            "delay_minutes": round(delay_minutes, 2),
            "speed_kmph": (
                round(float(speed_kmph), 2)
                if speed_kmph is not None
                else None
            ),
            "current_station": live.get(
                "current_station"
            ),
            "next_station": live.get(
                "next_station"
            ),
            "last_updated_at": live.get(
                "last_updated_at"
            ),
            "tracking_mode": live.get(
                "tracking_mode"
            ),
            "status": live.get(
                "status"
            ),
        }

    except RailRadarError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )
