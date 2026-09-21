import pandas as pd
import numpy as np

print("Loading datasets...")

edges = pd.read_csv("data/IRN_edges.csv")
delays = pd.read_csv("data/train_routes_delays_Sep2024.csv")
routes = pd.read_csv("data/train_routes_Sep2024.csv")

print("\nIRN Edges:")
print(edges.shape)
print(edges.columns.tolist())

print("\nTrain Delays:")
print(delays.shape)
print(delays.columns.tolist())

print("\nTrain Routes:")
print(routes.shape)
print(routes.columns.tolist())

print("\nAll datasets loaded successfully!")

print("\n--- DELAY DATA SAMPLE ---")
print(delays.head())

print("\n--- ROUTE DATA SAMPLE ---")
print(routes.head())

print("\n--- EDGE DATA SAMPLE ---")
print(edges.head())

print("\n--- MISSING VALUES ---")
print("\nDelays:")
print(delays.isnull().sum())

print("\nRoutes:")
print(routes.isnull().sum())

print("\nEdges:")
print(edges.isnull().sum())

print("\n--- DATA TYPES ---")
print("\nDelays:")
print(delays.dtypes)

print("\nRoutes:")
print(routes.dtypes)

print("\nEdges:")
print(edges.dtypes)

print("\n--- DATA QUALITY CHECKS ---")

print("\nNegative arrival delays:")
print((delays["arr_delay"] < 0).sum())

print("\nNegative departure delays:")
print((delays["dep_delay"] < 0).sum())

print("\nNegative route distances:")
print((routes["distance"] < 0).sum())

print("\nNegative edge distances:")
print((edges["distance"] < 0).sum())

print("\nDuplicate delay rows:")
print(delays.duplicated().sum())

print("\nDuplicate route rows:")
print(routes.duplicated().sum())

print("\nDuplicate edge rows:")
print(edges.duplicated().sum())

print("\nUnique trains in delay data:")
print(delays["train"].nunique())

print("\nUnique trains in route data:")
print(routes["trainNumber"].nunique())

print("\nUnique stations in delay data:")
print(delays["station"].nunique())

print("\nUnique stations in route data:")
print(routes["station_code"].nunique())

print("\n--- NEGATIVE EDGE DISTANCE ---")
print(edges[edges["distance"] < 0])

print("\n--- STATIONS ONLY IN DELAY DATA ---")
delay_stations = set(delays["station"])
route_stations = set(routes["station_code"])

print(sorted(delay_stations - route_stations))

print("\n--- STATIONS ONLY IN ROUTE DATA ---")
print(sorted(route_stations - delay_stations))

print("\n--- TMA STATION DETAILS ---")
print(delays[delays["station"] == "TMA"].head(20))

print("\n--- SNNR AND YPR IN ROUTE DATA ---")
print(routes[routes["station_code"].isin(["SNNR", "YPR"])])

print("\n--- SNNR AND YPR IN EDGE DATA ---")
print(edges[edges["from"].isin(["SNNR", "YPR"]) | edges["to"].isin(["SNNR", "YPR"])])

print("\n--- SNNR/YPR ROUTE DETAILS ---")

print("\nSNNR:")
print(routes[routes["station_code"] == "SNNR"][
    ["trainNumber", "trainName", "stnSerialNumber", "station_code", "distance"]
].to_string(index=False))

print("\nYPR:")
print(routes[routes["station_code"] == "YPR"][
    ["trainNumber", "trainName", "stnSerialNumber", "station_code", "distance"]
].to_string(index=False))

print("\n--- NEGATIVE EDGE CORRECTION CHECK ---")

negative_edge = edges[
    (edges["from"] == "SNNR") &
    (edges["to"] == "YPR")
]

print("Original distance:")
print(negative_edge["distance"].iloc[0])

print("Reference route distance for Train 16546:")
print(
    routes[
        (routes["trainNumber"] == 16546) &
        (routes["station_code"] == "YPR")
    ]["distance"].iloc[0]
)

print("Expected corrected edge distance: 624 km")

print("\n--- CREATING CLEANED EDGE DATA ---")

edges_clean = edges.copy()

edges_clean.loc[
    (edges_clean["from"] == "SNNR") &
    (edges_clean["to"] == "YPR"),
    "distance"
] = 624

edges_clean.to_csv(
    "data/IRN_edges_clean.csv",
    index=False
)

