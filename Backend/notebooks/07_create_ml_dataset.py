import os
import pandas as pd


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INPUT_PATH = os.path.join(
    BASE_DIR,
    "data",
    "train_merged_Sep2024.csv"
)

OUTPUT_PATH = os.path.join(
    BASE_DIR,
    "data",
    "ml_train_data_with_ids.csv"
)


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
    "remaining_distance"
]


IDENTIFIER_COLUMNS = [
    "date",
    "train",
    "station",
    "stnSerialNumber"
]


TARGET_COLUMNS = [
    "future_arr_delay",
    "delay_propagation"
]


print("Loading merged dataset...")

df = pd.read_csv(INPUT_PATH)

print("Rows:", len(df))


print("Creating ML dataset...")

required_columns = (
    IDENTIFIER_COLUMNS
    + FEATURE_COLUMNS
    + TARGET_COLUMNS
)

missing_columns = [
    column
    for column in required_columns
    if column not in df.columns
]

if missing_columns:
    print()
    print("Missing columns:")
    for column in missing_columns:
        print("-", column)

    raise ValueError(
        "Required columns are missing from train_merged_Sep2024.csv"
    )


ml_data = df[
    required_columns
].copy()


ml_data["date"] = pd.to_datetime(
    ml_data["date"]
)


ml_data = ml_data.dropna(
    subset=TARGET_COLUMNS
)


ml_data.to_csv(
    OUTPUT_PATH,
    index=False
)


print()
print("=" * 50)
print("ML DATASET CREATED")
print("=" * 50)

print("Output:", OUTPUT_PATH)
print("Shape:", ml_data.shape)

print()
print("Columns:")

for column in ml_data.columns:
    print("-", column)

print()
print("First record:")
print(ml_data.head(1).to_string(index=False))

print("=" * 50)
