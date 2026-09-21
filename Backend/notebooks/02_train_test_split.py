import pandas as pd

print("Loading ML dataset...")

ml_data = pd.read_csv("data/ml_train_data.csv")

print("\nDataset shape:")
print(ml_data.shape)

ml_data["date"] = pd.to_datetime(ml_data["date"])

unique_dates = sorted(
    ml_data["date"].dt.date.unique()
)

print("\nAvailable dates:")
print(unique_dates)

split_index = int(len(unique_dates) * 0.8)

train_dates = unique_dates[:split_index]
test_dates = unique_dates[split_index:]

print("\nTraining dates:")
print(train_dates)

print("\nTesting dates:")
print(test_dates)

train_data = ml_data[
    ml_data["date"].dt.date.isin(train_dates)
].copy()

test_data = ml_data[
    ml_data["date"].dt.date.isin(test_dates)
].copy()

print("\nTraining dataset shape:")
print(train_data.shape)

print("\nTesting dataset shape:")
print(test_data.shape)
print("\n--- PREPARING X AND y ---")

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

X_train = train_data[feature_columns]
y_train = train_data[target_column]

X_test = test_data[feature_columns]
y_test = test_data[target_column]

print("\nX_train shape:")
print(X_train.shape)

print("\ny_train shape:")
print(y_train.shape)

print("\nX_test shape:")
print(X_test.shape)

print("\ny_test shape:")
print(y_test.shape)

print("\nFeature columns:")
print(X_train.columns.tolist())

print("\nTarget column:")
print(y_train.name)
