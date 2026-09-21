from typing import Any


def calculate_congestion_level(
    live_delay_minutes: float,
    live_speed_kmph: float | None,
    expected_speed_kmph: float | None,
) -> dict[str, Any]:
    """
    Estimate a simple operational congestion level.

    MVP proxy using currently available live signals:
    delay and speed deviation.
    """

    delay = max(
        0.0,
        float(live_delay_minutes or 0),
    )

    speed_ratio = None

    if (
        live_speed_kmph is not None
        and expected_speed_kmph is not None
        and expected_speed_kmph > 0
    ):
        speed_ratio = (
            float(live_speed_kmph)
            / float(expected_speed_kmph)
        )

    if delay >= 90:
        level = "high"
        score = 0.9
    elif delay >= 45:
        level = "medium"
        score = 0.6
    elif delay >= 15:
        level = "low"
        score = 0.3
    else:
        level = "normal"
        score = 0.1

    if speed_ratio is not None:
        if speed_ratio < 0.75:
            level = "high"
            score = max(score, 0.9)
        elif speed_ratio < 0.90:
            if level != "high":
                level = "medium"
            score = max(score, 0.6)

    return {
        "level": level,
        "score": round(score, 2),
        "delay_signal_minutes": round(delay, 2),
        "speed_ratio": (
            round(speed_ratio, 3)
            if speed_ratio is not None
            else None
        ),
    }


def calculate_preceding_train_effect(
    current_delay_minutes: float,
    congestion_score: float,
) -> dict[str, Any]:
    """
    Estimate a bounded delay-propagation effect caused by
    network congestion / preceding train operations.

    This is an MVP proxy because a direct preceding-train
    feed is not currently available.
    """

    delay = max(
        0.0,
        float(current_delay_minutes or 0),
    )

    score = max(
        0.0,
        min(1.0, float(congestion_score)),
    )

    propagation_minutes = (
        delay * score * 0.15
    )

    propagation_minutes = max(
        0.0,
        min(20.0, propagation_minutes),
    )

    return {
        "estimated_effect_minutes": round(
            propagation_minutes,
            2,
        ),
        "method": "congestion_proxy",
    }


def calculate_operational_adjustment(
    live_delay_minutes: float,
    live_speed_kmph: float | None,
    expected_speed_kmph: float | None,
) -> dict[str, Any]:
    """
    Combine congestion and preceding-train propagation
    into one bounded operational adjustment.
    """

    congestion = calculate_congestion_level(
        live_delay_minutes=live_delay_minutes,
        live_speed_kmph=live_speed_kmph,
        expected_speed_kmph=expected_speed_kmph,
    )

    preceding_train = calculate_preceding_train_effect(
        current_delay_minutes=live_delay_minutes,
        congestion_score=congestion["score"],
    )

    total_adjustment = (
        preceding_train[
            "estimated_effect_minutes"
        ]
    )

    return {
        "congestion": congestion,
        "preceding_train": preceding_train,
        "total_operational_adjustment_minutes": round(
            total_adjustment,
            2,
        ),
    }