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
X_test = test_data[feature_columns]

y_train_direct = train_data["future_arr_delay"]
y_test_direct = test_data["future_arr_delay"]

y_train_propagation = train_data["delay_propagation"]
y_test_propagation = test_data["delay_propagation"]


print("\nTraining Direct Model...")

direct_model = XGBRegressor(
    n_estimators=300,
    max_depth=8,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    n_jobs=-1,
    random_state=42
)

direct_model.fit(
    X_train,
    y_train_direct
)

direct_predictions = direct_model.predict(X_test)


print("\nTraining Propagation Model...")

propagation_model = XGBRegressor(
    n_estimators=300,
    max_depth=8,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    n_jobs=-1,
    random_state=42
)

propagation_model.fit(
    X_train,
    y_train_propagation
)

predicted_propagation = propagation_model.predict(X_test)


predicted_future_delay = (
    np.asarray(X_test["arr_delay"], dtype=float)
    + np.asarray(predicted_propagation, dtype=float)
)

actual_future_delay = (
    np.asarray(X_test["arr_delay"], dtype=float)
    + np.asarray(y_test_propagation, dtype=float)
)


direct_mae = mean_absolute_error(
    y_test_direct,
    direct_predictions
)

direct_rmse = mean_squared_error(
    y_test_direct,
    direct_predictions
) ** 0.5

direct_r2 = r2_score(
    y_test_direct,
    direct_predictions
)


propagation_mae = mean_absolute_error(
    actual_future_delay,
    predicted_future_delay
)

propagation_rmse = mean_squared_error(
    actual_future_delay,
    predicted_future_delay
) ** 0.5

propagation_r2 = r2_score(
    actual_future_delay,
    predicted_future_delay
)


print("\n========================================")
print("       MODEL COMPARISON")
print("========================================")

print("\nDirect Future Delay Model:")
print(f"MAE  : {direct_mae:.2f} minutes")
print(f"RMSE : {direct_rmse:.2f} minutes")
print(f"R┬▓   : {direct_r2:.4f}")

print("\nPropagation Model:")
print(f"MAE  : {propagation_mae:.2f} minutes")
print(f"RMSE : {propagation_rmse:.2f} minutes")
print(f"R┬▓   : {propagation_r2:.4f}")


comparison = pd.DataFrame({
    "model": [
        "Direct XGBoost",
        "Propagation XGBoost"
    ],
    "MAE_minutes": [
        direct_mae,
        propagation_mae
    ],
    "RMSE_minutes": [
        direct_rmse,
        propagation_rmse
    ],
    "R2": [
        direct_r2,
        propagation_r2
    ]
})

comparison.to_csv(
    "models/model_comparison.csv",
    index=False
)


print("\n========================================")
print("       FINAL MODEL SELECTION")
print("========================================")

if propagation_mae < direct_mae:
    print("Propagation XGBoost performs better based on MAE.")
else:
    print("Direct XGBoost performs better based on MAE.")

if propagation_rmse < direct_rmse:
    print("Propagation XGBoost performs better based on RMSE.")
else:
    print("Direct XGBoost performs better based on RMSE.")

if propagation_r2 > direct_r2:
    print("Propagation XGBoost performs better based on R┬▓.")
else:
    print("Direct XGBoost performs better based on R┬▓.")


print("\nComparison saved:")
print("models/model_comparison.csv")
