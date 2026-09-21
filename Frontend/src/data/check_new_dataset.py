from pathlib import Path
import pandas as pd


ROOT = Path(__file__).resolve().parents[2]


def find_file(filename):
    matches = list((ROOT / "data" / "raw").rglob(filename))

    if not matches:
        raise FileNotFoundError(f"Could not find {filename}")

    return matches[0]


# --------------------------------------------------
# 1. Find the datasets
# --------------------------------------------------

route_file = find_file("train_routes_Sep2024.csv")
delay_file = find_file("train_routes_delays_Sep2024.csv")


print("Route file:")
print(route_file)

print("\nDelay file:")
print(delay_file)


# --------------------------------------------------
# 2. Read the datasets
# --------------------------------------------------

routes = pd.read_csv(route_file, dtype="string")
delays = pd.read_csv(delay_file, dtype="string")


print("\n==============================")
print("DATASET SIZES")
print("==============================")

print("Routes:", routes.shape)
print("Delays:", delays.shape)


# --------------------------------------------------
# 3. Clean the train and station identifiers
# --------------------------------------------------

routes["train_key"] = routes["trainNumber"].str.strip()
routes["station_key"] = routes["station_code"].str.strip()

delays["train_key"] = delays["train"].str.strip()
delays["station_key"] = delays["station"].str.strip()


# --------------------------------------------------
# 4. Create a combined train + station key
# --------------------------------------------------

routes["join_key"] = (
    routes["train_key"] + "|" + routes["station_key"]
)

delays["join_key"] = (
    delays["train_key"] + "|" + delays["station_key"]
)


# --------------------------------------------------
# 5. Find unique keys
# --------------------------------------------------

route_keys = set(routes["join_key"].dropna())
delay_keys = set(delays["join_key"].dropna())


# --------------------------------------------------
# 6. Find matching keys
# --------------------------------------------------

shared_keys = route_keys & delay_keys


print("\n==============================")
print("TRAIN-STATION COMPATIBILITY")
print("==============================")

print("Unique route keys:", len(route_keys))
print("Unique delay keys:", len(delay_keys))
print("Shared keys:", len(shared_keys))


# --------------------------------------------------
# 7. Calculate matching percentages
# --------------------------------------------------

route_match_percentage = (
    len(shared_keys) / len(route_keys) * 100
)

delay_match_percentage = (
    len(shared_keys) / len(delay_keys) * 100
)


print(
    f"Route keys matched: {route_match_percentage:.2f}%"
)

print(
    f"Delay keys matched: {delay_match_percentage:.2f}%"
)


# --------------------------------------------------
# 8. Check actual delay rows
# --------------------------------------------------

matched = delays["join_key"].isin(route_keys)


print("\n==============================")
print("ROW LEVEL MATCHING")
print("==============================")

print("Total delay rows:", len(delays))

print(
    "Matched delay rows:",
    int(matched.sum())
)

print(
    "Unmatched delay rows:",
    int((~matched).sum())
)


row_percentage = matched.mean() * 100


print(
    f"Delay rows matched: {row_percentage:.2f}%"
)


print("\nDone.")










