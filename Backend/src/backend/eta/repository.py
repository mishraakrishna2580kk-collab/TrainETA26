"""
Repository / data-access layer for the ETA prediction pipeline.

This module is the ONLY place in the eta package that talks to PostgreSQL.

It fetches raw data using the existing connection factory and maps database
rows onto the Pydantic models already defined in predictor.py.

This module contains NO prediction logic:
- no medians
- no delay blending
- no ETA arithmetic
- no FastAPI imports
- no HTTPException

Empty results are returned as empty lists. The caller decides what to do.
"""

from __future__ import annotations

from contextlib import closing

from src.backend.database import get_connection
from src.backend.eta.predictor import RouteStop


# ---------------------------------------------------------------------------
# train_routes
# ---------------------------------------------------------------------------

_GET_TRAIN_ROUTE_SQL = """
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
"""


def get_train_route(train_number: str) -> list[RouteStop]:
    """
    Fetch a train's route stops, ordered by stop_sequence.

    Each database row is converted into the existing RouteStop Pydantic model.

    Args:
        train_number: Train number to look up.

    Returns:
        A list of RouteStop objects.

        Returns an empty list if the train has no route rows.

    Raises:
        Database errors from psycopg are allowed to propagate.
    """
    route_stops: list[RouteStop] = []

    with closing(get_connection()) as conn:
        with conn.cursor() as cur:
            cur.execute(
                _GET_TRAIN_ROUTE_SQL,
                (train_number,),
            )

            rows = cur.fetchall()

            for row in rows:
                route_stops.append(
                    RouteStop(
                        stop_sequence=row[0],
                        station_code=row[1],
                        station_name=row[2],
                        distance_km=(
                            float(row[3])
                            if row[3] is not None
                            else None
                        ),
                        scheduled_arrival=row[4],
                        scheduled_departure=row[5],
                    )
                )

    return route_stops


# ---------------------------------------------------------------------------
# historical_delays
# ---------------------------------------------------------------------------

_GET_DESTINATION_HISTORICAL_DELAYS_SQL = """
SELECT
    arrival_delay_minutes
FROM historical_delays
WHERE train_number = %s
  AND station_code = %s
  AND arrival_delay_minutes IS NOT NULL
  AND service_date <= CURRENT_DATE
ORDER BY service_date DESC
"""


def get_destination_historical_delays(
    train_number: str,
    destination_station_code: str,
) -> list[float | None]:
    """
    Fetch historical arrival delays at the destination station.

    Args:
        train_number: Train number to look up.
        destination_station_code: Destination station code.

    Returns:
        Historical arrival delays in minutes, most recent first.

        Returns an empty list when no historical data exists.

    Raises:
        Database errors from psycopg are allowed to propagate.
    """
    delays: list[float | None] = []

    with closing(get_connection()) as conn:
        with conn.cursor() as cur:
            cur.execute(
                _GET_DESTINATION_HISTORICAL_DELAYS_SQL,
                (
                    train_number,
                    destination_station_code,
                ),
            )

            rows = cur.fetchall()

            for row in rows:
                value = row[0]
                delays.append(
                    float(value) if value is not None else None
                )

    return delays
# ---------------------------------------------------------------------------
# trains
# ---------------------------------------------------------------------------

_GET_TRAIN_INFO_SQL = """
SELECT
    train_name,
    destination_station_code
FROM trains
WHERE train_number = %s
"""


def get_train_info(
    train_number: str,
) -> tuple[str | None, str | None] | None:
    """
    Fetch basic information about a train.

    Args:
        train_number: Train number to look up.

    Returns:
        A tuple containing:
            (train_name, destination_station_code)

        Returns None if the train does not exist.

    Raises:
        Database errors from psycopg are allowed to propagate.
    """
    with closing(get_connection()) as conn:
        with conn.cursor() as cur:
            cur.execute(
                _GET_TRAIN_INFO_SQL,
                (train_number,),
            )

            row = cur.fetchone()

    if row is None:
        return None

    return row[0], row[1]