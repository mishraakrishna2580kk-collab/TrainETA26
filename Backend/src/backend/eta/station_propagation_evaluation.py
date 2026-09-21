"""
Leakage-safe evaluation of station-level delay propagation.

This is an analysis-only experiment.

It compares:
1. The current production ETA baseline.
2. A station-aware prediction using historical median
   delay propagation for the current -> next station segment.

Historical segment information is restricted to dates BEFORE
the evaluation date.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from statistics import median
from typing import DefaultDict, Dict, List, Optional, Tuple

from src.backend.eta.evaluation_repository import (
    JourneyDelayRow,
    get_all_routes,
    get_journey_delays,
)
from src.backend.eta.predictor import RouteStop, predict_eta
from src.backend.eta.station_intelligence import normalize_delay


MIN_SEGMENT_OBSERVATIONS = 20


def calculate_mae(errors: List[float]) -> float:
    """Mean Absolute Error."""

    if not errors:
        return 0.0

    return sum(abs(error) for error in errors) / len(errors)


def calculate_rmse(errors: List[float]) -> float:
    """Root Mean Squared Error."""

    if not errors:
        return 0.0

    return (
        sum(error * error for error in errors) / len(errors)
    ) ** 0.5


def calculate_mean_error(errors: List[float]) -> float:
    """Mean signed prediction error."""

    if not errors:
        return 0.0

    return sum(errors) / len(errors)


def build_historical_segment_index(
    observations,
) -> DefaultDict[
    Tuple[str, str],
    List[Tuple[date, float]],
]:
    """
    Build:

        (from_station, to_station)
            ->
        [(service_date, delay_change), ...]

    The date is retained so evaluation can enforce
    chronological train/test separation.
    """

    index: DefaultDict[
        Tuple[str, str],
        List[Tuple[date, float]],
    ] = defaultdict(list)

    for row in observations:
        from_delay = normalize_delay(
            row.from_arrival_delay_minutes,
            row.from_scheduled_arrival,
            row.from_actual_arrival,
        )

        to_delay = normalize_delay(
            row.to_arrival_delay_minutes,
            row.to_scheduled_arrival,
            row.to_actual_arrival,
        )

        delay_change = to_delay - from_delay

        key = (
            row.from_station_code,
            row.to_station_code,
        )

        index[key].append(
            (row.service_date, delay_change)
        )

    return index


def get_historical_segment_median(
    segment_history: List[Tuple[date, float]],
    evaluation_date: date,
) -> Optional[float]:
    """
    Return the historical median propagation for a segment.

    Only observations strictly BEFORE the evaluation date are allowed.
    """

    previous_changes = [
        change
        for service_date, change in segment_history
        if service_date < evaluation_date
    ]

    if len(previous_changes) < MIN_SEGMENT_OBSERVATIONS:
        return None

    return float(median(previous_changes))


def get_prediction_delay(
    train_number: str,
    current_station: str,
    current_delay: float,
    route: List[RouteStop],
    destination_history: List[float],
    train_name: Optional[str],
    destination_code: Optional[str],
):
    """Run the existing production baseline predictor."""

    return predict_eta(
        train_number=train_number,
        current_station=current_station,
        current_delay_minutes=current_delay,
        route_stops=route,
        historical_destination_delays=destination_history,
        train_name=train_name,
        expected_destination_code=destination_code,
    )


def main() -> None:
    print("Loading routes...")

    routes = get_all_routes()

    print(f"Trains with route data: {len(routes):,}")

    print("\nLoading consecutive station observations...")

    from src.backend.eta.station_intelligence_repository import (
        get_segment_observations,
    )

    segment_observations = get_segment_observations()

    print(
        "Segment observations: "
        f"{len(segment_observations):,}"
    )

    print("\nBuilding historical segment index...")

    segment_history = build_historical_segment_index(
        segment_observations
    )

    print(
        "Unique station segments: "
        f"{len(segment_history):,}"
    )

    # ---------------------------------------------------------
    # Build journey-level evaluation data.
    #
    # We use the same historical dataset as evaluation.py.
    # ---------------------------------------------------------

    print("\nLoading journey delay observations...")

    journey_rows = get_journey_delays(
        [
            (
                train_number,
                stop.station_code,
            )
            for train_number, route in routes.items()
            for stop in route
        ]
    )

    print(
        "Journey delay rows: "
        f"{len(journey_rows):,}"
    )

    # Index:
    #
    # (train, service_date)
    #       ->
    #       station_code -> arrival delay
    #
    journey_index: DefaultDict[
        Tuple[str, date],
        Dict[str, float],
    ] = defaultdict(dict)

    for row in journey_rows:
        journey_index[
            (row.train_number, row.service_date)
        ][row.station_code] = row.arrival_delay_minutes

    baseline_errors: List[float] = []
    station_errors: List[float] = []

    station_feature_used = 0
    station_feature_fallback = 0
    evaluated_journeys = 0

    print("\nRunning chronological station-aware evaluation...")

    for (
        train_number,
        service_date,
    ), station_delays in sorted(journey_index.items()):

        route = routes.get(train_number)

        if not route or len(route) < 3:
            continue

        ordered = sorted(
            route,
            key=lambda stop: stop.stop_sequence,
        )

        # Use the same midpoint methodology as evaluation.py.
        midpoint_index = len(ordered) // 2

        if midpoint_index >= len(ordered) - 1:
            continue

        current_stop = ordered[midpoint_index]
        next_stop = ordered[midpoint_index + 1]
        destination_stop = ordered[-1]

        if (
            current_stop.station_code
            not in station_delays
        ):
            continue

        if (
            destination_stop.station_code
            not in station_delays
        ):
            continue

        current_delay = station_delays[
            current_stop.station_code
        ]

        actual_destination_delay = station_delays[
            destination_stop.station_code
        ]

        # -----------------------------------------------------
        # Destination history available BEFORE evaluation date
        # -----------------------------------------------------

        destination_history = [
            value
            for (
                row_train,
                row_date,
            ), values in journey_index.items()
            if row_train == train_number
            and row_date < service_date
            and destination_stop.station_code in values
            for value in [
                values[destination_stop.station_code]
            ]
        ]

        # -----------------------------------------------------
        # BASELINE
        # -----------------------------------------------------

        baseline_prediction = get_prediction_delay(
            train_number=train_number,
            current_station=current_stop.station_code,
            current_delay=current_delay,
            route=ordered,
            destination_history=destination_history,
            train_name=None,
            destination_code=destination_stop.station_code,
        )

        baseline_error = (
            baseline_prediction.predicted_delay_minutes
            - actual_destination_delay
        )

        baseline_errors.append(baseline_error)

        # -----------------------------------------------------
        # STATION-AWARE FEATURE
        # -----------------------------------------------------

        segment_key = (
            current_stop.station_code,
            next_stop.station_code,
        )

        history = segment_history.get(
            segment_key,
            [],
        )

        historical_segment_median = (
            get_historical_segment_median(
                history,
                service_date,
            )
        )

        if historical_segment_median is None:
            station_feature_fallback += 1

            # No reliable station signal:
            # use the exact baseline prediction.
            station_prediction = (
                baseline_prediction.predicted_delay_minutes
            )

        else:
            station_feature_used += 1

            # -------------------------------------------------
            # Experimental station-aware prediction.
            #
            # We add only the historical propagation signal
            # to the current delay, then blend it with the
            # existing destination-history estimate.
            #
            # This is deliberately conservative:
            # 50% existing baseline
            # 50% segment-adjusted estimate
            # -------------------------------------------------

            segment_adjusted_delay = (
                current_delay
                + historical_segment_median
            )

            station_prediction = (
                0.5
                * baseline_prediction.predicted_delay_minutes
                + 0.5
                * segment_adjusted_delay
            )

        station_error = (
            station_prediction
            - actual_destination_delay
        )

        station_errors.append(station_error)

        evaluated_journeys += 1

    # ---------------------------------------------------------
    # RESULTS
    # ---------------------------------------------------------

    baseline_mae = calculate_mae(
        baseline_errors
    )

    station_mae = calculate_mae(
        station_errors
    )

    baseline_rmse = calculate_rmse(
        baseline_errors
    )

    station_rmse = calculate_rmse(
        station_errors
    )

    baseline_bias = calculate_mean_error(
        baseline_errors
    )

    station_bias = calculate_mean_error(
        station_errors
    )

    improvement = baseline_mae - station_mae

    improvement_pct = (
        improvement / baseline_mae * 100
        if baseline_mae
        else 0.0
    )

    total = station_feature_used + station_feature_fallback

    feature_fallback_pct = (
        station_feature_fallback / total * 100
        if total
        else 0.0
    )

    print("\n" + "=" * 70)
    print("STATION-AWARE ETA EVALUATION")
    print("=" * 70)

    print(
        f"Evaluated journeys:       "
        f"{evaluated_journeys:,}"
    )

    print("\nBASELINE")
    print("-" * 70)

    print(
        f"MAE:                       "
        f"{baseline_mae:.2f} minutes"
    )

    print(
        f"RMSE:                      "
        f"{baseline_rmse:.2f} minutes"
    )

    print(
        f"Mean error:                "
        f"{baseline_bias:+.2f} minutes"
    )

    print("\nSTATION-AWARE")
    print("-" * 70)

    print(
        f"MAE:                       "
        f"{station_mae:.2f} minutes"
    )

    print(
        f"RMSE:                      "
        f"{station_rmse:.2f} minutes"
    )

    print(
        f"Mean error:                "
        f"{station_bias:+.2f} minutes"
    )

    print(
        f"Feature used:              "
        f"{station_feature_used:,}"
    )

    print(
        f"Feature fallback:          "
        f"{station_feature_fallback:,}"
    )

    print(
        f"Feature fallback rate:     "
        f"{feature_fallback_pct:.2f}%"
    )

    print("\nCOMPARISON")
    print("-" * 70)

    print(
        f"MAE improvement:           "
        f"{improvement:+.2f} minutes"
    )

    print(
        f"MAE improvement %:         "
        f"{improvement_pct:+.2f}%"
    )

    print("=" * 70)


if __name__ == "__main__":
    main()