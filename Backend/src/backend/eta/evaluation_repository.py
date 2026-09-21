"""
Batched database access for the offline ETA accuracy evaluation.

WHY THIS EXISTS (instead of reusing repository.py)
--------------------------------------------------
repository.get_destination_historical_delays() is designed for live serving:
one query per call, and it filters with `service_date <= CURRENT_DATE`.

The evaluation needs something different:
  * BULK access - one query per journey would mean ~57,000 round trips.
  * DATE CONTROL - for a journey on service date D, reference history must
    come only from dates STRICTLY BEFORE D (chronological backtest, no data
    leakage). `<= CURRENT_DATE` cannot express that.

So this module loads the whole evaluation set in a handful of round trips;
evaluation.py then applies the per-journey "dates < D" filter in memory.

This module contains NO prediction logic and NO FastAPI imports.
No existing files are modified by this module.
"""

from __future__ import annotations

from contextlib import closing
from datetime import date
from typing import Dict, List, NamedTuple, Optional, Sequence, Tuple

from src.backend.database import get_connection
from src.backend.eta.predictor import RouteStop


class TrainInfo(NamedTuple):
    """One row of `trains` (only the columns the evaluation needs)."""

    train_number: str
    train_name: Optional[str]
    destination_station_code: Optional[str]


class JourneyDelayRow(NamedTuple):
    """One usable arrival-delay observation from `historical_delays`."""

    train_number: str
    station_code: str
    service_date: date
    arrival_delay_minutes: float


# ---------------------------------------------------------------------------
# SQL
# ---------------------------------------------------------------------------
# Every route stop for every train, in one round trip.
_GET_ALL_ROUTES_SQL = """
    SELECT
        train_number,
        stop_sequence,
        station_code,
        station_name,
        distance_km,
        scheduled_arrival,
        scheduled_departure
    FROM train_routes
    ORDER BY train_number, stop_sequence
"""

# Train metadata for every train, in one round trip.
_GET_ALL_TRAIN_INFO_SQL = """
    SELECT train_number, train_name, destination_station_code
    FROM trains
"""

# Join historical_delays against a VALUES list of (train_number, station_code)
# pairs so ALL midpoint + destination observations for ALL trains are fetched
# in a few bulk queries. NULL arrival delays are dropped here (they are
# unusable both as predictor input and as labels).
#
# NOTE: deliberately NO date filter in this query. Date filtering happens
# per journey in evaluation.py ("strictly earlier than the evaluation date")
# because the allowed window depends on WHICH journey we are predicting for.
_GET_JOURNEY_DELAYS_TEMPLATE = """
    SELECT
        v.train_number,
        v.station_code,
        hd.service_date,
        hd.arrival_delay_minutes
    FROM (VALUES {pairs}) AS v(train_number, station_code)
    JOIN historical_delays hd
        ON hd.train_number = v.train_number
       AND hd.station_code = v.station_code
       AND hd.arrival_delay_minutes IS NOT NULL
    ORDER BY hd.train_number, hd.service_date
"""

# (train_number, station_code) pairs per query. 2,000 pairs = 4,000 bind
# parameters, comfortably within driver/server limits, so ~3,892 trains need
# only a handful of queries total.
_PAIRS_PER_QUERY = 2000


# ---------------------------------------------------------------------------
# Fetch functions
# ---------------------------------------------------------------------------
def get_all_routes() -> Dict[str, List[RouteStop]]:
    """
    Load every train's route in ONE query.

    Returns:
        Mapping of train_number -> route stops, already ordered by
        stop_sequence. Empty dict if train_routes is empty.

    Raises:
        Whatever psycopg raises on connection/query failure.
    """
    routes: Dict[str, List[RouteStop]] = {}

    with closing(get_connection()) as conn:
        with conn.cursor() as cur:
            cur.execute(_GET_ALL_ROUTES_SQL)
            columns = [desc[0] for desc in cur.description]
            for row in cur.fetchall():
                stop = RouteStop(**dict(zip(columns, row)))
                routes.setdefault(row[0], []).append(stop)

    return routes


def get_all_train_info() -> Dict[str, TrainInfo]:
    """
    Load train metadata (name, declared destination) in ONE query.

    Returns:
        Mapping of train_number -> TrainInfo. Empty dict if trains is empty.

    Raises:
        Whatever psycopg raises on connection/query failure.
    """
    info: Dict[str, TrainInfo] = {}

    with closing(get_connection()) as conn:
        with conn.cursor() as cur:
            cur.execute(_GET_ALL_TRAIN_INFO_SQL)
            for train_number, train_name, dest_code in cur.fetchall():
                info[train_number] = TrainInfo(
                    train_number=train_number,
                    train_name=train_name,
                    destination_station_code=dest_code,
                )

    return info


def get_journey_delays(
    pairs: Sequence[Tuple[str, str]],
) -> List[JourneyDelayRow]:
    """
    Bulk-load arrival delays for specific (train_number, station_code) pairs.

    For the evaluation this is called once with two pairs per train:
    (train, midpoint_station) and (train, destination_station). The VALUES
    join keeps this to a handful of queries regardless of journey count
    (each train/date/station combination is one row via the primary key).

    Args:
        pairs: (train_number, station_code) tuples to fetch.

    Returns:
        Rows ordered by (train_number, service_date). Delays are floats
        (Postgres NUMERIC may arrive as Decimal). Empty list if no matches.

    Raises:
        Whatever psycopg raises on connection/query failure.
    """
    # Deduplicate so repeated callers don't multiply the workload.
    unique_pairs: List[Tuple[str, str]] = sorted(set(pairs))
    rows: List[JourneyDelayRow] = []

    with closing(get_connection()) as conn:
        with conn.cursor() as cur:
            for start in range(0, len(unique_pairs), _PAIRS_PER_QUERY):
                chunk = unique_pairs[start : start + _PAIRS_PER_QUERY]

                values_sql = ", ".join(["(%s, %s)"] * len(chunk))
                sql = _GET_JOURNEY_DELAYS_TEMPLATE.format(pairs=values_sql)
                params = [value for pair in chunk for value in pair]

                cur.execute(sql, params)
                for train_number, station_code, service_date, delay in cur.fetchall():
                    rows.append(
                        JourneyDelayRow(
                            train_number=train_number,
                            station_code=station_code,
                            service_date=service_date,
                            arrival_delay_minutes=float(delay),
                        )
                    )

    return rows