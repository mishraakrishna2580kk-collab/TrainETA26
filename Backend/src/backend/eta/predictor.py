"""
Baseline (non-ML) ETA prediction logic for the Indian Railway Dynamic ETA system.

This module is PURE:
- no SQL
- no database connections
- no FastAPI imports

A future repository/data-access module will fetch database data and pass it
into predict_eta().
"""

import statistics
from datetime import datetime, time, timedelta, timezone
from typing import List, Optional, Sequence, Union

from pydantic import BaseModel, Field


CURRENT_DELAY_WEIGHT: float = 0.7
HISTORICAL_DELAY_WEIGHT: float = 0.3

ScheduleLike = Union[datetime, time]


class RouteStop(BaseModel):
    """One row of train_routes for one train."""

    stop_sequence: int
    station_code: str
    station_name: Optional[str] = None
    distance_km: Optional[float] = None
    scheduled_arrival: Optional[ScheduleLike] = None
    scheduled_departure: Optional[ScheduleLike] = None


class ETAPrediction(BaseModel):
    """Structured result of a baseline ETA prediction."""

    train_number: str
    train_name: Optional[str] = None

    current_station: str
    current_delay_minutes: float

    destination_station_code: str
    destination_station_name: Optional[str] = None

    remaining_station_count: int
    remaining_stations: List[str]
    remaining_distance_km: Optional[float] = None

    scheduled_destination_arrival: Optional[ScheduleLike] = None
    predicted_delay_minutes: float
    predicted_arrival: Optional[ScheduleLike] = None

    historical_destination_delay_minutes: Optional[float] = None
    basis: str
    notes: List[str] = Field(default_factory=list)
    generated_at: datetime


class PredictorError(Exception):
    """Base class for prediction errors."""


class RouteNotFoundError(PredictorError):
    """The train has no route rows."""


class StationNotOnRouteError(PredictorError):
    """The given current station is not on the train's route."""

    def __init__(
        self,
        train_number: str,
        station_code: str,
        valid_stops: Sequence[str],
    ):
        self.valid_stops = list(valid_stops)

        super().__init__(
            f"Station '{station_code}' is not on the route of train "
            f"{train_number}. Valid stops: {', '.join(self.valid_stops)}"
        )


def _add_minutes(
    value: Optional[ScheduleLike],
    minutes: float,
) -> Optional[ScheduleLike]:
    """Add minutes to a datetime or time-of-day."""

    if value is None:
        return None

    if isinstance(value, datetime):
        return value + timedelta(minutes=minutes)

    if isinstance(value, time):
        total_seconds = int(
            round(
                value.hour * 3600
                + value.minute * 60
                + value.second
                + minutes * 60
            )
        ) % (24 * 3600)

        return time(
            hour=total_seconds // 3600,
            minute=(total_seconds % 3600) // 60,
            second=total_seconds % 60,
        )

    return None


