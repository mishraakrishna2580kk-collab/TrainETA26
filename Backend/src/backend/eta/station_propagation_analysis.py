"""
Conditional station-level delay propagation analysis.

This is an analysis-only experiment.

It does NOT modify:
- the PostgreSQL database
- predictor.py
- the production ETA API

The goal is to determine whether delay propagation depends
on how late the train already is at the previous station.
"""

from __future__ import annotations

from collections import defaultdict
from typing import DefaultDict, List, Tuple

from src.backend.eta.station_intelligence import normalize_delay
from src.backend.eta.station_intelligence_repository import (
    get_segment_observations,
)


MIN_OBSERVATIONS = 10


def delay_bucket(delay_minutes: float) -> str:
    """Place the current delay into an interpretable bucket."""

    if delay_minutes < 0:
        return "<0"

    if delay_minutes < 15:
        return "0-15"

    if delay_minutes < 30:
        return "15-30"

    if delay_minutes < 60:
        return "30-60"

    return "60+"


def main() -> None:
    print("Loading historical segment observations...")

    observations = get_segment_observations()

    print(f"Loaded observations: {len(observations):,}")

    # Key:
    #   (from_station_code, to_station_code, delay_bucket)
    #
    # Value:
    #   list of delay changes observed on that segment
    grouped: DefaultDict[
        Tuple[str, str, str],
        List[float],
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

        bucket = delay_bucket(from_delay)

        key = (
            row.from_station_code,
            row.to_station_code,
            bucket,
        )

        grouped[key].append(delay_change)

    print(f"Unique segment/bucket groups: {len(grouped):,}")

    # ---------------------------------------------------------
    # Overall conditional statistics
    # ---------------------------------------------------------

    print("\nConditional propagation by current delay:")
    print("-" * 90)

    print(
        f"{'DELAY BUCKET':<15}"
        f"{'OBS':>10}"
        f"{'MEAN CHANGE':>18}"
        f"{'MEDIAN CHANGE':>18}"
        f"{'PCT POSITIVE':>18}"
    )

    print("-" * 90)

    bucket_order = ["<0", "0-15", "15-30", "30-60", "60+"]

    for bucket in bucket_order:
        changes: List[float] = []

        for (from_code, to_code, group_bucket), values in grouped.items():
            if group_bucket == bucket:
                changes.extend(values)

        if len(changes) < MIN_OBSERVATIONS:
            continue

        mean_change = sum(changes) / len(changes)

        ordered = sorted(changes)
        middle = len(ordered) // 2

        if len(ordered) % 2 == 0:
            median_change = (
                ordered[middle - 1] + ordered[middle]
            ) / 2
        else:
            median_change = ordered[middle]

        positive_count = sum(
            1 for change in changes if change > 0
        )

        positive_pct = (
            positive_count / len(changes)
        ) * 100

        print(
            f"{bucket:<15}"
            f"{len(changes):>10,}"
            f"{mean_change:>18.2f}"
            f"{median_change:>18.2f}"
            f"{positive_pct:>17.1f}%"
        )

    print("-" * 90)

    # ---------------------------------------------------------
    # Find segments where conditional behavior is strongest
    # ---------------------------------------------------------

    print("\nTop segment/bucket combinations by mean delay increase:")
    print("-" * 110)

    print(
        f"{'FROM':<10}"
        f"{'TO':<10}"
        f"{'BUCKET':<10}"
        f"{'OBS':>8}"
        f"{'MEAN':>12}"
        f"{'MEDIAN':>12}"
        f"{'POSITIVE':>12}"
    )

    print("-" * 110)

    candidates = []

    for (from_code, to_code, bucket), changes in grouped.items():
        if len(changes) < MIN_OBSERVATIONS:
            continue

        mean_change = sum(changes) / len(changes)

        ordered = sorted(changes)
        middle = len(ordered) // 2

        if len(ordered) % 2 == 0:
            median_change = (
                ordered[middle - 1] + ordered[middle]
            ) / 2
        else:
            median_change = ordered[middle]

        positive_pct = (
            sum(1 for change in changes if change > 0)
            / len(changes)
        ) * 100

        candidates.append(
            (
                mean_change,
                from_code,
                to_code,
                bucket,
                len(changes),
                median_change,
                positive_pct,
            )
        )

    candidates.sort(reverse=True)

    for (
        mean_change,
        from_code,
        to_code,
        bucket,
        observations_count,
        median_change,
        positive_pct,
    ) in candidates[:50]:

        print(
            f"{from_code:<10}"
            f"{to_code:<10}"
            f"{bucket:<10}"
            f"{observations_count:>8}"
            f"{mean_change:>12.2f}"
            f"{median_change:>12.2f}"
            f"{positive_pct:>11.1f}%"
        )

    print("-" * 110)


if __name__ == "__main__":
    main()