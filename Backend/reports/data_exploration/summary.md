# Train ETA exploratory data analysis

## Inputs

- Timetable (read only): `C:\Users\mishr\Desktop\ETA\timetable.csv.csv`
- Delays (read only): `C:\Users\mishr\Desktop\ETA\train_station_delays.csv.csv`

## Coverage overview

| metric | value |
| --- | --- |
| timetable_rows | 186124 |
| timetable_trains | 11113 |
| timetable_stations | 8151 |
| delay_rows | 1900 |
| delay_trains | 90 |
| delay_stations | 480 |

## Route length and stops per train

Route length is the maximum non-negative numeric `Distance` per train; it is a proxy until distance anomalies are corrected.

| index | maximum valid distance |
| --- | --- |
| count | 11112.0 |
| mean | 349.0 |
| std | 596.56 |
| min | 1.0 |
| 25% | 38.0 |
| 50% | 82.0 |
| 75% | 324.0 |
| 95% | 1792.45 |
| max | 4260.0 |

| index | timetable records per train |
| --- | --- |
| count | 11113.0 |
| mean | 16.75 |
| std | 13.0 |
| min | 2.0 |
| 25% | 8.0 |
| 50% | 15.0 |
| 75% | 22.0 |
| 95% | 40.0 |
| max | 118.0 |

## Missing, invalid, and duplicate values

`SEQ` is invalid when it is non-numeric, less than one, or non-integral. `Distance` is invalid when it is non-numeric or negative. Time values must be `00:00:00` through `23:59:59`.

| metric | value |
| --- | --- |
| missing_seq | 0 |
| invalid_seq | 5 |
| missing_distance | 0 |
| invalid_distance | 10 |
| invalid_arrival_times | 10 |
| invalid_departure_times | 10 |
| timetable_duplicate_rows | 64 |
| timetable_distinct_duplicate_keys | 32 |
| delay_duplicate_rows | 142 |
| delay_distinct_duplicate_keys | 71 |

## Train-station overlap

Keys use trimmed string identifiers: `Train No|Station Code` and `train_number|station_code`. No input field is changed.

| set | unique train-station keys | percentage of timetable keys | percentage of delay keys |
| --- | --- | --- | --- |
| shared | 1510 | 0.81 | 82.56 |
| timetable only | 184582 | 99.19 | 10091.96 |
| delay only | 319 | 0.17 | 17.44 |

## Figures

- `coverage_and_time_patterns.png`: busiest trains and stations, route-length distribution, arrival/departure hours, and key overlap.
