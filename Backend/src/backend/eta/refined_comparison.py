"""
Phase 5D - Offline refined ETA comparison.

Compares:
1. Current-delay-only baseline
2. Existing 70/30 predictor
3. Refined predictor with delay-regime weighting

This does NOT modify predictor.py or main.py.
"""

from __future__ import annotations

import math
from collections import defaultdict

from src.backend.eta.evaluation_repository import (
    get_all_routes,
    get_all_train_info,
    get_journey_delays,
)
from src.backend.eta.predictor import predict_eta


def calculate_metrics(records):
    if not records:
        return 0.0, 0.0, 0.0

    errors = [
        float(record["error"])
        for record in records
    ]

    mae = sum(
        abs(error)
        for error in errors
    ) / len(errors)

    rmse = math.sqrt(
        sum(
            error * error
            for error in errors
        ) / len(errors)
    )

    bias = sum(errors) / len(errors)

    return mae, rmse, bias


def refined_prediction(
    current_delay: float,
    historical_median: float | None,
) -> float:

    current = max(
        0.0,
        float(current_delay),
    )

    if historical_median is None:
        return current

    historical = max(
        0.0,
        float(historical_median),
    )

    # Delay-regime weighting.
    #
    # Small delays:
    #   historical behaviour remains useful.
    #
    # Large delays:
    #   current operational delay is more important.
    #
    # This is intentionally conservative.

    if current < 15:
        current_weight = 0.70
        historical_weight = 0.30

    elif current < 45:
        current_weight = 0.75
        historical_weight = 0.25

    elif current < 90:
        current_weight = 0.85
        historical_weight = 0.15

    else:
        current_weight = 0.95
        historical_weight = 0.05

    prediction = (
        current_weight * current
        + historical_weight * historical
    )

    return round(
        max(0.0, prediction),
        1,
    )


