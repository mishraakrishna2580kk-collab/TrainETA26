import os
import pandas as pd


BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

ROUTES_PATH = os.path.join(
    BASE_DIR,
    "data",
    "train_routes_Sep2024.csv"
)


print("Loading route timetable...")

routes = pd.read_csv(ROUTES_PATH)

print("Route data loaded!")
print(f"Rows: {len(routes)}")


def get_next_station(train_number, current_station):

    train_route = routes[
        routes["trainNumber"] == train_number
    ].sort_values("stnSerialNumber").copy()

    current = train_route[
        train_route["station_code"] == current_station
    ]

    if current.empty:
        return None

    current_serial = current.iloc[0]["stnSerialNumber"]

    next_station = train_route[
        train_route["stnSerialNumber"] > current_serial
    ]

    if next_station.empty:
        return None

    return next_station.iloc[0]


print("\n--- TESTING NEXT-STATION LOOKUP ---")

train_number = 12303
current_station = "ASN"

next_station = get_next_station(
    train_number,
    current_station
)

if next_station is None:

    print("Next station not found.")

else:

    print(
        f"Train: {train_number}"
    )

    print(
        f"Current station: {current_station}"
    )

    print(
        f"Next station: "
        f"{next_station['station_code']}"
    )

    print(
        f"Station name: "
        f"{next_station['station_name']}"
    )

    print(
        f"Scheduled arrival: "
        f"{next_station['arrivalTime']}"
    )

    print(
        f"Scheduled departure: "
        f"{next_station['departureTime']}"
    )

    print(
        f"Distance: "
        f"{next_station['distance']} km"
    )
