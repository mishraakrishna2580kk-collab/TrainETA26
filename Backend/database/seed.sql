-- Run this with psql from the database/ folder after schema.sql.
-- Example:
-- psql -U postgres -d railway_sih -f schema.sql
-- psql -U postgres -d railway_sih -f seed.sql
--
-- In pgAdmin Query Tool, use its Import/Export dialog for the five CSV files
-- instead of executing these \copy commands.

\copy stations (station_code, station_name, railway_zone) FROM 'data/stations.csv' WITH (FORMAT csv, HEADER true, NULL '');
\copy trains (train_number, train_name, source_station_code, destination_station_code) FROM 'data/trains.csv' WITH (FORMAT csv, HEADER true, NULL '');
\copy train_routes (train_number, stop_sequence, station_code, station_name, distance_km, scheduled_arrival, scheduled_departure) FROM 'data/train_routes.csv' WITH (FORMAT csv, HEADER true, NULL '');
\copy historical_delays (train_number, service_date, station_code, scheduled_arrival, actual_arrival, arrival_delay_minutes, scheduled_departure, actual_departure, departure_delay_minutes) FROM 'data/historical_delays.csv' WITH (FORMAT csv, HEADER true, NULL '');
\copy railway_edges (from_station_code, to_station_code, distance_km, number_of_trains) FROM 'data/railway_edges.csv' WITH (FORMAT csv, HEADER true, NULL '');