def run_comparison():

    routes = get_all_routes()
    train_info = get_all_train_info()

    valid_routes = {}

    for train_number, route in routes.items():

        ordered = sorted(
            route,
            key=lambda stop: stop.stop_sequence,
        )

        if len(ordered) >= 3:
            valid_routes[
                train_number
            ] = ordered

    train_points = {}

    for train_number, route in valid_routes.items():

        midpoint = route[
            len(route) // 2
        ].station_code

        destination = route[-1].station_code

        train_points[
            train_number
        ] = (
            midpoint,
            destination,
        )

    pairs = []

    for train_number, (
        midpoint,
        destination,
    ) in train_points.items():

        pairs.append(
            (
                train_number,
                midpoint,
            )
        )

        pairs.append(
            (
                train_number,
                destination,
            )
        )

    rows = get_journey_delays(pairs)

    midpoint_delay = {}
    destination_delay = {}

    history = defaultdict(list)

    for row in rows:

        key = (
            row.train_number,
            row.service_date,
        )

        midpoint, destination = train_points.get(
            row.train_number,
            (None, None),
        )

        if row.station_code == midpoint:

            midpoint_delay[key] = (
                row.arrival_delay_minutes
            )

        if row.station_code == destination:

            destination_delay[key] = (
                row.arrival_delay_minutes
            )

            history[
                row.train_number
            ].append(
                (
                    row.service_date,
                    row.arrival_delay_minutes,
                )
            )

    for train_number in history:

        history[
            train_number
        ].sort(
            key=lambda item: item[0]
        )

    existing_records = []
    refined_records = []
    baseline_records = []

    for train_number in train_points:

        midpoint, destination = train_points[
            train_number
        ]

        route = valid_routes[
            train_number
        ]

        info = train_info.get(
            train_number
        )

        dates = sorted(
            set(
                key[1]
                for key in midpoint_delay
                if key[0] == train_number
            )
            &
            set(
                key[1]
                for key in destination_delay
                if key[0] == train_number
            )
        )

        for service_date in dates:

            key = (
                train_number,
                service_date,
            )

            current_delay = midpoint_delay.get(
                key
            )

            actual = destination_delay.get(
                key
            )

            if (
                current_delay is None
                or actual is None
            ):
                continue

            historical = [
                float(value)
                for row_date, value
                in history[train_number]
                if row_date < service_date
                and value is not None
            ]

            historical_median = None

            if historical:

                historical_sorted = sorted(
                    historical
                )

                n = len(
                    historical_sorted
                )

                middle = n // 2

                if n % 2 == 0:

                    historical_median = (
                        historical_sorted[
                            middle - 1
                        ]
                        +
                        historical_sorted[
                            middle
                        ]
                    ) / 2

                else:

                    historical_median = (
                        historical_sorted[
                            middle
                        ]
                    )

            # -------------------------------------------------
            # 1. CURRENT-DELAY-ONLY
            # -------------------------------------------------

            baseline = float(
                current_delay
            )

            baseline_records.append(
                {
                    "error": (
                        baseline
                        - float(actual)
                    )
                }
            )

            # -------------------------------------------------
            # 2. EXISTING PREDICTOR
            # -------------------------------------------------

            existing = predict_eta(
                train_number=train_number,
                current_station=midpoint,
                current_delay_minutes=current_delay,
                route_stops=route,
                historical_destination_delays=historical,
                train_name=(
                    info.train_name
                    if info
                    else None
                ),
                expected_destination_code=(
                    info.destination_station_code
                    if info
                    else None
                ),
            )

            existing_records.append(
                {
                    "error": (
                        existing.predicted_delay_minutes
                        - float(actual)
                    )
                }
            )

            # -------------------------------------------------
            # 3. REFINED PREDICTOR
            # -------------------------------------------------

            refined = refined_prediction(
                current_delay=float(
                    current_delay
                ),
                historical_median=(
                    historical_median
                ),
            )

            refined_records.append(
                {
                    "error": (
                        refined
                        - float(actual)
                    )
                }
            )

    baseline_metrics = calculate_metrics(
        baseline_records
    )

    existing_metrics = calculate_metrics(
        existing_records
    )

    refined_metrics = calculate_metrics(
        refined_records
    )

    print()
    print(
        "Phase 5D - Refined ETA Comparison"
    )
    print(
        "================================="
    )

    print(
        f"Evaluation journeys: "
        f"{len(existing_records):,}"
    )

    print()

    print(
        f"{'Model':<30}"
        f"{'MAE':>12}"
        f"{'RMSE':>12}"
        f"{'Bias':>12}"
    )

    print("-" * 66)

    print(
        f"{'Current delay only':<30}"
        f"{baseline_metrics[0]:>12.1f}"
        f"{baseline_metrics[1]:>12.1f}"
        f"{baseline_metrics[2]:>12.1f}"
    )

    print(
        f"{'Existing 70/30 predictor':<30}"
        f"{existing_metrics[0]:>12.1f}"
        f"{existing_metrics[1]:>12.1f}"
        f"{existing_metrics[2]:>12.1f}"
    )

    print(
        f"{'Refined delay-regime predictor':<30}"
        f"{refined_metrics[0]:>12.1f}"
        f"{refined_metrics[1]:>12.1f}"
        f"{refined_metrics[2]:>12.1f}"
    )

    print()

    if existing_metrics[0] > 0:

        improvement = (
            (
                existing_metrics[0]
                - refined_metrics[0]
            )
            / existing_metrics[0]
        ) * 100

        print(
            f"Refined vs existing MAE: "
            f"{improvement:+.1f}%"
        )

    if baseline_metrics[0] > 0:

        improvement_baseline = (
            (
                baseline_metrics[0]
                - refined_metrics[0]
            )
            / baseline_metrics[0]
        ) * 100

        print(
            f"Refined vs current-only MAE: "
            f"{improvement_baseline:+.1f}%"
        )

    print()
    print("Done.")


if __name__ == "__main__":
    run_comparison()