def predict_eta(
    *,
    train_number: str,
    current_station: str,
    current_delay_minutes: float,
    route_stops: Sequence[RouteStop],
    historical_destination_delays: Optional[
        Sequence[Optional[float]]
    ] = None,
    train_name: Optional[str] = None,
    expected_destination_code: Optional[str] = None,
) -> ETAPrediction:
    """
    Predict the train's arrival time at its destination.

    This is a transparent baseline model:

        predicted_delay =
            0.7 * current_delay
            + 0.3 * historical_destination_median

    Fallbacks:
    - No historical data -> current delay persists.
    - Already at destination -> current delay is reported as-is.
    - Missing scheduled arrival -> predicted_arrival is None.
    """

    notes: List[str] = []

    if not route_stops:
        raise RouteNotFoundError(
            f"Train {train_number} has no route data."
        )

    stops = sorted(
        route_stops,
        key=lambda stop: stop.stop_sequence,
    )

    wanted = (current_station or "").strip().upper()

    current_index = next(
        (
            index
            for index, stop in enumerate(stops)
            if (stop.station_code or "").strip().upper() == wanted
        ),
        None,
    )

    if current_index is None:
        raise StationNotOnRouteError(
            train_number,
            current_station,
            [stop.station_code for stop in stops],
        )

    current_stop = stops[current_index]
    remaining_stops = stops[current_index + 1:]

    destination_stop = stops[-1]

    if (
        expected_destination_code
        and (
            destination_stop.station_code or ""
        ).strip().upper()
        != expected_destination_code.strip().upper()
    ):
        notes.append(
            f"Route's final stop ({destination_stop.station_code}) "
            f"does not match trains.destination_station_code "
            f"({expected_destination_code}); using the route's final stop."
        )

    generated_at = datetime.now(timezone.utc)

    # Already at destination.
    if not remaining_stops:
        return ETAPrediction(
            train_number=train_number,
            train_name=train_name,
            current_station=current_stop.station_code,
            current_delay_minutes=current_delay_minutes,
            destination_station_code=destination_stop.station_code,
            destination_station_name=destination_stop.station_name,
            remaining_station_count=0,
            remaining_stations=[],
            remaining_distance_km=0.0,
            scheduled_destination_arrival=(
                destination_stop.scheduled_arrival
            ),
            predicted_delay_minutes=current_delay_minutes,
            predicted_arrival=_add_minutes(
                destination_stop.scheduled_arrival,
                current_delay_minutes,
            ),
            historical_destination_delay_minutes=None,
            basis="at_destination",
            notes=[
                "Train is already at the destination station."
            ],
            generated_at=generated_at,
        )

    remaining_distance_km: Optional[float] = None

    if (
        destination_stop.distance_km is not None
        and current_stop.distance_km is not None
    ):
        remaining_distance_km = round(
            destination_stop.distance_km
            - current_stop.distance_km,
            1,
        )

    clean_history: List[float] = [
        float(delay)
        for delay in (historical_destination_delays or [])
        if delay is not None
    ]

    historical_median: Optional[float] = None

    if clean_history:
        historical_median = round(
            statistics.median(clean_history),
            1,
        )
    else:
        notes.append(
            "No usable historical arrival delays for this train "
            "at the destination; assuming the current delay persists."
        )

    if historical_median is None:
        predicted_delay = float(current_delay_minutes)
        basis = "current_only"
    else:
        predicted_delay = round(
            CURRENT_DELAY_WEIGHT * current_delay_minutes
            + HISTORICAL_DELAY_WEIGHT * historical_median,
            1,
        )
        basis = "blend"

    scheduled_arrival = destination_stop.scheduled_arrival

    predicted_arrival = _add_minutes(
        scheduled_arrival,
        predicted_delay,
    )

    if scheduled_arrival is None:
        notes.append(
            "Destination scheduled_arrival is missing in train_routes; "
            "returning the predicted delay without a clock time."
        )

    return ETAPrediction(
        train_number=train_number,
        train_name=train_name,
        current_station=current_stop.station_code,
        current_delay_minutes=current_delay_minutes,
        destination_station_code=destination_stop.station_code,
        destination_station_name=destination_stop.station_name,
        remaining_station_count=len(remaining_stops),
        remaining_stations=[
            stop.station_code for stop in remaining_stops
        ],
        remaining_distance_km=remaining_distance_km,
        scheduled_destination_arrival=scheduled_arrival,
        predicted_delay_minutes=predicted_delay,
        predicted_arrival=predicted_arrival,
        historical_destination_delay_minutes=historical_median,
        basis=basis,
        notes=notes,
        generated_at=generated_at,
    )


if __name__ == "__main__":
    sample_route = [
        RouteStop(
            stop_sequence=1,
            station_code="ADI",
            station_name="Ahmedabad Jn",
            distance_km=0.0,
            scheduled_arrival=None,
            scheduled_departure=time(15, 0),
        ),
        RouteStop(
            stop_sequence=2,
            station_code="FLD",
            station_name="Falna",
            distance_km=120.0,
            scheduled_arrival=time(16, 45),
            scheduled_departure=time(16, 47),
        ),
        RouteStop(
            stop_sequence=3,
            station_code="KOTA",
            station_name="Kota Jn",
            distance_km=300.0,
            scheduled_arrival=time(19, 10),
            scheduled_departure=time(19, 15),
        ),
        RouteStop(
            stop_sequence=4,
            station_code="NDLS",
            station_name="New Delhi",
            distance_km=540.0,
            scheduled_arrival=time(22, 40),
            scheduled_departure=None,
        ),
    ]

    sample_history: List[Optional[float]] = [
        10.0,
        25.0,
        20.0,
        60.0,
        15.0,
        None,
    ]

    prediction = predict_eta(
        train_number="12957",
        current_station="fld",
        current_delay_minutes=15,
        route_stops=sample_route,
        historical_destination_delays=sample_history,
        train_name="Swarna Jayanti Rajdhani",
        expected_destination_code="NDLS",
    )

    print(prediction.model_dump_json(indent=2))

    fallback = predict_eta(
        train_number="12957",
        current_station="KOTA",
        current_delay_minutes=15,
        route_stops=sample_route,
        historical_destination_delays=None,
    )

    print(
        "\nFallback check:",
        fallback.predicted_delay_minutes,
        "min,",
        fallback.basis,
    )