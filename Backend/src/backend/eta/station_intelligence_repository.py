"""
Repository functions for station-level delay intelligence.

This module handles database access only.

It loads consecutive station observations for the same train and
service date so the analytical layer can calculate delay propagation.
"""

from __future__ import annotations

from contextlib import closing
from datetime import date, time
from typing import List, NamedTuple

from src.backend.database import get_connection


class SegmentObservation(NamedTuple):
    """One historical observation across two consecutive stations."""

    train_number: str
    service_date: date

    from_station_code: str
    from_station_name: str
    from_scheduled_arrival: time | None
    from_actual_arrival: time | None
    from_arrival_delay_minutes: float

    to_station_code: str
    to_station_name: str
    to_scheduled_arrival: time | None
    to_actual_arrival: time | None
    to_arrival_delay_minutes: float


_GET_SEGMENT_OBSERVATIONS_SQL = """
    SELECT
        tr1.train_number,
        hd1.service_date,

        tr1.station_code,
        tr1.station_name,
        tr1.scheduled_arrival,
        hd1.actual_arrival,
        hd1.arrival_delay_minutes,

        tr2.station_code,
        tr2.station_name,
        tr2.scheduled_arrival,
        hd2.actual_arrival,
        hd2.arrival_delay_minutes

    FROM train_routes tr1

    JOIN train_routes tr2
        ON tr2.train_number = tr1.train_number
       AND tr2.stop_sequence = tr1.stop_sequence + 1

    JOIN historical_delays hd1
        ON hd1.train_number = tr1.train_number
       AND hd1.station_code = tr1.station_code

    JOIN historical_delays hd2
        ON hd2.train_number = tr2.train_number
       AND hd2.station_code = tr2.station_code
       AND hd2.service_date = hd1.service_date

    WHERE hd1.arrival_delay_minutes IS NOT NULL
      AND hd2.arrival_delay_minutes IS NOT NULL

    ORDER BY
        tr1.train_number,
        hd1.service_date,
        tr1.stop_sequence
"""


def get_segment_observations() -> List[SegmentObservation]:
    """
    Load historical observations for true consecutive route segments.

    A row is returned only when:
    - both stations are consecutive in train_routes
    - both stations belong to the same train
    - both observations are from the same service date
    - both arrival delays are available
    """

    rows: List[SegmentObservation] = []

    with closing(get_connection()) as conn:
        with conn.cursor() as cur:
            cur.execute(_GET_SEGMENT_OBSERVATIONS_SQL)

            for row in cur.fetchall():
                (
                    train_number,
                    service_date,
                    from_station_code,
                    from_station_name,
                    from_scheduled_arrival,
                    from_actual_arrival,
                    from_delay,
                    to_station_code,
                    to_station_name,
                    to_scheduled_arrival,
                    to_actual_arrival,
                    to_delay,
                ) = row

                rows.append(
                    SegmentObservation(
                        train_number=train_number,
                        service_date=service_date,
                        from_station_code=from_station_code,
                        from_station_name=from_station_name,
                        from_scheduled_arrival=from_scheduled_arrival,
                        from_actual_arrival=from_actual_arrival,
                        from_arrival_delay_minutes=float(from_delay),
                        to_station_code=to_station_code,
                        to_station_name=to_station_name,
                        to_scheduled_arrival=to_scheduled_arrival,
                        to_actual_arrival=to_actual_arrival,
                        to_arrival_delay_minutes=float(to_delay),
                    )
                )

    return rows