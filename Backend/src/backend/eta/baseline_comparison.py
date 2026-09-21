"""
Leakage-free baseline comparison for ETA prediction.

Compares:

1. Current-delay-only baseline
2. Existing historical + current-delay predictor

Uses the same chronological evaluation methodology as evaluation.py.
"""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import date
from typing import Dict, List, Optional, Sequence, Tuple

from src.backend.eta.evaluation_repository import (
    TrainInfo,
    get_all_routes,
    get_all_train_info,
    get_journey_delays,
)
from src.backend.eta.predictor import predict_eta


class MetricAccumulator:
    """Collect prediction errors and calculate standard metrics."""

    def __init__(self) -> None:
        self.errors: List[float] = []

    def add(self, error: float) -> None:
        self.errors.append(float(error))

    def mae(self) -> Optional[float]:
        if not self.errors:
            return None

        return sum(
            abs(error)
            for error in self.errors
        ) / len(self.errors)

    def rmse(self) -> Optional[float]:
        if not self.errors:
            return None

        return math.sqrt(
            sum(
                error * error
                for error in self.errors
            )
            / len(self.errors)
        )

    def bias(self) -> Optional[float]:
        if not self.errors:
            return None

        return sum(self.errors) / len(self.errors)


def run_comparison(
    limit: Optional[int] = None,
    train_numbers: Optional[Sequence[str]] = None,
) -> Dict[str, Dict[str, float]]:
    """
    Run chronological comparison between:

    - current-delay-only baseline
    - existing ETA predictor

    Historical data strictly before the evaluation date is used
    by the existing predictor.
    """

    routes = get_all_routes()

    if train_numbers:
        wanted = {
            str(train).strip()
            for train in train_numbers
        }

        routes = {
            train_number: stops
            for train_number, stops in routes.items()
            if train_number in wanted
        }

    sorted_routes = {}
    train_points = {}

    skipped_trains = 0

    for train_number in sorted(routes):

        ordered = sorted(
            routes[train_number],
            key=lambda stop: stop.stop_sequence,
        )

        if len(ordered) < 3:
            skipped_trains += 1
            continue

        midpoint = ordered[
            len(ordered) // 2
        ].station_code

        destination = ordered[-1].station_code

        if midpoint == destination:
            skipped_trains += 1
            continue

        sorted_routes[train_number] = ordered

        train_points[train_number] = (
            midpoint,
            destination,
        )

    train_info: Dict[
        str,
        TrainInfo,
    ] = get_all_train_info()

    pairs: List[
        Tuple[str, str]
    ] = []

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

    delay_rows = get_journey_delays(
        pairs
    )

    destination_history = defaultdict(list)

    midpoint_delay = {}

    actual_destination = {}

    for row in delay_rows:

        points = train_points.get(
            row.train_number
        )

        if points is None:
            continue

        midpoint, destination = points

        if row.station_code == destination:

            destination_history[
                row.train_number
            ].append(
                (
                    row.service_date,
                    row.arrival_delay_minutes,
                )
            )

            actual_destination[
                (
                    row.train_number,
                    row.service_date,
                )
            ] = row.arrival_delay_minutes

        elif row.station_code == midpoint:

            midpoint_delay[
                (
                    row.train_number,
                    row.service_date,
                )
            ] = row.arrival_delay_minutes

    for history in destination_history.values():

        history.sort(
            key=lambda item: item[0]
        )

    destination_dates = defaultdict(list)

    for (
        train_number,
        service_date,
    ) in actual_destination:

        destination_dates[
            train_number
        ].append(service_date)

    midpoint_dates = defaultdict(list)

    for (
        train_number,
        service_date,
    ) in midpoint_delay:

        midpoint_dates[
            train_number
        ].append(service_date)

    current_only = MetricAccumulator()
    predictor_model = MetricAccumulator()

    evaluated = 0
    skipped_journeys = 0

    for train_number in sorted(
        train_points
    ):

        midpoint, _ = train_points[
            train_number
        ]

        history = destination_history.get(
            train_number,
            [],
        )

        info = train_info.get(
            train_number
        )

        journey_dates = sorted(
            set(
                destination_dates.get(
                    train_number,
                    [],
                )
            )
            |
            set(
                midpoint_dates.get(
                    train_number,
                    [],
                )
            )
        )

        for service_date in journey_dates:

            current_delay = midpoint_delay.get(
                (
                    train_number,
                    service_date,
                )
            )

            actual = actual_destination.get(
                (
                    train_number,
                    service_date,
                )
            )

            if (
                current_delay is None
                or actual is None
            ):
                skipped_journeys += 1
                continue

            # -----------------------------------------------------
            # 1. CURRENT-DELAY-ONLY BASELINE
            # -----------------------------------------------------

            baseline_prediction = float(
                current_delay
            )

            baseline_error = (
                baseline_prediction
                - float(actual)
            )

            current_only.add(
                baseline_error
            )

            # -----------------------------------------------------
            # 2. EXISTING ETA PREDICTOR
            # -----------------------------------------------------

            reference = [
                value
                for row_date, value
                in history
                if row_date < service_date
            ]

            prediction = predict_eta(
                train_number=train_number,
                current_station=midpoint,
                current_delay_minutes=current_delay,
                route_stops=sorted_routes[
                    train_number
                ],
                historical_destination_delays=reference,
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

            predictor_error = (
                prediction.predicted_delay_minutes
                - float(actual)
            )

            predictor_model.add(
                predictor_error
            )

            evaluated += 1

            if (
                limit is not None
                and evaluated >= limit
            ):
                return {
                    "current_delay_only": {
                        "journeys": float(
                            len(current_only.errors)
                        ),
                        "mae_minutes": (
                            current_only.mae()
                            or 0.0
                        ),
                        "rmse_minutes": (
                            current_only.rmse()
                            or 0.0
                        ),
                        "bias_minutes": (
                            current_only.bias()
                            or 0.0
                        ),
                    },
                    "existing_predictor": {
                        "journeys": float(
                            len(
                                predictor_model.errors
                            )
                        ),
                        "mae_minutes": (
                            predictor_model.mae()
                            or 0.0
                        ),
                        "rmse_minutes": (
                            predictor_model.rmse()
                            or 0.0
                        ),
                        "bias_minutes": (
                            predictor_model.bias()
                            or 0.0
                        ),
                    },
                    "skipped_trains": float(
                        skipped_trains
                    ),
                    "skipped_journeys": float(
                        skipped_journeys
                    ),
                }

    return {
        "current_delay_only": {
            "journeys": float(
                len(current_only.errors)
            ),
            "mae_minutes": (
                current_only.mae()
                or 0.0
            ),
            "rmse_minutes": (
                current_only.rmse()
                or 0.0
            ),
            "bias_minutes": (
                current_only.bias()
                or 0.0
            ),
        },
        "existing_predictor": {
            "journeys": float(
                len(
                    predictor_model.errors
                )
            ),
            "mae_minutes": (
                predictor_model.mae()
                or 0.0
            ),
            "rmse_minutes": (
                predictor_model.rmse()
                or 0.0
            ),
            "bias_minutes": (
                predictor_model.bias()
                or 0.0
            ),
        },
        "skipped_trains": float(
            skipped_trains
        ),
        "skipped_journeys": float(
            skipped_journeys
        ),
    }


def print_report(
    results: Dict[
        str,
        Dict[str, float],
    ]
) -> None:

    current = results[
        "current_delay_only"
    ]

    predictor = results[
        "existing_predictor"
    ]

    print()
    print(
        "ETA Baseline Comparison"
    )
    print(
        "======================="
    )

    print(
        f"Evaluation journeys: "
        f"{int(current['journeys']):,}"
    )

    print()

    print(
        f"{'Model':<28}"
        f"{'MAE':>12}"
        f"{'RMSE':>12}"
        f"{'Bias':>12}"
    )

    print("-" * 64)

    print(
        f"{'Current delay only':<28}"
        f"{current['mae_minutes']:>12.1f}"
        f"{current['rmse_minutes']:>12.1f}"
        f"{current['bias_minutes']:>12.1f}"
    )

    print(
        f"{'Existing predictor':<28}"
        f"{predictor['mae_minutes']:>12.1f}"
        f"{predictor['rmse_minutes']:>12.1f}"
        f"{predictor['bias_minutes']:>12.1f}"
    )

    baseline_mae = current[
        "mae_minutes"
    ]

    predictor_mae = predictor[
        "mae_minutes"
    ]

    if baseline_mae > 0:

        mae_change = (
            (
                baseline_mae
                - predictor_mae
            )
            / baseline_mae
        ) * 100

        print()

        print(
            f"MAE change: "
            f"{mae_change:+.1f}%"
        )

    print()

    print(
        f"Skipped trains: "
        f"{int(results['skipped_trains'])}"
    )

    print(
        f"Skipped journeys: "
        f"{int(results['skipped_journeys'])}"
    )


if __name__ == "__main__":

    results = run_comparison()

    print_report(results)