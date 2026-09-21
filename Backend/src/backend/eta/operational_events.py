from typing import Any


def calculate_event_adjustment(
    events: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    """
    Calculate ETA adjustment from operational events.

    MVP event model:
    - speed_restriction: adds travel time
    - congestion: adds travel time
    - signal_issue: adds travel time
    - route_disruption: adds travel time

    Each event can optionally provide:
    - type
    - severity
    - delay_minutes
    """

    if not events:
        return {
            "total_adjustment_minutes": 0.0,
            "events": [],
        }

    severity_multiplier = {
        "low": 0.5,
        "medium": 1.0,
        "high": 1.5,
        "critical": 2.0,
    }

    processed_events = []
    total_adjustment = 0.0

    for event in events:

        event_type = str(
            event.get("type", "unknown")
        ).lower()

        severity = str(
            event.get("severity", "medium")
        ).lower()

        base_delay = float(
            event.get("delay_minutes", 0) or 0
        )

        multiplier = severity_multiplier.get(
            severity,
            1.0,
        )

        adjustment = max(
            0.0,
            base_delay * multiplier,
        )

        # Prevent one event from creating
        # an unrealistic ETA jump.
        adjustment = min(
            adjustment,
            30.0,
        )

        processed_events.append(
            {
                "type": event_type,
                "severity": severity,
                "delay_minutes": round(
                    adjustment,
                    2,
                ),
                "description": event.get(
                    "description",
                    event_type.replace("_", " ").title(),
                ),
            }
        )

        total_adjustment += adjustment

    # Bound the combined event effect.
    total_adjustment = min(
        total_adjustment,
        60.0,
    )

    return {
        "total_adjustment_minutes": round(
            total_adjustment,
            2,
        ),
        "events": processed_events,
    }