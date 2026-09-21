import os
import pandas as pd
from xgboost import XGBRegressor


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "xgboost_propagation.ubj"
)

ML_DATA_PATH = os.path.join(
    BASE_DIR,
    "data",
    "ml_train_data.csv"
)

ROUTES_PATH = os.path.join(
    BASE_DIR,
    "data",
    "train_routes_Sep2024.csv"
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


class ETAPredictor:

    def __init__(self):

        print("Loading ETA model...")

        self.model = XGBRegressor()
        self.model.load_model(MODEL_PATH)

        print("ETA model loaded successfully!")

        print("Loading datasets...")

        self.ml_data = pd.read_csv(ML_DATA_PATH)
        self.routes = pd.read_csv(ROUTES_PATH)

        self.ml_data["date"] = pd.to_datetime(
            self.ml_data["date"]
        )

        print("Datasets loaded successfully!")

    def get_next_station(
        self,
        train_number,
        current_station
    ):

        train_route = self.routes[
            self.routes["trainNumber"] == train_number
        ].sort_values(
            "stnSerialNumber"
        )

        current = train_route[
            train_route["station_code"] == current_station
        ]

        if current.empty:
            return None

        current_serial = current.iloc[0][
            "stnSerialNumber"
        ]

        next_stations = train_route[
            train_route["stnSerialNumber"] > current_serial
        ]

        if next_stations.empty:
            return None

        return next_stations.iloc[0]

    def get_ml_record(
        self,
        train_number,
        current_station,
        date
    ):

        records = self.ml_data[
            (self.ml_data["train"] == train_number) &
            (self.ml_data["station"] == current_station) &
            (self.ml_data["date"] == date)
        ]

        if records.empty:
            return None

        return records.iloc[0]

    def predict(
        self,
        train_number,
        current_station,
        date
    ):

        date = pd.to_datetime(date)

        print()
        print("Finding exact ML record...")

        row = self.get_ml_record(
            train_number,
            current_station,
            date
        )

        if row is None:
            raise ValueError(
                "No ML record found for "
                "this train, station and date."
            )

        print(
            "Train:",
            int(row["train"])
        )

        print(
            "Current station:",
            row["station"]
        )

        next_station = self.get_next_station(
            train_number,
            current_station
        )

        if next_station is None:
            raise ValueError(
                "Next station not found."
            )

        print(
            "Next station:",
            next_station["station_code"]
        )

        print(
            "Next station name:",
            next_station["station_name"]
        )

        input_data = pd.DataFrame(
            [[row[column] for column in FEATURE_COLUMNS]],
            columns=FEATURE_COLUMNS
        )

        print()
        print("Running ETA prediction...")

        predicted_propagation = self.model.predict(
            input_data
        )[0]

        current_delay = float(
            row["arr_delay"]
        )

        predicted_future_delay = (
            current_delay +
            predicted_propagation
        )

        scheduled_time = next_station[
            "arrivalTime"
        ]

        scheduled_arrival = pd.to_datetime(
            f"{date.strftime('%Y-%m-%d')} "
            f"{scheduled_time}"
        )

        predicted_eta = (
            scheduled_arrival +
            pd.Timedelta(
                minutes=float(
                    predicted_future_delay
                )
            )
        )

        return {
            "train_number": train_number,
            "current_station": current_station,
            "next_station": next_station[
                "station_code"
            ],
            "next_station_name": next_station[
                "station_name"
            ],
            "current_delay_minutes": current_delay,
            "predicted_propagation_minutes": float(
                predicted_propagation
            ),
            "predicted_future_delay_minutes": float(
                predicted_future_delay
            ),
            "scheduled_arrival": scheduled_arrival,
            "predicted_eta": predicted_eta
        }


if __name__ == "__main__":

    predictor = ETAPredictor()

    sample = predictor.ml_data[
        predictor.ml_data["station"].notna()
    ].iloc[0]

    train_number = int(
        sample["train"]
    )

    current_station = sample[
        "station"
    ]

    date = sample[
        "date"
    ]

    print()
    print("Using valid historical record:")
    print("Train:", train_number)
    print("Station:", current_station)
    print("Date:", date)

    result = predictor.predict(
        train_number=train_number,
        current_station=current_station,
        date=date
    )

    print()
    print("=" * 50)
    print("ETA PREDICTION RESULT")
    print("=" * 50)

    print(
        "Train:",
        result["train_number"]
    )

    print(
        "Current station:",
        result["current_station"]
    )

    print(
        "Next station:",
        result["next_station"],
        "-",
        result["next_station_name"]
    )

    print(
        "Current delay:",
        round(
            result["current_delay_minutes"],
            2
        ),
        "minutes"
    )

    print(
        "Predicted propagation:",
        round(
            result["predicted_propagation_minutes"],
            2
        ),
        "minutes"
    )

    print(
        "Predicted future delay:",
        round(
            result["predicted_future_delay_minutes"],
            2
        ),
        "minutes"
    )

    print(
        "Scheduled arrival:",
        result["scheduled_arrival"]
    )

    print(
        "Predicted ETA:",
        result["predicted_eta"]
    )

    print("=" * 50)
