"""
Offline evaluation of ETA prediction accuracy (EXPERIMENT - NOT an API).

METHOD (chronological backtest, leakage-free)
---------------------------------------------
For every eligible historical journey (train T, service date D):

  1. Route for T comes from `train_routes`; destination = final stop.
  2. Prediction point = the route's stop-count midpoint (index N // 2 of
     the ordered stops), which for N >= 3 is always a genuine intermediate
     station - never the origin or the destination.
  3. current_delay_minutes = ACTUAL arrival_delay_minutes of journey (T, D)
     at the midpoint station. This mimics the live feed the production API
     receives and is legitimately available at prediction time.
  4. Historical reference = arrival delays of train T at its DESTINATION on
     service dates STRICTLY BEFORE D.          <-- leakage control.
  5. The EXISTING predict_eta() from predictor.py makes the prediction.
     The formula is neither duplicated nor modified.
  6. Error = predicted_delay_minutes - actual destination arrival delay of
     (T, D). The date-D destination row is used ONLY as the label.

LEAKAGE ANALYSIS
----------------
| data                              | role      | why it is safe           |
|-----------------------------------|-----------|--------------------------|
| midpoint delay of (T, D)          | input     | known at prediction time |
| destination delays with date < D  | reference | strictly earlier only    |
| destination delay of (T, D)       | label     | never an input           |
| destination delays with date >= D | unused    | filtered out             |

Every journey's reference set is filtered by ITS OWN date, so bulk-loading
the data upfront cannot leak: journey (T, D) never sees rows from date D or
later. Chronology is the split - there is no random train/test split.

USAGE
-----
    python -m src.backend.eta.evaluation                 # full run
    python -m src.backend.eta.evaluation --limit 200     # quick smoke test
    python -m src.backend.eta.evaluation --train 12957   # single train

--limit takes the FIRST N eligible journeys in deterministic (train, date)
order. Useful for smoke tests, but NOT a random sample: run without --limit
for trustworthy numbers.
"""

from __future__ import annotations

import argparse
import math
from collections import defaultdict
from datetime import date
from typing import Dict, List, Optional, Sequence, Tuple

from pydantic import BaseModel, Field

from src.backend.eta.evaluation_repository import (
    TrainInfo,
    get_all_routes,
    get_all_train_info,
    get_journey_delays,
)
from src.backend.eta.predictor import RouteStop, predict_eta


# ---------------------------------------------------------------------------
# Result structures
# ---------------------------------------------------------------------------
class GroupMetrics(BaseModel):
    """Metrics for one grouping: overall, one train, or one service date."""

    key: str  # "ALL", a train number, or an ISO date string

    journeys: int = 0
    mae_minutes: Optional[float] = None
    rmse_minutes: Optional[float] = None
    # Signed mean error ("bias"): positive = predicted later than actual.
    mean_error_minutes: Optional[float] = None
    min_abs_error_minutes: Optional[float] = None
    max_abs_error_minutes: Optional[float] = None

    # Journeys where no pre-D history existed and predict_eta fell back to
    # current-delay-only (basis == "current_only").
    fallback_count: int = 0
    fallback_pct: float = 0.0


class EvaluationSummary(BaseModel):
    """Complete result of one evaluation run."""

    overall: GroupMetrics
    skipped_trains: int = 0
    skipped_journeys_missing_data: int = 0
    per_train: List[GroupMetrics] = Field(default_factory=list)
    per_date: List[GroupMetrics] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Metric accumulation
