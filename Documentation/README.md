# TrainETA — Dynamic Forecast of Expected Time of Arrival

## SIH 2026

**Problem Statement:** SIH26028  
**Project:** Dynamic Forecast of Expected Time of Arrival (ETA) for Coaching Trains  
**Team:** Team Blitz

---

## 1. Project Overview

TrainETA is a railway ETA prediction prototype designed to move beyond simply displaying the current running status of a train.

The system combines live train information, historical railway delay data, timetable information and route intelligence to generate dynamic, station-wise ETA predictions.

The objective is to provide passengers and railway operations teams with more informative arrival estimates during changing train conditions.

---

## 2. Core Architecture

The system consists of:

- Next.js + React + TypeScript frontend
- Python + FastAPI backend
- PostgreSQL railway data layer
- XGBoost-based ETA prediction
- RailRadar live-data integration for the prototype
- MapLibre GL with OpenStreetMap-based map visualization
- Historical route and delay data
- Station-level ETA and validation components

### High-Level Flow

Live Train Data
→ Historical + Route Data
→ Feature Engineering
→ XGBoost Prediction
→ Dynamic ETA
→ Station-wise Visualization

---

## 3. Main Features

### Passenger-facing features

- Train search
- Live train tracking
- Dynamic ETA
- Station-wise ETA
- Delay information
- Railway route visualization
- Network status
- ETA disclaimer

### Operations-facing features

- Train movement visibility
- Dynamic ETA monitoring
- Station-level prediction information
- Delay and operational insights
- Network-level information

### Validation

The prototype includes station-level prediction validation functionality.

Actual-arrival validation is shown only when same-journey actual arrival information is available.

---

## 4. Data Sources

### Historical Data

Historical railway route and delay data is used for:

- Model development
- Feature engineering
- Delay analysis
- Historical evaluation

### Live Prototype Data

The current prototype integrates RailRadar as its live train-data provider.

The live layer can provide information such as:

- Current train position
- Speed
- Current delay
- Next station / halt information

RailRadar is a prototype data provider and is not claimed to be an official Indian Railways API.

### Production Data Strategy

A production deployment would require an authorized railway operational data source or approved data-sharing interface.

The live-data layer is modular so that the current provider can be replaced or supplemented without redesigning the complete ETA prediction engine.

---

## 5. Machine Learning

The prediction engine uses XGBoost.

The model combines information such as:

- Current delay
- Historical delay patterns
- Route information
- Section distance
- Scheduled section time
- Operational information available to the prototype

The model produces dynamic arrival predictions for upcoming stations.

---

## 6. Evaluation

The historical prediction pipeline was evaluated on:

**57,465 journeys**

Results:

| Metric | TrainETA |
|---|---:|
| MAE | 25.0 minutes |
| RMSE | 67.8 minutes |
| Baseline MAE | 27.5 minutes |
| Baseline RMSE | 72.2 minutes |
| MAE improvement | 8.9% |

The evaluation uses chronological historical evaluation to reduce future-data leakage.

These results represent offline historical evaluation and should not be interpreted as a guarantee of identical live-world accuracy.

---

## 7. Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- MapLibre GL

### Backend

- Python
- FastAPI

### Machine Learning

- XGBoost

### Data

- PostgreSQL
- Historical railway datasets

### Live Data

- RailRadar API

### Development

- Git
- GitHub
- VS Code

---

## 8. Repository Structure

### Backend

The backend contains:

- FastAPI application
- ETA prediction modules
- ML predictor
- Evaluation modules
- Station intelligence
- Operational factors
- Live RailRadar integration
- ML model
- Training/evaluation notebooks

### Frontend

The frontend contains:

- Next.js application
- Train search
- Tracking views
- ETA cards
- Railway map
- Station timeline
- Station prediction validation
- Network status
- Operations overview
- Notifications
- User interface components

---

## 9. Limitations

The current system is a hackathon prototype and has the following limitations:

1. Production deployment requires authorized railway operational data access.
2. The current live-data integration uses a prototype external provider.
3. Historical evaluation does not guarantee the same accuracy under every live operating condition.
4. Same-journey actual-arrival validation is not fully connected for every live journey.
5. Some operational effects are represented using available operational or congestion proxies rather than direct access to every railway control-system signal.
6. Further live-world validation is required before operational deployment.

---

## 10. Future Scope

Potential future improvements include:

- Authorized railway operational data integration
- More extensive live validation
- Improved real-time operational features
- Better preceding-train information
- More advanced prediction models
- Continuous model retraining
- Cloud deployment
- Monitoring and model drift detection
- Integration with railway operational systems

---

## 11. Final Evaluated Git Versions

### Backend

Commit:

582c9e2ee9034716b752e71edacf31dbbb34abf

Tag:

sih-2026-final

### Frontend

Commit:

60a4369e0fe1d319e68da2e559852bc713acfb96

Tag:

sih-2026-frontend-final

---

## 12. Important Reproducibility Note

The final package intentionally excludes:

- Raw historical datasets
- Python virtual environment
- Node.js node_modules
- Next.js build output
- Git metadata
- Temporary development files
- API secrets

Required dependencies should be installed using the project dependency files.

---

## 13. Project Status

**Status:** Final evaluated SIH 2026 prototype

The version represented by this package corresponds to the project version demonstrated during the jury evaluation.
