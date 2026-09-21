from datetime import datetime, timedelta


def _minutes_between(start_time, end_time):
    """Return minutes from start_time to end_time, handling midnight rollover."""

    start = (
        start_time.hour * 60
        + start_time.minute
        + start_time.second / 60
    )

    end = (
        end_time.hour * 60
        + end_time.minute
        + end_time.second / 60
    )

    if end < start:
        end += 24 * 60

    return end - start


def calculate_scheduled_segment_speed(
    route,
    current_station_code,
    next_station_code,
):
    """
    Calculate scheduled average speed between the current
    and next scheduled station.
    """

    current_stop = None
    next_stop = None

    for stop in route:

        if stop.station_code == current_station_code:
            current_stop = stop

        if stop.station_code == next_station_code:
            next_stop = stop

    if current_stop is None or next_stop is None:
        return None

    current_departure = current_stop.scheduled_departure
    next_arrival = next_stop.scheduled_arrival

    current_distance = current_stop.distance_km
    next_distance = next_stop.distance_km

    if (
        current_departure is None
        or next_arrival is None
        or current_distance is None
        or next_distance is None
    ):
        return None

    try:

        minutes = _minutes_between(
            current_departure,
            next_arrival,
        )

        distance_km = (
            float(next_distance)
            - float(current_distance)
        )

        if minutes <= 0 or distance_km <= 0:
            return None

        speed_kmph = (
            distance_km
            / (minutes / 60.0)
        )

        return speed_kmph

    except (ValueError, TypeError):
        return None


def calculate_speed_adjustment(
    remaining_distance_km,
    live_speed_kmph,
    expected_speed_kmph,
):
    """
    Estimate future travel-time difference caused
    by the current operational speed.

    The adjustment is bounded to prevent unrealistic
    ETA changes from one speed reading.
    """

    if (
        remaining_distance_km is None
        or live_speed_kmph is None
        or expected_speed_kmph is None
    ):
        return 0.0

    if (
        live_speed_kmph <= 0
        or expected_speed_kmph <= 0
    ):
        return 0.0

    scheduled_minutes = (
        float(remaining_distance_km)
        / float(expected_speed_kmph)
    ) * 60

    live_speed_minutes = (
        float(remaining_distance_km)
        / float(live_speed_kmph)
    ) * 60

    adjustment = (
        live_speed_minutes
        - scheduled_minutes
    )

    # Limit the effect of one unusual live-speed reading.
    return max(
        -30.0,
        min(60.0, adjustment),
    )


def build_scheduled_datetimes(
    route,
    journey_date,
):
    """
    Convert route stop times into full datetimes.

    Handles routes that cross midnight.
    """

    result = []

    current_day = journey_date
    previous_time = None

    for stop in route:

        scheduled_time = (
            stop.scheduled_arrival
        )

        if scheduled_time is None:
            scheduled_time = (
                stop.scheduled_departure
            )

        if scheduled_time is None:
            continue

        # Detect midnight rollover.
        if (
            previous_time is not None
            and scheduled_time < previous_time
        ):
            current_day += timedelta(days=1)

        scheduled_datetime = datetime.combine(
            current_day,
            scheduled_time,
        )

        result.append(
            {
                "stop": stop,
                "scheduled_datetime": scheduled_datetime,
            }
        )

        previous_time = scheduled_time

    return result


def find_remaining_stops(
    route,
    live_station_code,
    next_station_code,
    live_distance_km,
):
    """
    Find all scheduled stations still ahead
    of the real-time train position.
    """

    route_codes = [
        stop.station_code
        for stop in route
    ]

    # ---------------------------------------------------------
    # Case 1:
    # Current live location is a scheduled station.
    # ---------------------------------------------------------

    if live_station_code in route_codes:

        current_index = route_codes.index(
            live_station_code
        )

        return route[
            current_index + 1:
        ]

    # ---------------------------------------------------------
    # Case 2:
    # Train is between scheduled stations.
    # ---------------------------------------------------------

    if next_station_code in route_codes:

        next_index = route_codes.index(
            next_station_code
        )

        return route[
            next_index:
        ]

    # ---------------------------------------------------------
    # Case 3:
    # Distance-based fallback.
    # ---------------------------------------------------------

    if live_distance_km is not None:

        remaining = [
            stop
            for stop in route
            if (
                stop.distance_km is not None
                and stop.distance_km > live_distance_km
            )
        ]

        return remaining

    return []