print("Original edge rows:", len(edges))
print("Cleaned edge rows:", len(edges_clean))
print("Negative distances after cleaning:")
print((edges_clean["distance"] < 0).sum())

print("Cleaned dataset saved as: data/IRN_edges_clean.csv")

print("\n--- MERGING DELAY AND ROUTE DATA ---")

# ---------------------------------------------------------
# SAFE MERGE USING STATION OCCURRENCE
# ---------------------------------------------------------

print("\n--- PREPARING SAFE MERGE ---")

# Create station occurrence within each train's route
# Remove one known corrupted route record
routes = routes[
    ~(
        (routes["trainNumber"] == 16545) &
        (routes["station_code"] == "CHKE")
    )
].copy()
routes["_station_occurrence"] = (
    routes.groupby(
        ["trainNumber", "station_code"]
    ).cumcount()
)

# Create station occurrence separately for EACH train and DATE
delays["_station_occurrence"] = (
    delays.groupby(
        ["train", "date", "station"]
    ).cumcount()
)

merged = delays.merge(
    routes,
    left_on=[
        "train",
        "station",
        "_station_occurrence"
    ],
    right_on=[
        "trainNumber",
        "station_code",
        "_station_occurrence"
    ],
    how="left",
    validate="many_to_one"
)

print("Safe merge completed.")
print("Merged dataset shape:", merged.shape)

print("\nMissing route information after merge:")
print(
    merged[
        [
            "trainName",
            "station_name",
            "distance",
            "arrivalTime",
            "departureTime"
        ]
    ].isnull().sum()
)

merged = merged.drop(
    columns=["_station_occurrence"]
)

merged.to_csv(
    "data/train_merged_Sep2024.csv",
    index=False
)

print("\nMerged dataset saved as: data/train_merged_Sep2024.csv")

print("\n--- CONVERTING TIME COLUMNS ---")

merged["date"] = pd.to_datetime(merged["date"])

merged["sch_arr_dt"] = pd.to_datetime(
    merged["date"].dt.strftime("%Y-%m-%d") + " " + merged["sch_arr"]
)

merged["act_arr_dt"] = pd.to_datetime(
    merged["date"].dt.strftime("%Y-%m-%d") + " " + merged["act_arr"]
)

merged["sch_dep_dt"] = pd.to_datetime(
    merged["date"].dt.strftime("%Y-%m-%d") + " " + merged["sch_dep"]
)

merged["act_dep_dt"] = pd.to_datetime(
    merged["date"].dt.strftime("%Y-%m-%d") + " " + merged["act_dep"]
)

# Sort before correcting overnight timestamps
merged = merged.sort_values(
    ["train", "date", "stnSerialNumber"]
).reset_index(drop=True)

print("\n--- CHECKING STATION SEQUENCE ---")

merged["distance_change"] = (
    merged["distance"] -
    merged.groupby(["train", "date"])["distance"].shift(1)
)

negative_distance_changes = merged[
    merged["distance_change"] < 0
]

print("\nNegative distance changes:")
print(len(negative_distance_changes))

if len(negative_distance_changes) > 0:
    print("\nSample negative distance changes:")
    print(
    negative_distance_changes[
        [
            "train",
            "date",
            "stnSerialNumber",
            "station",
            "distance",
            "distance_change"
        ]
    ].head(30).to_string(index=False)
)

print("\n--- TRAIN 16545 ROUTE AROUND CHKE ---")

print(
    merged[
        (merged["train"] == 16545) &
        (merged["stnSerialNumber"].between(25, 33))
    ][
        [
            "stnSerialNumber",
            "station",
            "station_name",
            "distance"
        ]
    ].drop_duplicates()
    .sort_values("stnSerialNumber")
    .to_string(index=False)
)

# # Correct timestamps across midnight

# def correct_sequence(time_values, base_date):

#     minutes = (
#         pd.to_datetime(time_values, format="%I:%M %p").dt.hour * 60
#         + pd.to_datetime(time_values, format="%I:%M %p").dt.minute
#     )

#     corrected = []

#     day_offset = 0
#     previous_minutes = None

#     for minute in minutes:

#         minute = int(minute)

#         if previous_minutes is not None and minute < previous_minutes:
#             day_offset += 1

