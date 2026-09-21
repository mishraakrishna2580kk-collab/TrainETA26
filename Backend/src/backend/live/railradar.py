import os
from typing import Any

import httpx
from dotenv import load_dotenv


load_dotenv()


class RailRadarError(Exception):
    """Raised when the RailRadar API cannot provide live data."""


class RailRadarClient:
    BASE_URL = "https://api.railradar.in/v1"

    def __init__(self):
        self.api_key = os.getenv(
            "RAILRADAR_API_KEY"
        )

        if not self.api_key:
            raise RailRadarError(
                "RAILRADAR_API_KEY is not configured."
            )

    def get_live_train(
        self,
        train_number: str,
    ) -> dict[str, Any]:

        url = (
            f"{self.BASE_URL}"
            f"/trains/{train_number}/live"
        )

        headers = {
            "Authorization": (
                f"Bearer {self.api_key}"
            )
        }

        params = {
            "authoritative": "true"
        }

        try:
            response = httpx.get(
                url,
                headers=headers,
                params=params,
                timeout=20,
            )

        except httpx.RequestError as exc:

            raise RailRadarError(
                f"RailRadar request failed: {exc}"
            ) from exc

        if response.status_code == 401:

            raise RailRadarError(
                "RailRadar authentication failed."
            )

        if response.status_code == 429:

            raise RailRadarError(
                "RailRadar API rate limit exceeded."
            )

        if response.status_code >= 500:

            raise RailRadarError(
                "RailRadar service is temporarily unavailable."
            )

        if response.status_code != 200:

            raise RailRadarError(
                f"RailRadar returned HTTP "
                f"{response.status_code}."
            )

        payload = response.json()

        if not payload.get("success"):

            raise RailRadarError(
                "RailRadar returned an unsuccessful response."
            )

        return payload["data"]

    def _get_live_speed(
        self,
        data: dict[str, Any],
        current: dict[str, Any],
    ) -> float | None:
        """
        Get the best available operational speed.

        Priority:
        1. Current-location speed
        2. Current route segment speed
        3. None
        """

        # -----------------------------------------------------
        # 1. Prefer explicit current-location speed
        # -----------------------------------------------------

        current_speed = current.get(
            "speedKmph"
        )

        if current_speed is not None:

            return float(current_speed)

        # -----------------------------------------------------
        # 2. Fall back to current route segment speed
        # -----------------------------------------------------

        current_sequence = current.get(
            "sequence"
        )

        if current_sequence is None:

            return None

        for route_stop in data.get(
            "route",
            [],
        ):

            if (
                route_stop.get("sequence")
                == current_sequence
            ):

                speed = route_stop.get(
                    "speedToNextStationKmph"
                )

                if speed is not None:

                    return float(speed)

        # -----------------------------------------------------
        # 3. No speed available
        # -----------------------------------------------------

        return None

    def get_normalized_live_train(
        self,
        train_number: str,
    ) -> dict[str, Any]:

        data = self.get_live_train(
            train_number
        )

        current = (
            data.get("currentLocation")
            or {}
        )

        previous = (
            data.get("previousHalt")
            or {}
        )

        next_halt = (
            data.get("nextHalt")
            or {}
        )

        train = (
            data.get("train")
            or {}
        )

        coordinates = (
            current.get("coordinates")
            or {}
        )

        return {

            "train_number": train.get(
                "number",
                train_number,
            ),

            "train_name": train.get(
                "name"
            ),

            "status": data.get(
                "status"
            ),

            "is_live": data.get(
                "isLive",
                False,
            ),

            "tracking_mode": data.get(
                "trackingMode"
            ),

            "last_updated_at": data.get(
                "lastUpdatedAt"
            ),

            "start_date": data.get(
                "startDate"
            ),

            "current_station": {

                "code": current.get(
                    "stationCode"
                ),

                "name": current.get(
                    "stationName"
                ),

                "sequence": current.get(
                    "sequence"
                ),

                "status": current.get(
                    "status"
                ),

                "is_halt": current.get(
                    "isHalt"
                ),
            },

            "previous_station": {

                "code": previous.get(
                    "stationCode"
                ),

                "name": previous.get(
                    "stationName"
                ),

                "sequence": previous.get(
                    "sequence"
                ),

                "distance_km": previous.get(
                    "distance"
                ),
            },

            "next_station": {

                "code": next_halt.get(
                    "stationCode"
                ),

                "name": next_halt.get(
                    "stationName"
                ),

                "sequence": next_halt.get(
                    "sequence"
                ),

                "distance_km": next_halt.get(
                    "distance"
                ),
            },

            "delay_minutes": data.get(
                "delayMinutes",
                current.get(
                    "delayMinutes"
                ),
            ),

            "position": {

                "latitude": coordinates.get(
                    "lat"
                ),

                "longitude": coordinates.get(
                    "lng"
                ),

                "distance_from_origin_km": (
                    current.get(
                        "distanceFromOriginKm"
                    )
                ),

                "distance_from_last_station_km": (
                    current.get(
                        "distanceFromLastStationKm"
                    )
                ),

                "segment_progress": (
                    current.get(
                        "segmentProgress"
                    )
                ),
            },

            "speed_kmph": (
                self._get_live_speed(
                    data,
                    current,
                )
            ),

            "route": data.get(
                "route",
                [],
            ),
        }