"""
Station-level delay propagation analysis.

This is an analytical experiment only.

It does NOT modify the production ETA predictor.
It does NOT modify the database.
"""

from __future__ import annotations

from collections import defaultdict

from src.backend.eta.station_intelligence import (
    calculate_segment_statistics,
    normalize_delay,
)
from src.backend.eta.station_intelligence_repository import (
    get_segment_observations,
)


MIN_OBSERVATIONS = 10


def main() -> None:
    print("Loading historical segment observations...")

    observations = get_segment_observations()

    print(f"Loaded observations: {len(observations):,}")

    segment_changes = defaultdict(list)

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

        segment_key = (
            row.from_station_code,
            row.from_station_name,
            row.to_station_code,
            row.to_station_name,
        )

        segment_changes[segment_key].append(delay_change)

    print(f"Unique segments: {len(segment_changes):,}")

    results = []

    for segment, changes in segment_changes.items():
        if len(changes) < MIN_OBSERVATIONS:
            continue

        statistics = calculate_segment_statistics(changes)

        results.append(
            (
                segment,
                statistics,
            )
        )

    results.sort(
        key=lambda item: item[1].mean_change_minutes,
        reverse=True,
    )

    print(
        f"\nSegments with at least "
        f"{MIN_OBSERVATIONS} observations: {len(results):,}"
    )

    print("\nTop 30 segments by average delay increase:")
    print("-" * 120)

    print(
        f"{'FROM':<10}"
        f"{'TO':<10}"
        f"{'OBS':>6}"
        f"{'MEAN':>10}"
        f"{'MEDIAN':>10}"
        f"{'P75':>10}"
        f"{'P90':>10}"
        f"{'P95':>10}"
        f"{'MIN':>10}"
        f"{'MAX':>10}"
    )

    print("-" * 120)

    for segment, stats in results[:30]:
        (
            from_code,
            from_name,
            to_code,
            to_name,
        ) = segment

        print(
            f"{from_code:<10}"
            f"{to_code:<10}"
            f"{stats.observations:>6}"
            f"{stats.mean_change_minutes:>10.2f}"
            f"{stats.median_change_minutes:>10.2f}"
            f"{stats.p75_change_minutes:>10.2f}"
            f"{stats.p90_change_minutes:>10.2f}"
            f"{stats.p95_change_minutes:>10.2f}"
            f"{stats.min_change_minutes:>10.2f}"
            f"{stats.max_change_minutes:>10.2f}"
        )

    print("-" * 120)


if __name__ == "__main__":
    main()