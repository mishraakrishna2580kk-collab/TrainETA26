# TrainETA — Data Sources

## Historical

Historical railway route and delay information is used for model development and offline evaluation.

## Live

The prototype uses RailRadar for live train information.

The prototype should not describe RailRadar as an official Indian Railways API.

## Production

A production deployment would require authorized railway operational data access or an approved data-sharing interface.

The architecture intentionally keeps the data-access layer modular.

## Raw Dataset Policy

Raw historical datasets are intentionally excluded from the final distributable package to reduce package size and avoid unnecessarily redistributing large source datasets.

