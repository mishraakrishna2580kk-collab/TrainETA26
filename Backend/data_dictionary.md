# Train ETA data dictionary and compatibility analysis

## Scope and handling

Analysis date: 2026-09-02. The source files inspected were the supplied raw CSVs:

- `C:\Users\mishr\Desktop\ETA\timetable.csv.csv`
- `C:\Users\mishr\Desktop\ETA\train_station_delays.csv.csv`

The project directory did not contain `data/raw/` at the time of inspection. Neither supplied raw file was modified, renamed, deleted, or overwritten. Data types below are inferred from the values; CSV fields themselves are read as text.

## `timetable.csv`

Rows: 186,124

| Column | Inferred data type | Missing values | Unique non-missing values | 5 sample values |
|---|---:|---:|---:|---|
| Train No | Text identifier (mostly numeric; contains `K`) | 0 | 11,113 | `107`, `108`, `128`, `290`, `401` |
| Train Name | Text | 0 | 7,584 | `SWV-MAO-VLNK`, `VLNK-MAO-SWV`, `MAO-KOP SPEC`, `PALACE ON WH`, `BSB BHARATDA` |
| SEQ | Text/mixed (mostly sequence numbers; some time values) | 0 | 123 | `1`, `2`, `3`, `4`, `5` |
| Station Code | Text | 0 | 8,151 | `SWV`, `THVM`, `KRMI`, `MAO`, `KUDL` |
| Station Name | Text | 0 | 8,100 | `SAWANTWADI R`, `THIVIM`, `KARMALI`, `MADGOAN JN.`, `KUDAL` |
| Arrival time | Time text (`HH:MM:SS`) | 0 | 1,444 | `00:00:00`, `11:06:00`, `11:28:00`, `12:10:00`, `21:04:00` |
| Departure Time | Time text (`HH:MM:SS`) | 0 | 1,445 | `10:25:00`, `11:08:00`, `11:30:00`, `00:00:00`, `20:30:00` |
| Distance | Text/mixed (mostly numeric; includes `NA` and station-name values) | 0 | 3,102 | `0`, `32`, `49`, `78`, `33` |
| Source Station | Text | 0 | 927 | `SWV`, `MAO`, `DSJ`, `AWB`, `LKO` |
| Source Station Name | Text | 0 | 922 | `SAWANTWADI ROAD`, `MADGOAN JN.`, `DELHI-SAFDAR JANG`, `AURANGABAD`, `LUCKNOW JN.` |
| Destination Station | Text | 0 | 929 | `MAO`, `SWV`, `KOP`, `DSJ`, `BSB` |
| Destination Station Name | Text | 0 | 924 | `MADGOAN JN.`, `SAWANTWADI ROAD`, `CHHATRAPATI SHAHU MAHARAJ TERMINUS`, `DELHI-SAFDAR JANG`, `VARANASI JN.` |

## `train_station_delays.csv`

Rows: 1,900

