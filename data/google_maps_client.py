import aiohttp
import asyncio
import time
from datetime import datetime
from config import Config

class GoogleMapsClient:
    def __init__(self, api_key=None):
        self.api_key = api_key or Config.GOOGLE_MAPS_API_KEY
        self.base_url = "https://maps.googleapis.com/maps/api/directions/json"

    async def plan_route(self, origin, destination, waypoints=None, mode="driving", departure_time=None, avoid=None, traffic_model=None, optimize_waypoints=False):
        # Set up base parameters
        params = {
            "origin": origin,
            "destination": destination,
            "key": self.api_key,
            "mode": mode,
            "alternatives": "true",  # Request alternative routes
            "language": "en",  # English language for directions
            "units": "metric"  # Use metric units
        }

        # Handle waypoints
        if waypoints:
            wp = waypoints[:]
            if optimize_waypoints:
                wp = ["optimize:true"] + wp
            params["waypoints"] = "|".join(wp)

        # Handle departure time for traffic data
        if departure_time:
            # If departure_time is provided as a timestamp, use it directly
            if isinstance(departure_time, int):
                params["departure_time"] = departure_time
            else:
                # Otherwise, use current time for real-time traffic
                params["departure_time"] = "now"
        else:
            # Default to current time for real-time traffic
            params["departure_time"] = "now"

        # Set traffic model if provided
        if traffic_model:
            params["traffic_model"] = traffic_model
        else:
            # Default to best_guess for traffic model
            params["traffic_model"] = "best_guess"

        # Handle route preferences
        if avoid:
            params["avoid"] = avoid

        # Make the API request
        async with aiohttp.ClientSession() as session:
            try:
                print(f"Requesting route with params: {params}")
                async with session.get(self.base_url, params=params) as response:
                    response.raise_for_status()
                    data = await response.json()

                    # Check for API errors
                    if data.get("status") != "OK":
                        error_message = f"Google Maps API error: {data.get('status')}"
                        if data.get("error_message"):
                            error_message += f" - {data.get('error_message')}"
                        raise RuntimeError(error_message)

                    # Add timestamp to the response
                    data["timestamp"] = int(time.time())

                    return data
            except aiohttp.ClientError as e:
                # Log or handle error appropriately
                raise RuntimeError(f"Google Maps API request failed: {e}") from e

# Example usage:
# async def main():
#     client = GoogleMapsClient()
#     route = await client.plan_route("New York, NY", "Boston, MA")
#     print(route)
# asyncio.run(main())