import os
import pandas as pd
import numpy as np
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

X_train = train_data[feature_columns]
y_train = train_data["delay_propagation"]

X_test = test_data[feature_columns]
y_test = test_data["delay_propagation"]

print("\nTraining delay propagation model...")

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

print("\n--- EVALUATING PROPAGATION MODEL ---")

predicted_propagation = model.predict(X_test)

predicted_future_delay = (
    np.asarray(X_test["arr_delay"], dtype=float) +
    np.asarray(predicted_propagation, dtype=float)
)

actual_future_delay = (
    np.asarray(X_test["arr_delay"], dtype=float) +
    np.asarray(y_test, dtype=float)
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_PATH = os.path.join(
    MODELS_DIR,
    "xgboost_propagation.ubj"
)

model.save_model(MODEL_PATH)

predictions = test_data[[
    "date",
    "arr_delay"
]].copy()

predictions["actual_future_delay"] = actual_future_delay
predictions["predicted_future_delay"] = predicted_future_delay
predictions["prediction_error"] = (
    predictions["predicted_future_delay"]
    - predictions["actual_future_delay"]
)

predictions.to_csv(
    os.path.join(
        MODELS_DIR,
        "propagation_predictions.csv"
    ),
    index=False
)

print("\nModel and predictions saved successfully!")

print(f"Model: {MODEL_PATH}")

print("Predictions: models/propagation_predictions.csv")

mae = mean_absolute_error(
    y_test,
    predicted_propagation
)

rmse = mean_squared_error(
    y_test,
    predicted_propagation
) ** 0.5

r2 = r2_score(
    y_test,
    predicted_propagation
)

print("\nPropagation Model Performance:")
print(f"MAE  : {mae:.2f} minutes")
print(f"RMSE : {rmse:.2f} minutes")
print(f"R┬▓   : {r2:.4f}")

print("\n--- CONVERTING TO FUTURE DELAY ---")

future_mae = mean_absolute_error(
    actual_future_delay,
    predicted_future_delay
)

future_rmse = mean_squared_error(
    actual_future_delay,
    predicted_future_delay
) ** 0.5

future_r2 = r2_score(
    actual_future_delay,
    predicted_future_delay
)

print("\nFuture Delay Performance:")
print(f"MAE  : {future_mae:.2f} minutes")
print(f"RMSE : {future_rmse:.2f} minutes")
print(f"R┬▓   : {future_r2:.4f}")

print("\n--- PROPAGATION MODEL ERROR BY DELAY CATEGORY ---")

evaluation = pd.DataFrame({
    "actual": actual_future_delay,
    "predicted": predicted_future_delay
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
