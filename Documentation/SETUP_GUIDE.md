# TrainETA — Setup Guide

## Backend

Open PowerShell:

    cd "C:\path\to\TrainETA\Backend"

Create a Python virtual environment:

    python -m venv .venv

Activate it:

    .\.venv\Scripts\Activate.ps1

Install dependencies:

    pip install -r requirements.txt

Start FastAPI:

    uvicorn src.backend.main:app --reload

Backend health endpoint:

    http://127.0.0.1:8000/health

---

## Frontend

Open another PowerShell window:

    cd "C:\path\to\TrainETA\Frontend"

Install dependencies:

    pnpm install

Start development server:

    pnpm dev

The application normally becomes available at:

    http://localhost:3000

---

## Environment Variables

Never commit real API keys or passwords.

Use environment variables for:

- Database credentials
- Live-data API keys
- Other secrets

Create local environment files as required by the implementation.

---

## Important

The final package does not contain the raw historical dataset or the original Git metadata.

The XGBoost model required by the prototype is included under:

    Backend\models\xgboost_propagation.ubj
