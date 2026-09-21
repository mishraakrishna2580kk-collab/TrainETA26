"""
ML-based Dynamic ETA Predictor

Loads the existing XGBoost propagation model and generates
an ETA prediction from the current train position/delay and
route information.

NOTE:
The existing XGBoost model was trained with 19 features.
Four of those features are normally post-event features:
    - actual_section_minutes
    - section_delay
    - actual_dwell_minutes
    - extra_dwell_minutes

They are therefore passed as NaN during live prediction.
XGBoost supports missing numeric values.

This is an MVP integration of the existing trained model.
It should not be described as a fully leakage-safe production model.
"""

from __future__ import annotations

from datetime import datetime, date, time, timedelta
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd
import xgboost as xgb


# ============================================================
# MODEL FEATURES
# ============================================================

FEATURE_COLUMNS = [
    "arr_delay",
    "dep_delay",
    "previous_arr_delay",
    "previous_dep_delay",
    "section_distance",
    "scheduled_section_minutes",
    "actual_section_minutes",
    "section_delay",
    "scheduled_dwell_minutes",
    "actual_dwell_minutes",
    "extra_dwell_minutes",
    "scheduled_avg_speed_kmph",
    "hour",
    "day_of_week",
    "month",
    "historical_avg_arr_delay",
    "section_train_count",
    "route_progress",
    "remaining_distance",
]


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def _to_minutes(value: Any) -> Optional[float]:
    """
    Convert a time-like value into minutes from midnight.
    """

    if value is None:
        return None

    if isinstance(value, pd.Timestamp):
        return (
            value.hour * 60
            + value.minute
            + value.second / 60.0
        )

    if isinstance(value, datetime):
        return (
            value.hour * 60
            + value.minute
            + value.second / 60.0
        )

    if isinstance(value, time):
        return (
            value.hour * 60
            + value.minute
            + value.second / 60.0
        )

    if isinstance(value, str):
        value = value.strip()

        if not value:
            return None

        parsed = pd.to_datetime(value, errors="coerce")

        if pd.isna(parsed):
            return None

        return (
            parsed.hour * 60
            + parsed.minute
            + parsed.second / 60.0
        )

    return None


def _minutes_between(
    start: Any,
    end: Any,
) -> Optional[float]:
    """
    Calculate minutes between two time-like values.

    Handles overnight/cross-midnight sections.
    """

    start_minutes = _to_minutes(start)
    end_minutes = _to_minutes(end)

    if start_minutes is None or end_minutes is None:
        return None

    difference = end_minutes - start_minutes

    # Handle crossing midnight.
    if difference < 0:
        difference += 24 * 60

    return float(difference)


def _time_hour(value: Any) -> Optional[int]:
    """
    Extract hour from a time-like value.
    """

    if value is None:
        return None

    if isinstance(value, pd.Timestamp):
        return value.hour

    if isinstance(value, datetime):
        return value.hour

    if isinstance(value, time):
        return value.hour

    if isinstance(value, str):
        parsed = pd.to_datetime(value, errors="coerce")

        if pd.isna(parsed):
            return None

        return int(parsed.hour)

    return None


def _add_minutes_to_time(
    value: Any,
    minutes: float,
) -> Any:
    """
    Add minutes to a datetime/time-like value.

    Returns a datetime when the input is datetime-like.
    Returns a time when the input is time-like.
    """

    if value is None:
        return None

    if isinstance(value, datetime):
        return value + timedelta(minutes=minutes)

    if isinstance(value, pd.Timestamp):
        return value + timedelta(minutes=minutes)

    if isinstance(value, time):
        base = datetime.combine(
            date.today(),
            value,
        )

        result = base + timedelta(minutes=minutes)

        return result.time()

    if isinstance(value, str):
        parsed = pd.to_datetime(value, errors="coerce")

        if pd.isna(parsed):
            return None

        result = parsed + timedelta(minutes=minutes)

        return result.to_pydatetime()

    return None


def _safe_float(value: Any) -> Optional[float]:
    """
    Convert a value to float safely.
    """

    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


# ============================================================
# ML PREDICTOR
# ============================================================