#         corrected_time = (
#             pd.Timestamp(base_date)
#             + pd.Timedelta(days=day_offset)
#             + pd.Timedelta(minutes=minute)
#         )

#         corrected.append(corrected_time)

#         previous_minutes = minute

#     return corrected


# for (train, date), group in merged.groupby(["train", "date"]):

#     idx = group.index
#     base_date = date

#     merged.loc[idx, "sch_arr_dt"] = correct_sequence(
#         group["sch_arr"],
#         base_date
#     )

#     merged.loc[idx, "sch_dep_dt"] = correct_sequence(
#         group["sch_dep"],
#         base_date
#     )

#     merged.loc[idx, "act_arr_dt"] = correct_sequence(
#         group["act_arr"],
#         base_date
#     )

#     merged.loc[idx, "act_dep_dt"] = correct_sequence(
#         group["act_dep"],
#         base_date
#     )

# print("\nConverted time columns:")
# print(
#     merged[
#         [
#             "date",
#             "sch_arr",
#             "sch_arr_dt",
#             "act_arr",
#             "act_arr_dt",
#             "sch_dep",
#             "sch_dep_dt",
#             "act_dep",
#             "act_dep_dt"
#         ]
#     ].head()
# )

# print("\n--- CREATING PREVIOUS STATION FEATURES ---")

# merged = merged.sort_values(
#     ["train", "date", "stnSerialNumber"]
# ).reset_index(drop=True)

# ---------------------------------------------------------
# CORRECT TIMESTAMPS ACROSS MIDNIGHT
# ---------------------------------------------------------

def correct_times_fast(df, arr_col, dep_col):

    arr_minutes = (
        df[arr_col].dt.hour * 60
        + df[arr_col].dt.minute
        + df[arr_col].dt.second / 60
    )

    dep_minutes = (
        df[dep_col].dt.hour * 60
        + df[dep_col].dt.minute
        + df[dep_col].dt.second / 60
    )

    corrected_arr = arr_minutes.to_numpy(dtype=float, copy=True)
    corrected_dep = dep_minutes.to_numpy(dtype=float, copy=True)

    grouped = df.groupby(
        ["train", "date"],
        sort=False
    ).indices

    for idx in grouped.values():

        idx = np.asarray(idx)

        arr = arr_minutes.iloc[idx].to_numpy()
        dep = dep_minutes.iloc[idx].to_numpy()

        events = np.empty(len(idx) * 2)

        events[0::2] = arr
        events[1::2] = dep

        day_offsets = np.cumsum(
            np.r_[0, (np.diff(events) < 0) * 1440]
        )

        corrected_events = events + day_offsets

        corrected_arr[idx] = corrected_events[0::2]
        corrected_dep[idx] = corrected_events[1::2]

    base_dates = df["date"].dt.normalize()

    corrected_arr = (
        base_dates
        + pd.to_timedelta(corrected_arr, unit="m")
    )

    corrected_dep = (
        base_dates
        + pd.to_timedelta(corrected_dep, unit="m")
    )

    return corrected_arr, corrected_dep


print("\nCorrecting scheduled timestamps...")

merged["sch_arr_dt"], merged["sch_dep_dt"] = correct_times_fast(
    merged,
    "sch_arr_dt",
    "sch_dep_dt"
)


print("Correcting actual timestamps...")

merged["act_arr_dt"], merged["act_dep_dt"] = correct_times_fast(
    merged,
    "act_arr_dt",
    "act_dep_dt"
)
print("Timestamp correction completed.")

# ---------------------------------------------------------
# CREATE PREVIOUS STATION AND SECTION FEATURES
# ---------------------------------------------------------

print("\n--- CREATING PREVIOUS STATION FEATURES ---")

merged["previous_station"] = (
    merged.groupby(["train", "date"])["station"]
    .shift(1)
)

merged["previous_arr_delay"] = (
    merged.groupby(["train", "date"])["arr_delay"]
    .shift(1)
)

merged["previous_dep_delay"] = (
    merged.groupby(["train", "date"])["dep_delay"]
    .shift(1)
)

merged["previous_sch_dep_dt"] = (
    merged.groupby(["train", "date"])["sch_dep_dt"]
    .shift(1)
)

merged["previous_act_dep_dt"] = (
    merged.groupby(["train", "date"])["act_dep_dt"]
    .shift(1)
)

