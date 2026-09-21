-- SIH Railway Delay / ETA Prediction Database
-- PostgreSQL 18
-- Raw source files are kept outside this normalized schema.

CREATE TABLE IF NOT EXISTS stations (
    station_code VARCHAR(10) PRIMARY KEY,
    station_name VARCHAR(150),
    railway_zone VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS trains (
    train_number VARCHAR(10) PRIMARY KEY,
    train_name VARCHAR(150) NOT NULL,
    source_station_code VARCHAR(10) REFERENCES stations(station_code),
    destination_station_code VARCHAR(10) REFERENCES stations(station_code)
);

CREATE TABLE IF NOT EXISTS train_routes (
    train_number VARCHAR(10) NOT NULL REFERENCES trains(train_number),
    stop_sequence INTEGER NOT NULL,
    station_code VARCHAR(10) NOT NULL REFERENCES stations(station_code),
    station_name VARCHAR(150),
    distance_km NUMERIC(10,2),
    scheduled_arrival TIME,
    scheduled_departure TIME,
    PRIMARY KEY (train_number, stop_sequence)
);

CREATE TABLE IF NOT EXISTS historical_delays (
    train_number VARCHAR(10) NOT NULL REFERENCES trains(train_number),
    service_date DATE NOT NULL,
    station_code VARCHAR(10) NOT NULL REFERENCES stations(station_code),
    scheduled_arrival TIME,
    actual_arrival TIME,
    arrival_delay_minutes INTEGER NOT NULL,
    scheduled_departure TIME,
    actual_departure TIME,
    departure_delay_minutes INTEGER NOT NULL,
    PRIMARY KEY (train_number, service_date, station_code)
);

CREATE TABLE IF NOT EXISTS railway_edges (
    from_station_code VARCHAR(10) NOT NULL REFERENCES stations(station_code),
    to_station_code VARCHAR(10) NOT NULL REFERENCES stations(station_code),
    distance_km NUMERIC(10,2) NOT NULL,
    number_of_trains INTEGER NOT NULL,
    PRIMARY KEY (from_station_code, to_station_code)
);

-- Application-facing tables. These start empty and will be populated
-- later when the live-status/API and ML prediction layers are integrated.

CREATE TABLE IF NOT EXISTS live_status (
    live_status_id BIGSERIAL PRIMARY KEY,
    train_number VARCHAR(10) NOT NULL REFERENCES trains(train_number),
    station_code VARCHAR(10) REFERENCES stations(station_code),
    observed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actual_arrival TIME,
    actual_departure TIME,
    current_delay_minutes INTEGER
);

CREATE TABLE IF NOT EXISTS predictions (
    prediction_id BIGSERIAL PRIMARY KEY,
    train_number VARCHAR(10) NOT NULL REFERENCES trains(train_number),
    station_code VARCHAR(10) NOT NULL REFERENCES stations(station_code),
    prediction_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    predicted_delay_minutes NUMERIC(10,2) NOT NULL,
    confidence_score NUMERIC(5,2),
    risk_level VARCHAR(20),
    model_version VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_train_routes_station
    ON train_routes(station_code);

CREATE INDEX IF NOT EXISTS idx_historical_delays_train_date
    ON historical_delays(train_number, service_date);

CREATE INDEX IF NOT EXISTS idx_historical_delays_station_date
    ON historical_delays(station_code, service_date);

CREATE INDEX IF NOT EXISTS idx_live_status_train_time
    ON live_status(train_number, observed_at);

CREATE INDEX IF NOT EXISTS idx_predictions_train_time
    ON predictions(train_number, prediction_time);
