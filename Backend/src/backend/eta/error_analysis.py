"""
Phase 5C: Robust ETA evaluation.

Analyses the existing predictor while separating normal journeys
from extreme disruption/outlier journeys.
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


def metrics(records):

    if not records:
        return 0.0, 0.0, 0.0

    errors = [
        r["error"]
        for r in records
    ]

    mae = sum(
        abs(x)
        for x in errors
    ) / len(errors)

    rmse = math.sqrt(
        sum(
            x * x
            for x in errors
        ) / len(errors)
    )

    bias = sum(errors) / len(errors)

    return mae, rmse, bias


def run_analysis():

    routes = get_all_routes()
    train_info = get_all_train_info()

    valid_routes = {}

    for train_number, route in routes.items():

        route = sorted(
            route,
            key=lambda x: x.stop_sequence,
        )

        if len(route) >= 3:
            valid_routes[
                train_number
            ] = route

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

        history[train_number].sort(
            key=lambda x: x[0]
        )

    records = []

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
                value
                for row_date, value
                in history[train_number]
                if row_date < service_date
            ]

            prediction = predict_eta(
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

            predicted = (
                prediction.predicted_delay_minutes
            )

            error = (
                float(predicted)
                - float(actual)
            )

            records.append(
                {
                    "train": train_number,
                    "date": str(service_date),
                    "current": float(current_delay),
                    "actual": float(actual),
                    "predicted": float(predicted),
                    "error": error,
                }
            )

    print()
    print(
        "Phase 5C - Robust ETA Evaluation"
    )
    print(
        "================================"
    )

    print(
        f"Total journeys: {len(records):,}"
    )

    overall = metrics(records)

    print()
    print("ALL JOURNEYS")
    print(
        f"MAE   : {overall[0]:.1f} min"
    )
    print(
        f"RMSE  : {overall[1]:.1f} min"
    )
    print(
        f"Bias  : {overall[2]:+.1f} min"
    )

    print()
    print(
        "NORMAL JOURNEYS"
    )
    print(
        "Actual destination delay <= 180 min"
    )

    normal = [
        r
        for r in records
        if r["actual"] <= 180
    ]

    normal_metrics = metrics(normal)

    print(
        f"Journeys: {len(normal):,}"
    )
    print(
        f"MAE    : {normal_metrics[0]:.1f} min"
    )
    print(
        f"RMSE   : {normal_metrics[1]:.1f} min"
    )
    print(
        f"Bias   : {normal_metrics[2]:+.1f} min"
    )

    print()
    print(
        "EXTREME JOURNEYS"
    )
    print(
        "Actual destination delay > 180 min"
    )

    extreme = [
        r
        for r in records
        if r["actual"] > 180
    ]

    extreme_metrics = metrics(extreme)

    print(
        f"Journeys: {len(extreme):,}"
    )
    print(
        f"MAE    : {extreme_metrics[0]:.1f} min"
    )
    print(
        f"RMSE   : {extreme_metrics[1]:.1f} min"
    )
    print(
        f"Bias   : {extreme_metrics[2]:+.1f} min"
    )

    print()
    print(
        "LARGE PREDICTION ERRORS"
    )

    for threshold in [
        30,
        60,
        120,
        180,
        300,
    ]:

        count = sum(
            1
            for r in records
            if abs(r["error"]) > threshold
        )

        percentage = (
            count / len(records)
        ) * 100

        print(
            f"Error > {threshold:>3} min:"
            f" {count:>6,}"
            f" ({percentage:>5.1f}%)"
        )

    print()
    print("Done.")


if __name__ == "__main__":
    run_analysis()