merged["section_distance"] = (
    merged["distance"] -
    merged.groupby(["train", "date"])["distance"].shift(1)
)

print("Previous station features created.")

merged["scheduled_section_minutes"] = (
    merged["sch_arr_dt"] -
    merged["previous_sch_dep_dt"]
).dt.total_seconds() / 60

merged["actual_section_minutes"] = (
    merged["act_arr_dt"] -
    merged["previous_act_dep_dt"]
).dt.total_seconds() / 60

merged["section_delay"] = (
    merged["actual_section_minutes"] -
    merged["scheduled_section_minutes"]
)

print("\nSection features:")
print(
    merged[
        [
            "train",
            "date",
            "station",
            "previous_station",
            "section_distance",
            "scheduled_section_minutes",
            "actual_section_minutes",
            "section_delay"
        ]
    ].head(15).to_string(index=False)
)

print("\n--- CHECKING OVERNIGHT TIMESTAMP ISSUES ---")

negative_scheduled_sections = merged[
    merged["scheduled_section_minutes"] < 0
]

negative_actual_sections = merged[
    merged["actual_section_minutes"] < 0
]

print("\nNegative scheduled section times:")
print(len(negative_scheduled_sections))

print("\nNegative actual section times:")
print(len(negative_actual_sections))

if len(negative_scheduled_sections) > 0:
    print("\nSample negative scheduled sections:")
    print(
        negative_scheduled_sections[
            [
                "train",
                "date",
                "previous_station",
                "station",
                "previous_sch_dep_dt",
                "sch_arr_dt",
                "scheduled_section_minutes"
            ]
        ].head(20).to_string(index=False)
    )

if len(negative_actual_sections) > 0:
    print("\nSample negative actual sections:")
    print(
        negative_actual_sections[
            [
                "train",
                "date",
                "previous_station",
                "station",
                "previous_act_dep_dt",
                "act_arr_dt",
                "actual_section_minutes"
            ]
        ].head(20).to_string(index=False)
    )
print("\n--- ANALYZING NEGATIVE SCHEDULED SECTIONS ---")

negative_scheduled = merged[
    merged["scheduled_section_minutes"] < 0
].copy()

negative_scheduled["raw_sch_arr_time"] = negative_scheduled["sch_arr"]
negative_scheduled["raw_sch_dep_time"] = negative_scheduled["sch_dep"]

print("\nNegative scheduled sections by size:")

print(
    negative_scheduled["scheduled_section_minutes"]
    .describe()
)

print("\nSample negative scheduled sections with raw times:")

print(
    negative_scheduled[
        [
            "train",
            "date",
            "stnSerialNumber",
            "previous_station",
            "station",
            "sch_arr",
            "sch_dep",
            "previous_sch_dep_dt",
            "sch_arr_dt",
            "scheduled_section_minutes"
        ]
    ].head(30).to_string(index=False)
)

print("\n--- CREATING DWELL TIME FEATURES ---")

merged["scheduled_dwell_minutes"] = (
    merged["sch_dep_dt"] -
    merged["sch_arr_dt"]
).dt.total_seconds() / 60

merged["actual_dwell_minutes"] = (
    merged["act_dep_dt"] -
    merged["act_arr_dt"]
).dt.total_seconds() / 60

merged["extra_dwell_minutes"] = (
    merged["actual_dwell_minutes"] -
    merged["scheduled_dwell_minutes"]
)

print("\nDwell time features:")
print(
    merged[
        [
            "train",
            "date",
            "station",
            "scheduled_dwell_minutes",
            "actual_dwell_minutes",
            "extra_dwell_minutes"
        ]
    ].head(15).to_string(index=False)
)
print("\n--- CREATING SCHEDULED SPEED FEATURE ---")

merged["scheduled_avg_speed_kmph"] = (
    merged["section_distance"] /
    merged["scheduled_section_minutes"]
) * 60

merged.loc[
    merged["scheduled_section_minutes"] <= 0,
    "scheduled_avg_speed_kmph"
] = pd.NA

print("\nScheduled average speed:")
print(
    merged[
        [
            "train",
            "date",
            "station",
            "previous_station",
            "section_distance",
            "scheduled_section_minutes",
            "scheduled_avg_speed_kmph"
        ]
    ].head(15).to_string(index=False)
)
print("\n--- CREATING TIME FEATURES ---")

merged["hour"] = merged["sch_arr_dt"].dt.hour

