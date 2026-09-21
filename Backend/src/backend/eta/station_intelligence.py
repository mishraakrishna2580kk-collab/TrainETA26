"""
Pure station-level delay intelligence calculations.

This module contains NO database access and NO FastAPI code.

It provides:
- midnight-aware delay normalization
- consecutive-station delay propagation
- robust historical segment statistics
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import time
from statistics import median
from typing import Iterable, Optional


@dataclass(frozen=True)
class SegmentStatistics:
    """Historical delay-propagation statistics for one station segment."""

    observations: int
    mean_change_minutes: float
    median_change_minutes: float
    p75_change_minutes: float
    p90_change_minutes: float
    p95_change_minutes: float
    min_change_minutes: float
    max_change_minutes: float


def midnight_aware_clock_difference(
    scheduled: time,
    actual: time,
) -> float:
    """
    Calculate forward clock difference in minutes.

    Example:
        23:23 -> 00:14 = 51 minutes

    The calculation treats time-of-day as a 24-hour clock.
    """

    scheduled_minutes = (
        scheduled.hour * 60
        + scheduled.minute
        + scheduled.second / 60.0
    )

    actual_minutes = (
        actual.hour * 60
        + actual.minute
        + actual.second / 60.0
    )

    difference = actual_minutes - scheduled_minutes

    if difference < 0:
        difference += 24 * 60

    return difference


def normalize_delay(
    stored_delay_minutes: float,
    scheduled: Optional[time],
    actual: Optional[time],
) -> float:
    """
    Normalize a historical delay when scheduled and actual times are available.

    The historical dataset contains a very small number of records where the
    stored delay contains an extra whole number of days. When the discrepancy
    between stored delay and the midnight-aware clock difference is an exact
    whole-day offset, remove that offset.

    If either time is unavailable, return the stored delay unchanged.

    The raw database value is never modified.
    """

    if scheduled is None or actual is None:
        return float(stored_delay_minutes)

    clock_difference = midnight_aware_clock_difference(
        scheduled,
        actual,
    )

    discrepancy = float(stored_delay_minutes) - clock_difference

    day_minutes = 24 * 60

    whole_days = round(discrepancy / day_minutes)

    if whole_days != 0:
        residual = discrepancy - whole_days * day_minutes

        if abs(residual) <= 1.0:
            return float(stored_delay_minutes - whole_days * day_minutes)

    return float(stored_delay_minutes)


def percentile(values: Iterable[float], percentile_value: float) -> float:
    """
    Calculate a linear-interpolated percentile.

    percentile_value must be between 0 and 1.
    """

    ordered = sorted(float(value) for value in values)

    if not ordered:
        raise ValueError("Cannot calculate percentile of empty data.")

    if not 0.0 <= percentile_value <= 1.0:
        raise ValueError("percentile_value must be between 0 and 1.")

    if len(ordered) == 1:
        return ordered[0]

    position = percentile_value * (len(ordered) - 1)
    lower_index = int(position)
    upper_index = min(lower_index + 1, len(ordered) - 1)

    fraction = position - lower_index

    return (
        ordered[lower_index]
        + fraction * (ordered[upper_index] - ordered[lower_index])
    )


def calculate_segment_statistics(
    delay_changes: Iterable[float],
) -> SegmentStatistics:
    """Calculate robust statistics for historical segment delay changes."""

    values = [float(value) for value in delay_changes]

    if not values:
        raise ValueError("At least one delay change is required.")

    return SegmentStatistics(
        observations=len(values),
        mean_change_minutes=round(sum(values) / len(values), 2),
        median_change_minutes=round(median(values), 2),
        p75_change_minutes=round(percentile(values, 0.75), 2),
        p90_change_minutes=round(percentile(values, 0.90), 2),
        p95_change_minutes=round(percentile(values, 0.95), 2),
        min_change_minutes=round(min(values), 2),
        max_change_minutes=round(max(values), 2),
    )