# ---------------------------------------------------------------------------
class _ErrorAccumulator:
    """Collects signed errors for one grouping; computes metrics on demand."""

    def __init__(self) -> None:
        self.errors: List[float] = []
        self.fallback_count: int = 0

    def add(self, error_minutes: float, used_fallback: bool) -> None:
        self.errors.append(error_minutes)
        if used_fallback:
            self.fallback_count += 1

    def finalize(self, key: str) -> GroupMetrics:
        n = len(self.errors)
        if n == 0:
            return GroupMetrics(key=key)

        abs_errors = [abs(e) for e in self.errors]
        return GroupMetrics(
            key=key,
            journeys=n,
            mae_minutes=round(sum(abs_errors) / n, 2),
            rmse_minutes=round(math.sqrt(sum(e * e for e in self.errors) / n), 2),
            mean_error_minutes=round(sum(self.errors) / n, 2),
            min_abs_error_minutes=round(min(abs_errors), 2),
            max_abs_error_minutes=round(max(abs_errors), 2),
            fallback_count=self.fallback_count,
            fallback_pct=round(self.fallback_count * 100.0 / n, 1),
        )


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------
def run_evaluation(
    limit: Optional[int] = None,
    train_numbers: Optional[Sequence[str]] = None,
) -> EvaluationSummary:
    """
    Run the leakage-free chronological evaluation.

    Total database cost: 3 logical queries (all routes, all train info, and
    all midpoint+destination delay rows in a few chunked VALUES joins) -
    never one query per journey.

    Args:
        limit: Stop after evaluating this many eligible journeys (first N in
            deterministic train/date order). For smoke tests only.
        train_numbers: Optionally restrict to specific trains.

    Returns:
        EvaluationSummary with overall, per-train, and per-date metrics.
    """
    # --- 1. Routes (one query) ----------------------------------------------
    routes: Dict[str, List[RouteStop]] = get_all_routes()
    if train_numbers:
        wanted = {t.strip() for t in train_numbers}
        routes = {tn: stops for tn, stops in routes.items() if tn in wanted}

    # --- 2. Per-train prediction point and destination (pure routing) -------
    # sorted_routes: train -> stops ordered by stop_sequence.
    # train_points:  train -> (midpoint_station, destination_station).
    sorted_routes: Dict[str, List[RouteStop]] = {}
    train_points: Dict[str, Tuple[str, str]] = {}
    skipped_trains = 0

    for train_number in sorted(routes):
        ordered = sorted(routes[train_number], key=lambda s: s.stop_sequence)
        n = len(ordered)
        if n < 3:
            # Fewer than 3 stops -> no genuine intermediate station exists.
            skipped_trains += 1
            continue
        midpoint_station = ordered[n // 2].station_code
        destination_station = ordered[-1].station_code
        if midpoint_station == destination_station:
            # Defensive: only possible with malformed route data.
            skipped_trains += 1
            continue
        sorted_routes[train_number] = ordered
        train_points[train_number] = (midpoint_station, destination_station)

    # --- 3. Train metadata (one query) ---------------------------------------
    train_info: Dict[str, TrainInfo] = get_all_train_info()

    # --- 4. Bulk-load midpoint + destination delays (few chunked queries) ----
    pairs: List[Tuple[str, str]] = []
    for train_number, (midpoint, destination) in train_points.items():
        pairs.append((train_number, midpoint))
        pairs.append((train_number, destination))
    delay_rows = get_journey_delays(pairs)

    # --- 5. Index the delay rows in memory -----------------------------------
    # dest_history: train -> [(service_date, delay)] (sorted later); serves as
    #   BOTH the historical reference pool and the source of labels.
    # midpoint_delay / actual_dest: keyed observations per (train, date).
    dest_history: Dict[str, List[Tuple[date, float]]] = defaultdict(list)
    midpoint_delay: Dict[Tuple[str, date], float] = {}
    actual_dest: Dict[Tuple[str, date], float] = {}

    for row in delay_rows:
        points = train_points.get(row.train_number)
        if points is None:
            continue  # pair belongs to a train skipped above
        _midpoint, destination = points
        if row.station_code == destination:
            dest_history[row.train_number].append(
                (row.service_date, row.arrival_delay_minutes)
            )
            actual_dest[(row.train_number, row.service_date)] = (
                row.arrival_delay_minutes
            )
        else:
            midpoint_delay[(row.train_number, row.service_date)] = (
                row.arrival_delay_minutes
            )

    for history in dest_history.values():
        history.sort(key=lambda item: item[0])

    # Per-train date lists, built once, so the journey loop stays O(journeys).
    dest_dates_by_train: Dict[str, List[date]] = defaultdict(list)
    for train_number, service_day in actual_dest:
        dest_dates_by_train[train_number].append(service_day)
    mid_dates_by_train: Dict[str, List[date]] = defaultdict(list)
    for train_number, service_day in midpoint_delay:
        mid_dates_by_train[train_number].append(service_day)

    # --- 6. Evaluate every eligible journey ----------------------------------
    global_acc = _ErrorAccumulator()
    per_train_accs: Dict[str, _ErrorAccumulator] = defaultdict(_ErrorAccumulator)
    per_date_accs: Dict[str, _ErrorAccumulator] = defaultdict(_ErrorAccumulator)
    skipped_journeys = 0
    evaluated = 0

    for train_number in sorted(train_points):
        midpoint, _destination = train_points[train_number]
        history = dest_history.get(train_number, [])
        info = train_info.get(train_number)

        journey_dates = sorted(
            set(dest_dates_by_train.get(train_number, []))
            | set(mid_dates_by_train.get(train_number, []))
        )

        for service_day in journey_dates:
            current_delay = midpoint_delay.get((train_number, service_day))
            actual = actual_dest.get((train_number, service_day))
            if current_delay is None or actual is None:
                # A journey needs BOTH a midpoint observation (input) and a
                # destination observation (label) to be evaluable.
                skipped_journeys += 1
                continue

            # ------------------------------------------------------------------
            # LEAKAGE CONTROL: strictly earlier service dates only.
            # The date-D destination row IS in `history` (it is the label)
            # but the strict `<` filter below guarantees it can never enter
            # the reference set, nor can any later date.
            # ------------------------------------------------------------------
            reference = [
                value for row_date, value in history if row_date < service_day
            ]
           

            prediction = predict_eta(
                train_number=train_number,
                current_station=midpoint,
                current_delay_minutes=current_delay,
                route_stops=sorted_routes[train_number],
                historical_destination_delays=reference,
                train_name=info.train_name if info else None,
                expected_destination_code=(
                    info.destination_station_code if info else None
                ),
            )

            error = prediction.predicted_delay_minutes - actual
            used_fallback = prediction.basis == "current_only"

            global_acc.add(error, used_fallback)
            per_train_accs[train_number].add(error, used_fallback)
            per_date_accs[service_day.isoformat()].add(error, used_fallback)
            evaluated += 1

            if limit is not None and evaluated >= limit:
                return _build_summary(
                    global_acc, per_train_accs, per_date_accs,
                    skipped_trains, skipped_journeys,
                )

    return _build_summary(
        global_acc, per_train_accs, per_date_accs,
        skipped_trains, skipped_journeys,
    )


def _build_summary(
    global_acc: _ErrorAccumulator,
    per_train_accs: Dict[str, _ErrorAccumulator],
    per_date_accs: Dict[str, _ErrorAccumulator],
    skipped_trains: int,
    skipped_journeys: int,
) -> EvaluationSummary:
    """Assemble the final summary from the accumulators."""
    return EvaluationSummary(
        overall=global_acc.finalize("ALL"),
        skipped_trains=skipped_trains,
        skipped_journeys_missing_data=skipped_journeys,
        per_train=[acc.finalize(tn) for tn, acc in sorted(per_train_accs.items())],
        per_date=[acc.finalize(d) for d, acc in sorted(per_date_accs.items())],
    )


# ---------------------------------------------------------------------------
# Report formatting
# ---------------------------------------------------------------------------
def _fmt(value: Optional[float]) -> str:
    """Format a metric that may be None (empty group)."""
    return f"{value:.1f}" if value is not None else "n/a"


def _fmt_signed(value: Optional[float]) -> str:
    """Format bias with an explicit sign (+/-)."""
    return f"{value:+.1f}" if value is not None else "n/a"


def format_report(summary: EvaluationSummary) -> str:
    """Render a human-readable evaluation report."""
    o = summary.overall
    lines: List[str] = []

    lines.append("ETA Accuracy Evaluation")
    lines.append("=======================")
    lines.append(f"Evaluation journeys:      {o.journeys:,}")
    lines.append(f"MAE:                      {_fmt(o.mae_minutes)} minutes")
    lines.append(f"RMSE:                     {_fmt(o.rmse_minutes)} minutes")
    lines.append(
        f"Mean error:               {_fmt_signed(o.mean_error_minutes)} minutes"
        "  (positive = over-prediction)"
    )
    lines.append(f"Min absolute error:       {_fmt(o.min_abs_error_minutes)} minutes")
    lines.append(f"Max absolute error:       {_fmt(o.max_abs_error_minutes)} minutes")
    lines.append(
        f"Historical fallback:      {o.fallback_pct:.1f}%"
        f"  ({o.fallback_count:,} journeys used current-delay-only)"
    )
    lines.append("")
    lines.append(
        "Skipped trains (no route / too short for a midpoint):     "
        f"{summary.skipped_trains:,}"
    )
    lines.append(
        "Skipped journeys (missing midpoint or destination delay): "
        f"{summary.skipped_journeys_missing_data:,}"
    )

    if o.journeys == 0:
        lines.append("")
        lines.append("No eligible journeys were evaluated - check the skip counts above.")

    if summary.per_date:
        lines.append("")
        lines.append("Per-date breakdown:")
        lines.append(
            f"{'date':<12}{'journeys':>10}{'MAE':>8}{'RMSE':>8}"
            f"{'bias':>8}{'fallback%':>11}"
        )
        for m in summary.per_date:
            lines.append(
                f"{m.key:<12}{m.journeys:>10,}{_fmt(m.mae_minutes):>8}"
                f"{_fmt(m.rmse_minutes):>8}{_fmt_signed(m.mean_error_minutes):>8}"
                f"{m.fallback_pct:>11.1f}"
            )

    if summary.per_train:
        top = sorted(summary.per_train, key=lambda m: m.journeys, reverse=True)[:15]
        lines.append("")
        lines.append(
            f"Per-train breakdown (top {len(top)} of {len(summary.per_train)}"
            " trains by journeys; full list in the summary object):"
        )
        lines.append(
            f"{'train':<12}{'journeys':>10}{'MAE':>8}{'RMSE':>8}"
            f"{'bias':>8}{'fallback%':>11}"
        )
        for m in top:
            lines.append(
                f"{m.key:<12}{m.journeys:>10,}{_fmt(m.mae_minutes):>8}"
                f"{_fmt(m.rmse_minutes):>8}{_fmt_signed(m.mean_error_minutes):>8}"
                f"{m.fallback_pct:>11.1f}"
            )

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------
def main() -> None:
    """Parse command-line options and print the evaluation report."""
    parser = argparse.ArgumentParser(
        description=(
            "Run the offline ETA accuracy evaluation against the railway_eta "
            "database (leakage-free chronological backtest)."
        )
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Evaluate only the first N eligible journeys (smoke testing).",
    )
    parser.add_argument(
        "--train",
        action="append",
        default=None,
        metavar="TRAIN_NUMBER",
        help="Restrict evaluation to one train; repeat the flag for several.",
    )
    args = parser.parse_args()

    summary = run_evaluation(limit=args.limit, train_numbers=args.train)
    print(format_report(summary))


if __name__ == "__main__":
    main()