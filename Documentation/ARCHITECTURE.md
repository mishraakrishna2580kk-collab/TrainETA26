# TrainETA — Architecture

## Architecture Layers

### 1. Data Layer

Inputs include:

- Historical railway route data
- Historical delay data
- Timetable information
- Live train information

### 2. Processing Layer

The backend:

- Retrieves train information
- Aligns train and station information
- Processes live state
- Generates prediction features
- Applies ETA prediction logic

### 3. Machine Learning Layer

XGBoost is used to estimate future arrival timing based on available train, route and delay features.

### 4. API Layer

FastAPI exposes train, route, delay, live status and ETA functionality to the frontend.

### 5. Visualization Layer

The Next.js frontend presents:

- Train status
- Live map position
- Dynamic ETA
- Station-wise prediction
- Delay insights
- Operational information

## Design Principle

The live-data provider is separated from the prediction engine so that a future authorized railway data source can replace the current prototype provider without redesigning the complete system.
