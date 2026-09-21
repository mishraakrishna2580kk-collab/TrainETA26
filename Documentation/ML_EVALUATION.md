# TrainETA — ML Evaluation

## Evaluation Population

57,465 historical journeys.

## Metrics

MAE: 25.0 minutes

RMSE: 67.8 minutes

Current-delay-only baseline MAE: 27.5 minutes

Current-delay-only baseline RMSE: 72.2 minutes

MAE improvement: 8.9%

## Methodology

The evaluation uses chronological historical evaluation to reduce future-data leakage.

## Interpretation

The results demonstrate the historical performance of the prediction pipeline.

They do not guarantee that every live train prediction will have the same error.

## Robustness

Historical analysis showed that normal-delay journeys have substantially lower errors than extreme-delay journeys. Extreme delays remain a difficult prediction regime and require additional live and operational data for further improvement.
