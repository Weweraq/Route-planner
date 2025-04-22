import requests
import os

class GoogleDirectionsAPI:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get("GOOGLE_MAPS_API_KEY")
        self.base_url = "https://maps.googleapis.com/maps/api/directions/json"

    def plan_route(self, origin, destination, waypoints=None, mode="driving", departure_time=None, avoid=None, traffic_model=None, optimize_waypoints=False):
        params = {
            "origin": origin,
            "destination": destination,
            "key": self.api_key,
            "mode": mode
        }
        if waypoints:
            wp = waypoints[:]
            if optimize_waypoints:
                wp = ["optimize:true"] + wp
            params["waypoints"] = "|".join(wp)
        if departure_time:
            params["departure_time"] = departure_time
            if traffic_model:
                params["traffic_model"] = traffic_model
        if avoid:
            params["avoid"] = avoid
        response = requests.get(self.base_url, params=params)
        response.raise_for_status()
        return response.json()