def build_route_eta(
    route,
    remaining_stops,
    journey_date,
    live_delay_minutes,
    predicted_destination_delay,
    live_distance_km,
    live_speed_kmph=None,
    expected_speed_kmph=None,
):
    """
    Generate ETA for every remaining scheduled station.

    Delay is interpolated from the current live delay
    toward the ML predicted destination delay.

    Live operational speed is then used to adjust
    future travel time.
    """

    if not remaining_stops:
        return []

    # ---------------------------------------------------------
    # Calculate remaining distance.
    # ---------------------------------------------------------

    destination_distance = (
        remaining_stops[-1].distance_km
    )

    if destination_distance is None:
        return []

    if live_distance_km is not None:

        start_distance = float(
            live_distance_km
        )

    else:

        first_distance = (
            remaining_stops[0].distance_km
        )

        if first_distance is None:
            return []

        start_distance = float(
            first_distance
        )

    remaining_distance = (
        float(destination_distance)
        - start_distance
    )

    if remaining_distance < 0:
        remaining_distance = 0

    # ---------------------------------------------------------
    # Calculate speed-based ETA adjustment.
    # ---------------------------------------------------------

    speed_adjustment_minutes = (
        calculate_speed_adjustment(
            remaining_distance_km=remaining_distance,
            live_speed_kmph=live_speed_kmph,
            expected_speed_kmph=expected_speed_kmph,
        )
    )

    # ---------------------------------------------------------
    # Combine ML prediction + operational speed.
    # ---------------------------------------------------------

    adjusted_destination_delay = (
        float(predicted_destination_delay)
        + speed_adjustment_minutes
    )

    # Do not allow destination delay to become negative.
    adjusted_destination_delay = max(
        0.0,
        adjusted_destination_delay,
    )

    # ---------------------------------------------------------
    # Build scheduled datetimes.
    # ---------------------------------------------------------

    scheduled = build_scheduled_datetimes(
        route,
        journey_date,
    )

    scheduled_lookup = {
        item["stop"].station_code:
            item["scheduled_datetime"]
        for item in scheduled
    }

    # ---------------------------------------------------------
    # Generate ETA for every remaining station.
    # ---------------------------------------------------------

    total_remaining_distance = (
        remaining_distance
    )

    if total_remaining_distance <= 0:
        total_remaining_distance = 1.0

    results = []

    for stop in remaining_stops:

        scheduled_datetime = (
            scheduled_lookup.get(
                stop.station_code
            )
        )

        if scheduled_datetime is None:
            continue

        if stop.distance_km is None:
            continue

        distance_from_live = (
            float(stop.distance_km)
            - start_distance
        )

        progress = (
            distance_from_live
            / total_remaining_distance
        )

        progress = max(
            0.0,
            min(1.0, progress),
        )

        # -----------------------------------------------------
        # Interpolate delay from current live delay
        # to the SPEED-ADJUSTED ML destination delay.
        # -----------------------------------------------------

        predicted_delay = (
            float(live_delay_minutes)
            + (
                adjusted_destination_delay
                - float(live_delay_minutes)
            )
            * progress
        )

        predicted_delay = max(
            0.0,
            predicted_delay,
        )

        predicted_datetime = (
            scheduled_datetime
            + timedelta(
                minutes=predicted_delay
            )
        )

        results.append(
            {
                "stop_sequence": (
                    stop.stop_sequence
                ),

                "station_code": (
                    stop.station_code
                ),

                "station_name": (
                    stop.station_name
                ),

                "distance_km": (
                    float(stop.distance_km)
                ),

                "scheduled_arrival": (
                    scheduled_datetime.isoformat()
                ),

                "predicted_arrival": (
                    predicted_datetime.isoformat()
                ),

                "predicted_delay_minutes": round(
                    predicted_delay,
                    2,
                ),

                "route_progress": round(
                    progress,
                    4,
                ),

                "status": (
                    "destination"
                    if stop == remaining_stops[-1]
                    else "upcoming"
                ),
            }
        )

    return results