| Column | Inferred data type | Missing values | Unique non-missing values | 5 sample values |
|---|---:|---:|---:|---|
| train_number | Numeric identifier | 0 | 90 | `12673`, `12674`, `12681`, `12682`, `12637` |
| train_name | Text | 0 | 42 | `Cheran Express`, `Kovai Express`, `Pandian Exp`, `Nellai Express`, `Vande Bharat` |
| station_code | Text | 0 | 480 | `MAS`, `AVD`, `AJJ`, `KPD`, `JTJ` |
| station_name | Text | 0 | 480 | `CHENNAI CENTRAL`, `AVADI`, `ARAKKONAM`, `KATPADI JN`, `JOLARPETTAI` |
| average_delay_minutes | Numeric (nullable) | 236 | 171 | `2.0`, `0.0`, `16.0`, `17.0`, `25.0` |
| pct_right_time | Numeric | 0 | 470 | `98.9`, `0.27`, `55.34`, `48.49`, `70.96` |
| pct_slight_delay | Numeric | 0 | 433 | `0.27`, `0.0`, `44.38`, `49.86`, `27.67` |
| pct_significant_delay | Numeric | 0 | 266 | `0.0`, `0.27`, `1.64`, `1.37`, `2.19` |
| pct_cancelled_unknown | Numeric | 0 | 48 | `0.83`, `99.73`, `0.01`, `0.0`, `0.55` |
| scraped_at | ISO 8601 timestamp text | 0 | 1,900 | `2025-09-27T12:25:37.767628+00:00`, `2025-09-27T12:25:39.293769+00:00`, `2025-09-27T12:25:40.672610+00:00`, `2025-09-27T12:25:42.125216+00:00`, `2025-09-27T12:25:44.585700+00:00` |
| source_url | URL text | 0 | 90 | `https://etrain.info/train/Cheran-Express-12673/history?d=1y`, `https://etrain.info/train/Cheran-Express-12674/history?d=1y`, `https://etrain.info/train/Kovai-Express-12681/history?d=1y`, `https://etrain.info/train/Kovai-Express-12682/history?d=1y`, `https://etrain.info/train/Pandian-Exp-12637/history?d=1y` |

## Key compatibility: `Train No + Station Code` ↔ `train_number + station_code`

The key check used the exact, case-preserving raw values joined as `train|station`. All 186,124 timetable rows and all 1,900 delay rows have both key fields populated.

| Measure | Timetable key set | Delay key set |
|---|---:|---:|
| Rows with complete key | 186,124 | 1,900 |
| Unique train-station combinations | 186,092 | 1,829 |
| Matching unique combinations | 1,510 (0.81%) | 1,510 (82.56%) |
| Unmatched unique combinations | 184,582 (99.19%) | 319 (17.44%) |
| Duplicate-key rows beyond first occurrence | 32 | 71 |
| Distinct duplicated keys | 32 | 71 |

Across the union of both unique-key sets, there are 186,411 combinations: 1,510 shared (0.81%) and 184,901 present in only one dataset. This means the delay dataset is largely joinable to the timetable, but it covers only a very small subset of timetable train-station combinations.

Duplicate examples: timetable `14660|RKB`, `290|DSJ`, `477|BNW`; delays `12839|AKP`, `12839|ANV`, `12839|BALU` (each occurs twice). A join must therefore choose a rule for duplicates (for example, retain the latest `scraped_at` delay record or aggregate) to prevent row multiplication.

## Formatting and data-quality checks

| Key field | Leading-zero values | Leading/trailing-space values | Internal whitespace values | Finding |
|---|---:|---:|---:|---|
| `timetable.Train No` | 0 | 0 | 0 | Mostly numeric identifiers, but 5 rows use non-numeric value `K`. Treat as text. |
| `timetable.Station Code` | 0 | 0 | 0 | Text station codes. |
| `delays.train_number` | 0 | 0 | 0 | Fully numeric values. |
| `delays.station_code` | 0 | 0 | 0 | Text station codes. |

Trimming key fields did not add any matches: the exact and trimmed matching count is 1,510. No leading-zero or edge-space normalization is needed for these two join keys. The primary type issue is `timetable.Train No` being a text field with a small number of non-numeric entries, whereas `train_station_delays.train_number` is numeric. Store both join components as normalized text for the join; do not coerce timetable train numbers to a numeric type globally.

Two unrelated timetable columns also contain mixed values: `SEQ` includes time-formatted values such as `12:17:00`, and `Distance` includes `NA` and station-name values such as `BIJAPUR JN`. These fields should be cleaned or validated separately before use in downstream ETA features.

## Compatibility conclusion

`Train No + Station Code` can be matched directly with `train_number + station_code` for 1,510 unique combinations. The shared rows provide a valid foundation for a scoped delay enrichment, provided duplicate delay keys are resolved. The substantial coverage gap (184,582 timetable-only keys) means this delay source should be treated as partial coverage rather than a complete train ETA label source.