merged["day_of_week"] = merged["date"].dt.dayofweek

merged["month"] = merged["date"].dt.month

print("\nTime features:")
print(
    merged[
        [
            "train",
            "date",
            "station",
            "sch_arr_dt",
            "hour",
            "day_of_week",
            "month"
        ]
    ].head(15).to_string(index=False)
)

print("\n--- CREATING ROUTE PROGRESS FEATURES ---")

merged["total_route_distance"] = merged.groupby(
    ["train", "date"]
)["distance"].transform("max")

merged["route_progress"] = (
    merged["distance"] /
    merged["total_route_distance"]
)

merged["remaining_distance"] = (
    merged["total_route_distance"] -
    merged["distance"]
)
print("\n--- CHECKING ROUTE PROGRESS ---")

print(
    "Route progress below 0:",
    (merged["route_progress"] < 0).sum()
)

print(
    "Route progress above 1:",
    (merged["route_progress"] > 1).sum()
)

print(
    "Missing route progress:",
    merged["route_progress"].isna().sum()
)

print("\nRoute progress features:")
print(
    merged[
        [
            "train",
            "date",
            "station",
            "distance",
            "total_route_distance",
            "route_progress",
            "remaining_distance"
        ]
    ].head(15).to_string(index=False)
)

print("\n--- CREATING CONGESTION FEATURE ---")

edges_clean["section_key"] = (
    edges_clean["from"] + "_" + edges_clean["to"]
)

edges_clean["reverse_section_key"] = (
    edges_clean["to"] + "_" + edges_clean["from"]
)

edge_lookup = {}

for _, row in edges_clean.iterrows():
    edge_lookup[row["section_key"]] = row["ntrains"]
    edge_lookup[row["reverse_section_key"]] = row["ntrains"]

merged["section_key"] = (
    merged["previous_station"].fillna("") +
    "_" +
    merged["station"].fillna("")
)

merged["section_train_count"] = merged["section_key"].map(
    edge_lookup
)

print("\nCongestion features:")
print(
    merged[
        [
            "train",
            "date",
            "station",
            "previous_station",
            "section_key",
            "section_train_count"
        ]
    ].head(15).to_string(index=False)
)

print("\n--- CREATING HISTORICAL DELAY FEATURE ---")

merged["historical_avg_arr_delay"] = (
    merged.groupby(["train", "station"])["arr_delay"]
    .transform(lambda x: x.shift(1).expanding().mean())
)

print("\nHistorical delay feature:")
print(
    merged[
        [
            "train",
            "date",
            "station",
            "arr_delay",
            "historical_avg_arr_delay"
        ]
    ].head(20).to_string(index=False)
)

print("\n--- CREATING ML TARGET ---")

merged["future_arr_delay"] = (
    merged.groupby(["train", "date"])["arr_delay"].shift(-1)
)
print("\n--- CREATING DELAY PROPAGATION TARGET ---")

merged["delay_propagation"] = (
    merged["future_arr_delay"] -
    merged["arr_delay"]
)

print("\nDelay propagation:")
print(
    merged[
        [
            "train",
            "date",
            "station",
            "arr_delay",
            "future_arr_delay",
            "delay_propagation"
        ]
    ].head(20).to_string(index=False)
)

print("\nML target:")
print(
    merged[
        [
            "train",
            "date",
            "station",
            "arr_delay",
            "future_arr_delay"
        ]
    ].head(20).to_string(index=False)
)

print("\n--- CREATING FINAL ML DATASET ---")

feature_columns = [
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

target_column = "future_arr_delay"
propagation_target = "delay_propagation"

ml_data = merged[
    [
        "date",
        "train",
        "station",
        "stnSerialNumber"
    ]
    + feature_columns
    + [
        target_column,
        propagation_target
    ]
].copy()

ml_data = ml_data.dropna(
    subset=[
        target_column,
        propagation_target
    ]
)

print("\nML dataset shape:")
print(ml_data.shape)

print("\nML features:")
print(feature_columns)

print("\nTarget:")
print(target_column)

print("\nMissing values:")
print(
    ml_data.isnull().sum()
)
print("\n--- SAVING ML DATASET ---")

ml_data.to_csv(
    "data/ml_train_data.csv",
    index=False
)

print("\nML dataset saved successfully!")
print("File: data/ml_train_data.csv")
