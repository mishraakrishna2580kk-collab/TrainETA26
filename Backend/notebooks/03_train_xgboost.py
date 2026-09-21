# import pandas as pd
# from xgboost import XGBRegressor

import pandas as pd
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

print("Loading ML dataset...")

ml_data = pd.read_csv("data/ml_train_data.csv")

ml_data["date"] = pd.to_datetime(ml_data["date"])

unique_dates = sorted(
    ml_data["date"].dt.date.unique()
)

split_index = int(len(unique_dates) * 0.8)

train_dates = unique_dates[:split_index]
test_dates = unique_dates[split_index:]

train_data = ml_data[
    ml_data["date"].dt.date.isin(train_dates)
].copy()

test_data = ml_data[
    ml_data["date"].dt.date.isin(test_dates)
].copy()

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

print("\nTraining XGBoost model...")

model = XGBRegressor(
    n_estimators=300,
    max_depth=8,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    n_jobs=-1,
    random_state=42
)

model.fit(
    X_train,
    y_train
)

print("\nModel training completed!")
print("\n--- EVALUATING MODEL ---")

predictions = model.predict(X_test)

mae = mean_absolute_error(
    y_test,
    predictions
)

rmse = mean_squared_error(
    y_test,
    predictions
) ** 0.5

r2 = r2_score(
    y_test,
    predictions
)

print("\nModel Performance:")
print(f"MAE  : {mae:.2f} minutes")
print(f"RMSE : {rmse:.2f} minutes")
print(f"R┬▓   : {r2:.4f}")

print("\n--- FEATURE IMPORTANCE ---")

importance = pd.DataFrame({
    "feature": feature_columns,
    "importance": model.feature_importances_
})

importance = importance.sort_values(
    "importance",
    ascending=False
)

print(
    importance.to_string(index=False)
)

print("\n--- ERROR BY DELAY CATEGORY ---")

evaluation = pd.DataFrame({
    "actual": y_test.values,
    "predicted": predictions
})

evaluation["absolute_error"] = (
    evaluation["actual"] -
    evaluation["predicted"]
).abs()

evaluation["delay_category"] = pd.cut(
    evaluation["actual"],
    bins=[-float("inf"), 5, 15, 30, 60, float("inf")],
    labels=[
        "0-5 min",
        "5-15 min",
        "15-30 min",
        "30-60 min",
        "60+ min"
    ]
)

category_results = (
    evaluation
    .groupby("delay_category", observed=True)
    .agg(
        samples=("actual", "size"),
        mae=("absolute_error", "mean")
    )
    .reset_index()
)

print(
    category_results.to_string(index=False)
)