class DynamicMLPredictor:
    """
    XGBoost-based dynamic railway ETA predictor.
    """

    def __init__(
        self,
        model_path: Optional[str | Path] = None,
    ) -> None:

        # Project root:
        # ETA/
        #   models/
        #   src/
        #
        # This file:
        # ETA/src/backend/eta/ml_predictor.py
        project_root = Path(__file__).resolve().parents[3]

        if model_path is None:
            model_path = (
                project_root
                / "models"
                / "xgboost_propagation.ubj"
            )

        self.model_path = Path(model_path)

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"XGBoost model not found: "
                f"{self.model_path}"
            )

        self.model = xgb.XGBRegressor()

        self.model.load_model(
            str(self.model_path)
        )

        # Confirm model feature names.
        self.model_feature_names = (
            self.model.get_booster().feature_names
        )

    # ========================================================
    # PREDICT
    # ========================================================

    def predict(
        self,
        *,
        train_number: str,
        current_station: str,
        current_delay_minutes: float,
        route_stops: list[Any],
        train_name: Optional[str] = None,
        service_date: Optional[Any] = None,
        historical_destination_delays: Optional[
            list[float]
        ] = None,
    ) -> dict[str, Any]:

        # ----------------------------------------------------
        # Validate route
        # ----------------------------------------------------

        if not route_stops:
            raise ValueError(
                f"No route data available for train "
                f"{train_number}."
            )

        stops = route_stops

        # ----------------------------------------------------
        # Find current station
        # ----------------------------------------------------

        current_index = None

        for index, stop in enumerate(stops):

            station_code = getattr(
                stop,
                "station_code",
                None,
            )

            if (
                station_code is not None
                and str(station_code).upper()
                == str(current_station).upper()
            ):
                current_index = index
                break

        if current_index is None:
            raise ValueError(
                f"Station '{current_station}' is not on "
                f"train {train_number}'s route."
            )

        current_stop = stops[current_index]

        remaining_stops = stops[
            current_index + 1:
        ]

        destination = stops[-1]

        # ----------------------------------------------------
        # Already at destination
        # ----------------------------------------------------

        if not remaining_stops:

            return {
                "train_number": train_number,
                "train_name": train_name,
                "current_station": (
                    current_stop.station_code
                ),
                "destination_station_code": (
                    destination.station_code
                ),
                "current_delay_minutes": float(
                    current_delay_minutes
                ),
                "predicted_propagation_minutes": 0.0,
                "predicted_delay_minutes": float(
                    current_delay_minutes
                ),
                "predicted_arrival": (
                    destination.scheduled_arrival
                ),
                "basis": "at_destination",
                "notes": [
                    "Train is already at the destination."
                ],
            }

        next_stop = remaining_stops[0]

        # ----------------------------------------------------
        # Route-derived features
        # ----------------------------------------------------

        current_distance = _safe_float(
            getattr(
                current_stop,
                "distance_km",
                None,
            )
        )

        next_distance = _safe_float(
            getattr(
                next_stop,
                "distance_km",
                None,
            )
        )

        section_distance = None

        if (
            current_distance is not None
            and next_distance is not None
        ):
            section_distance = (
                next_distance - current_distance
            )

        scheduled_section_minutes = _minutes_between(
            getattr(
                current_stop,
                "scheduled_departure",
                None,
            ),
            getattr(
                next_stop,
                "scheduled_arrival",
                None,
            ),
        )

        scheduled_dwell_minutes = _minutes_between(
            getattr(
                current_stop,
                "scheduled_arrival",
                None,
            ),
            getattr(
                current_stop,
                "scheduled_departure",
                None,
            ),
        )

        scheduled_avg_speed = None

        if (
            section_distance is not None
            and scheduled_section_minutes is not None
            and scheduled_section_minutes > 0
        ):
            scheduled_avg_speed = (
                section_distance
                / scheduled_section_minutes
                * 60.0
            )

        total_distance = _safe_float(
            getattr(
                destination,
                "distance_km",
                None,
            )
        )

        remaining_distance = None

        if (
            total_distance is not None
            and current_distance is not None
        ):
            remaining_distance = (
                total_distance - current_distance
            )

        # ----------------------------------------------------
        # Route progress
        # ----------------------------------------------------

        route_progress = (
            float(current_index)
            / float(
                max(
                    len(stops) - 1,
                    1,
                )
            )
        )

        # ----------------------------------------------------
        # Historical feature
        # ----------------------------------------------------

        historical_average = None

        if historical_destination_delays:

            valid_delays = []

            for delay in historical_destination_delays:

                value = _safe_float(delay)

                if value is not None:
                    valid_delays.append(value)

            if valid_delays:

                historical_average = (
                    sum(valid_delays)
                    / len(valid_delays)
                )

        # ----------------------------------------------------
        # Current delay
        # ----------------------------------------------------

        current_delay = float(
            current_delay_minutes
        )

        # Separate live arrival/departure delay is not
        # available, therefore current delay is used for both.
        arr_delay = current_delay
        dep_delay = current_delay

        # ----------------------------------------------------
        # Previous station fallback
        # ----------------------------------------------------

        previous_arr_delay = current_delay
        previous_dep_delay = current_delay

        # ----------------------------------------------------
        # Post-event features
        #
        # These are unavailable during live prediction.
        # Use NaN instead of None so pandas keeps numeric dtype.
        # ----------------------------------------------------

        actual_section_minutes = np.nan
        section_delay = np.nan
        actual_dwell_minutes = np.nan
        extra_dwell_minutes = np.nan

        # ----------------------------------------------------
        # Prediction date / time features
        # ----------------------------------------------------

        if service_date:

            prediction_date = pd.to_datetime(
                service_date,
                errors="coerce",
            )

            if pd.isna(prediction_date):
                prediction_date = pd.Timestamp.today()

        else:
            prediction_date = pd.Timestamp.today()

        scheduled_hour = _time_hour(
            getattr(
                current_stop,
                "scheduled_departure",
                None,
            )
        )

        if scheduled_hour is None:
            scheduled_hour = int(
                prediction_date.hour
            )

        # ----------------------------------------------------
        # Section train count
        #
        # No live database aggregate is required for this MVP.
        # Use route availability as a conservative fallback.
        # ----------------------------------------------------

        section_train_count = 1

        # ----------------------------------------------------
        # Build feature row
        # ----------------------------------------------------

        feature_values = [
            arr_delay,
            dep_delay,
            previous_arr_delay,
            previous_dep_delay,
            section_distance,
            scheduled_section_minutes,
            actual_section_minutes,
            section_delay,
            scheduled_dwell_minutes,
            actual_dwell_minutes,
            extra_dwell_minutes,
            scheduled_avg_speed,
            scheduled_hour,
            prediction_date.day_of_week,
            prediction_date.month,
            historical_average,
            section_train_count,
            route_progress,
            remaining_distance,
        ]

        feature_row = pd.DataFrame(
            [feature_values],
            columns=FEATURE_COLUMNS,
        )

        # ----------------------------------------------------
        # Force every feature to numeric.
        #
        # Any unavailable value becomes NaN.
        # XGBoost supports NaN values.
        # ----------------------------------------------------

        feature_row = feature_row.apply(
            pd.to_numeric,
            errors="coerce",
        )

        # Ensure exact feature order.
        feature_row = feature_row[
            FEATURE_COLUMNS
        ]

        # ----------------------------------------------------
        # ML prediction
        # ----------------------------------------------------

        predicted_propagation = float(
            self.model.predict(
                feature_row
            )[0]
        )

        # ----------------------------------------------------
        # Calculate final predicted delay
        # ----------------------------------------------------

        predicted_delay = (
            current_delay
            + predicted_propagation
        )

        # A delay cannot be negative.
        predicted_delay = max(
            0.0,
            predicted_delay,
        )

        # ----------------------------------------------------
        # Predicted arrival
        # ----------------------------------------------------

        scheduled_arrival = getattr(
            next_stop,
            "scheduled_arrival",
            None,
        )

        predicted_arrival = None

        if scheduled_arrival is not None:

            predicted_arrival = (
                _add_minutes_to_time(
                    scheduled_arrival,
                    predicted_delay,
                )
            )

        # ----------------------------------------------------
        # Return prediction
        # ----------------------------------------------------

        return {
            "train_number": train_number,
            "train_name": train_name,
            "current_station": (
                current_stop.station_code
            ),
            "next_station": (
                next_stop.station_code
            ),
            "destination_station_code": (
                destination.station_code
            ),
            "current_delay_minutes": round(
                current_delay,
                2,
            ),
            "predicted_propagation_minutes": round(
                predicted_propagation,
                2,
            ),
            "predicted_delay_minutes": round(
                predicted_delay,
                2,
            ),
            "scheduled_arrival": scheduled_arrival,
            "predicted_arrival": predicted_arrival,
            "route_progress": round(
                route_progress,
                4,
            ),
            "remaining_distance_km": (
                round(
                    remaining_distance,
                    2,
                )
                if remaining_distance is not None
                else None
            ),
            "basis": "xgboost_mvp",
            "model": "xgboost_propagation.ubj",
            "notes": [
                "ML prediction generated from the "
                "existing XGBoost propagation model.",
                "Four post-event model features are "
                "unavailable during live prediction "
                "and are passed as missing values.",
                "This is an MVP integration and the "
                "existing model should not be treated "
                "as fully leakage-safe production ML.",
            ],
        }