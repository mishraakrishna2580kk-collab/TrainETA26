"""Read-only exploratory analysis for the Train ETA source CSV files.

Examples
--------
python src/data/explore_data.py
python src/data/explore_data.py --timetable data/raw/timetable.csv.csv \
    --delays data/raw/train_station_delays.csv.csv

The script never writes to its input files.  It writes only a Markdown report
and PNG figures to ``reports/data_exploration`` (or ``--output-dir``).
Requires: pandas, matplotlib, seaborn.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "reports" / "data_exploration"
FALLBACK_INPUTS = {
    "timetable": Path(r"C:\Users\mishr\Desktop\ETA\timetable.csv.csv"),
    "delays": Path(r"C:\Users\mishr\Desktop\ETA\train_station_delays.csv.csv"),
}


def resolve_input(requested: Path, fallback: Path) -> Path:
    """Use a project raw-data path when present; otherwise use the supplied file."""
    if requested.exists():
        return requested
    if fallback.exists():
        return fallback
    raise FileNotFoundError(
        f"Could not find {requested} or fallback input {fallback}. "
        "Pass the raw file location explicitly."
    )


def markdown_table(frame: pd.DataFrame, index: bool = False) -> str:
    """Render a compact table without requiring the optional tabulate package."""
    display = frame.reset_index() if index else frame.copy()
    display.columns = [str(column) for column in display.columns]
    header = "| " + " | ".join(display.columns) + " |"
    divider = "| " + " | ".join(["---"] * len(display.columns)) + " |"
    rows = [
        "| " + " | ".join(str(value).replace("|", "\\|") for value in row) + " |"
        for row in display.fillna("").itertuples(index=False, name=None)
    ]
    return "\n".join([header, divider, *rows])


def count_table(**counts: int) -> pd.DataFrame:
    return pd.DataFrame({"metric": list(counts), "value": list(counts.values())})


def normalized_key(frame: pd.DataFrame, train_column: str, station_column: str) -> pd.Series:
    """Preserve identifier semantics while removing inconsequential outer spaces."""
    train = frame[train_column].astype("string").str.strip()
    station = frame[station_column].astype("string").str.strip()
    valid = train.notna() & station.notna() & train.ne("") & station.ne("")
    return (train + "|" + station).where(valid)


def time_to_hour(values: pd.Series) -> tuple[pd.Series, int]:
    parsed = pd.to_timedelta(values.astype("string"), errors="coerce")
    # Timedelta hours can exceed 23 for malformed values; valid timetable times cannot.
    valid = parsed.notna() & (parsed >= pd.Timedelta(0)) & (parsed < pd.Timedelta(days=1))
    return (parsed[valid].dt.total_seconds() // 3600).astype(int), int((~valid).sum())


def make_plots(
    timetable: pd.DataFrame,
    delay: pd.DataFrame,
    valid_distance: pd.Series,
    arrival_hours: pd.Series,
    departure_hours: pd.Series,
    overlap_counts: pd.DataFrame,
    output_dir: Path,
) -> None:
    sns.set_theme(style="whitegrid")
    figure, axes = plt.subplots(2, 3, figsize=(18, 10))

    stops = timetable.groupby("Train No").size().nlargest(15).sort_values()
    stops.plot.barh(ax=axes[0, 0], color="#4575b4")
    axes[0, 0].set(title="15 trains with most timetable records", xlabel="records", ylabel="Train No")

    route_lengths = valid_distance.groupby(timetable["Train No"]).max()
    axes[0, 1].hist(route_lengths.dropna(), bins=40, color="#74add1", edgecolor="white")
    axes[0, 1].set(title="Route-length proxy: maximum valid distance", xlabel="distance", ylabel="trains")

    station_counts = timetable["Station Code"].value_counts().head(15).sort_values()
    station_counts.plot.barh(ax=axes[0, 2], color="#f46d43")
    axes[0, 2].set(title="15 most frequent timetable stations", xlabel="records", ylabel="Station code")

    axes[1, 0].hist(arrival_hours, bins=range(25), alpha=0.7, label="arrival", color="#1a9850")
    axes[1, 0].hist(departure_hours, bins=range(25), alpha=0.6, label="departure", color="#d73027")
    axes[1, 0].set(title="Arrival and departure hour distribution", xlabel="hour of day", ylabel="records")
    axes[1, 0].legend()

    delay_station_counts = delay["station_code"].value_counts().head(15).sort_values()
    delay_station_counts.plot.barh(ax=axes[1, 1], color="#8073ac")
    axes[1, 1].set(title="15 most frequent delay stations", xlabel="records", ylabel="Station code")

    overlap_counts.set_index("set")["unique train-station keys"].plot.bar(
        ax=axes[1, 2], color=["#66c2a5", "#fc8d62", "#8da0cb"]
    )
    axes[1, 2].set(title="Train-station key overlap", xlabel="", ylabel="unique keys")
    axes[1, 2].tick_params(axis="x", rotation=20)

    figure.tight_layout()
    figure.savefig(output_dir / "coverage_and_time_patterns.png", dpi=160)
    plt.close(figure)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timetable", type=Path, default=ROOT / "data/raw/timetable.csv.csv")
    parser.add_argument("--delays", type=Path, default=ROOT / "data/raw/train_station_delays.csv.csv")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    timetable_path = resolve_input(args.timetable, FALLBACK_INPUTS["timetable"])
    delay_path = resolve_input(args.delays, FALLBACK_INPUTS["delays"])
    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    # dtype="string" prevents identifiers (including leading zeroes) being altered on read.
    # ``keep_default_na=False`` keeps literal values such as ``NA`` visible so
    # the quality checks can distinguish them from genuinely blank cells.
    timetable = pd.read_csv(timetable_path, dtype="string", keep_default_na=False)
    delay = pd.read_csv(delay_path, dtype="string", keep_default_na=False)

    sequence_raw = timetable["SEQ"].str.strip()
    distance_raw = timetable["Distance"].str.strip()
    seq_missing = sequence_raw.eq("")
    distance_missing = distance_raw.eq("")
    sequence = pd.to_numeric(sequence_raw, errors="coerce")
    distance = pd.to_numeric(distance_raw, errors="coerce")
    seq_invalid = ~seq_missing & (sequence.isna() | (sequence < 1) | (sequence % 1 != 0))
    distance_invalid = ~distance_missing & (distance.isna() | (distance < 0))
    valid_distance = distance.where(~(distance_missing | distance_invalid))
    arrival_hours, invalid_arrival_times = time_to_hour(timetable["Arrival time"])
    departure_hours, invalid_departure_times = time_to_hour(timetable["Departure Time"])

    timetable_key = normalized_key(timetable, "Train No", "Station Code")
    delay_key = normalized_key(delay, "train_number", "station_code")
    timetable_keys = set(timetable_key.dropna())
    delay_keys = set(delay_key.dropna())
    shared_keys = timetable_keys & delay_keys

    timetable_dupes = timetable_key.duplicated(keep=False) & timetable_key.notna()
    delay_dupes = delay_key.duplicated(keep=False) & delay_key.notna()
    route_lengths = valid_distance.groupby(timetable["Train No"]).max()
    stops_per_train = timetable.groupby("Train No").size()

    overview = count_table(
        timetable_rows=len(timetable),
        timetable_trains=timetable["Train No"].nunique(),
        timetable_stations=timetable["Station Code"].nunique(),
        delay_rows=len(delay),
        delay_trains=delay["train_number"].nunique(),
        delay_stations=delay["station_code"].nunique(),
    )
    quality = count_table(
        missing_seq=int(seq_missing.sum()),
        invalid_seq=int(seq_invalid.sum()),
        missing_distance=int(distance_missing.sum()),
        invalid_distance=int(distance_invalid.sum()),
        invalid_arrival_times=invalid_arrival_times,
        invalid_departure_times=invalid_departure_times,
        timetable_duplicate_rows=int(timetable_dupes.sum()),
        timetable_distinct_duplicate_keys=int(timetable_key[timetable_dupes].nunique()),
        delay_duplicate_rows=int(delay_dupes.sum()),
        delay_distinct_duplicate_keys=int(delay_key[delay_dupes].nunique()),
    )
    route_summary = route_lengths.describe(percentiles=[0.25, 0.5, 0.75, 0.95]).round(2).rename("maximum valid distance").to_frame()
    stop_summary = stops_per_train.describe(percentiles=[0.25, 0.5, 0.75, 0.95]).round(2).rename("timetable records per train").to_frame()
    overlap = pd.DataFrame(
        {
            "set": ["shared", "timetable only", "delay only"],
            "unique train-station keys": [
                len(shared_keys),
                len(timetable_keys - delay_keys),
                len(delay_keys - timetable_keys),
            ],
        }
    )
    overlap["percentage of timetable keys"] = (overlap["unique train-station keys"] / len(timetable_keys) * 100).round(2)
    overlap["percentage of delay keys"] = (overlap["unique train-station keys"] / len(delay_keys) * 100).round(2)

    report = [
        "# Train ETA exploratory data analysis",
        "",
        "## Inputs",
        "",
        f"- Timetable (read only): `{timetable_path}`",
        f"- Delays (read only): `{delay_path}`",
        "",
        "## Coverage overview",
        "",
        markdown_table(overview),
        "",
        "## Route length and stops per train",
        "",
        "Route length is the maximum non-negative numeric `Distance` per train; it is a proxy until distance anomalies are corrected.",
        "",
        markdown_table(route_summary, index=True),
        "",
        markdown_table(stop_summary, index=True),
        "",
        "## Missing, invalid, and duplicate values",
        "",
        "`SEQ` is invalid when it is non-numeric, less than one, or non-integral. `Distance` is invalid when it is non-numeric or negative. Time values must be `00:00:00` through `23:59:59`.",
        "",
        markdown_table(quality),
        "",
        "## Train-station overlap",
        "",
        "Keys use trimmed string identifiers: `Train No|Station Code` and `train_number|station_code`. No input field is changed.",
        "",
        markdown_table(overlap),
        "",
        "## Figures",
        "",
        "- `coverage_and_time_patterns.png`: busiest trains and stations, route-length distribution, arrival/departure hours, and key overlap.",
    ]
    report_path = output_dir / "summary.md"
    report_path.write_text("\n".join(report) + "\n", encoding="utf-8")
    make_plots(timetable, delay, valid_distance, arrival_hours, departure_hours, overlap, output_dir)
    print(f"Wrote read-only EDA report to {report_path}")
    print(f"Wrote plots to {output_dir / 'coverage_and_time_patterns.png'}")


if __name__ == "__main__":
    main()
