# Railway SIH Database Preparation

## Source
Complete RSTGCN railway dataset ZIP.

## Raw files inspected
1. train_routes_Sep2024.csv
2. train_routes_delays_Sep2024.csv
3. train_delays_Sep2024.json
4. IRN_edges.csv
5. stations_zones_mapping.json

## Cleaning decisions

### train_routes_Sep2024.csv
- Raw rows: 85,055
- Clean rows: 85,013
- Duplicate `(train, station)` groups: 42
- 40 duplicate groups belong to train 16546 and are exact duplicates.
- The two other duplicate groups are the HG stop for trains 17029 and 17030; the raw file contains an inconsistent distance/time reversal. The later/max-distance occurrence was retained.
- `stop_sequence` was regenerated after cleaning so every train has a contiguous route sequence.
- 7 station-name cells were blank in the raw route file. 4 were recoverable from other rows in the same file; the remaining SNNR value is kept NULL rather than guessed.

### train_routes_delays_Sep2024.csv
- Raw rows: 1,282,325
- Clean rows: 1,282,325
- No duplicate `(train, date, station)` records.
- Delay values are non-negative in this dataset.
- Train numbers are kept as VARCHAR so leading zeros such as `04718` are preserved.
- `service_date` is stored as DATE and times as TIME.

### train_delays_Sep2024.json
- 3,892 trains.
- 1,282,325 non-empty train/date/station observations.
- Its structure contains the same six fields represented by the delay CSV: scheduled arrival, actual arrival, arrival delay, scheduled departure, actual departure, departure delay.
- It is therefore treated as a redundant source/backup and is NOT imported as a second historical-delay table. Keep the raw JSON for provenance.

### IRN_edges.csv
- Rows: 9,336
- Unique directed `(from, to)` edges after cleaning: 9,336.
- All edge station codes are covered by the station mapping.

### stations_zones_mapping.json
- Station mappings: 4,735
- Railway zones: 17
- The delay CSV contains one additional station code, `TMA`, that is absent from the mapping. It is included in `stations.csv` with NULL zone/name rather than inventing metadata.

## Recommended PostgreSQL tables

1. `stations`
2. `trains`
3. `train_routes`
4. `historical_delays`
5. `railway_edges`
6. `live_status` (empty until a live source/API is integrated)
7. `predictions` (empty until the ML service writes predictions)

## Important
The raw ZIP is not modified. The files in `data/` are cleaned/normalized copies.

The September 2024 dataset supports historical analysis and model development; it does not by itself provide genuine real-time train positions/status.
