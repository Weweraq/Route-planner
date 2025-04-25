from data.google_maps_client import GoogleMapsClient
import time
from datetime import datetime

class RoutePlanner:
    def __init__(self, google_maps_client=None):
        self.google_maps_client = google_maps_client or GoogleMapsClient()
        self.last_route_data = None  # Cache for last route data

    async def plan_route(self, origin, destination, waypoints=None, mode="driving", departure_time=None, avoid=None, traffic_model=None, optimize_waypoints=False):
        # Validate inputs
        if not origin or not destination:
            raise ValueError("Origin and destination must be provided")
            
        # Process route type (mode parameter is for transportation mode, not route type)
        route_type = "fastest"  # Default to fastest route
        if mode == "distance":
            route_type = "shortest"
            mode = "driving"  # Reset mode to driving since distance is not a valid mode
            
        # Set appropriate traffic model based on route type
        if route_type == "fastest":
            # For fastest route, we want to consider traffic
            if not traffic_model:
                traffic_model = "best_guess"
        else:
            # For shortest route, traffic is less important
            optimize_waypoints = True
            
        # Ensure we have departure time for traffic data
        if not departure_time:
            departure_time = "now"  # Use current time for real-time traffic

        print(f"Planning route: {origin} to {destination}, type: {route_type}, traffic model: {traffic_model}")
            
        # Call Google Maps API via Data Layer
        try:
            directions_data = await self.google_maps_client.plan_route(
                origin=origin,
                destination=destination,
                waypoints=waypoints,
                mode=mode,
                departure_time=departure_time,
                avoid=avoid,
                traffic_model=traffic_model,
                optimize_waypoints=optimize_waypoints
            )
            
            # Cache the raw directions data for potential reuse
            self.last_route_data = directions_data
            
        except Exception as e:
            # Handle or propagate error
            raise RuntimeError(f"Failed to plan route: {e}") from e

        # Process directions data
        if directions_data.get("status") != "OK":
            raise RuntimeError(f"Google Maps API error: {directions_data.get('status')}")

        # Extract and process the route based on route type
        if route_type == "fastest":
            route = self._extract_fastest_route(directions_data)
        else:  # shortest
            route = self._extract_shortest_route(directions_data)
            
        return route

    def _extract_fastest_route(self, directions_data):
        # Extract the route with the shortest duration considering traffic
        routes = directions_data.get("routes", [])
        if not routes:
            return None
            
        # If there are multiple routes, find the one with shortest duration in traffic
        if len(routes) > 1:
            fastest_route = None
            min_duration = float('inf')
            
            for route in routes:
                legs = route.get("legs", [])
                total_duration = 0
                
                for leg in legs:
                    if not isinstance(leg, dict):
                        continue
                        
                    # Prefer duration_in_traffic if available, otherwise use regular duration
                    if "duration_in_traffic" in leg:
                        if isinstance(leg["duration_in_traffic"], dict) and "value" in leg["duration_in_traffic"]:
                            total_duration += leg["duration_in_traffic"]["value"]
                        elif isinstance(leg["duration_in_traffic"], (int, float)):
                            total_duration += leg["duration_in_traffic"]
                    elif "duration" in leg:
                        if isinstance(leg["duration"], dict) and "value" in leg["duration"]:
                            total_duration += leg["duration"]["value"]
                        elif isinstance(leg["duration"], (int, float)):
                            total_duration += leg["duration"]
                        
                if total_duration < min_duration:
                    min_duration = total_duration
                    fastest_route = route
                    
            if fastest_route:
                route = fastest_route
            else:
                # Fallback to first route if comparison fails
                route = routes[0]
        else:
            # Only one route available
            route = routes[0]
            
        # Extract route details
        overview_polyline = None
        if isinstance(route.get("overview_polyline"), dict):
            overview_polyline = route.get("overview_polyline", {}).get("points")
        elif isinstance(route.get("overview_polyline"), str):
            overview_polyline = route.get("overview_polyline")
        
        legs = route.get("legs", [])
        # Ensure legs is a list of dictionaries
        if not isinstance(legs, list):
            print(f"Warning: legs is not a list: {type(legs)}")
            legs = []
        
        # Calculate total distance and duration
        total_distance_meters = 0
        total_duration_seconds = 0
        total_duration_in_traffic_seconds = 0
        
        for leg in legs:
            if not isinstance(leg, dict):
                print(f"Warning: leg is not a dictionary: {type(leg)}")
                continue
                
            # Handle distance
            if "distance" in leg:
                if isinstance(leg["distance"], dict) and "value" in leg["distance"]:
                    total_distance_meters += leg["distance"]["value"]
                elif isinstance(leg["distance"], (int, float)):
                    total_distance_meters += leg["distance"]
                    
            # Handle duration
            if "duration" in leg:
                if isinstance(leg["duration"], dict) and "value" in leg["duration"]:
                    total_duration_seconds += leg["duration"]["value"]
                elif isinstance(leg["duration"], (int, float)):
                    total_duration_seconds += leg["duration"]
                    
            # Handle duration in traffic
            if "duration_in_traffic" in leg:
                if isinstance(leg["duration_in_traffic"], dict) and "value" in leg["duration_in_traffic"]:
                    total_duration_in_traffic_seconds += leg["duration_in_traffic"]["value"]
                elif isinstance(leg["duration_in_traffic"], (int, float)):
                    total_duration_in_traffic_seconds += leg["duration_in_traffic"]
        
        # Use traffic duration if available, otherwise use regular duration
        effective_duration = total_duration_in_traffic_seconds if total_duration_in_traffic_seconds > 0 else total_duration_seconds
        
        # Log the distance calculation for debugging
        print(f"Total distance in meters: {total_distance_meters}")
        distance_km = round(total_distance_meters / 1000, 1)  # Convert to kilometers and round to 1 decimal place
        print(f"Converted to kilometers: {distance_km} km")
        
        return {
            "overview_polyline": overview_polyline,
            "legs": legs,
            "directions": directions_data,  # Include full directions object for rendering
            "distance": distance_km,  # Properly rounded kilometers
            "time": effective_duration / 60,  # Convert to minutes
            "duration_without_traffic": total_duration_seconds / 60,  # Minutes
            "duration_with_traffic": total_duration_in_traffic_seconds / 60 if total_duration_in_traffic_seconds > 0 else None,  # Minutes
            "timestamp": directions_data.get("timestamp", int(time.time()))
        }
        
    def _extract_shortest_route(self, directions_data):
        # Extract the route with the shortest distance
        routes = directions_data.get("routes", [])
        if not routes:
            return None
            
        # If there are multiple routes, find the one with shortest distance
        if len(routes) > 1:
            shortest_route = None
            min_distance = float('inf')
            
            for route in routes:
                legs = route.get("legs", [])
                total_distance = 0
                
                for leg in legs:
                    if not isinstance(leg, dict):
                        continue
                        
                    if "distance" in leg:
                        if isinstance(leg["distance"], dict) and "value" in leg["distance"]:
                            total_distance += leg["distance"]["value"]
                        elif isinstance(leg["distance"], (int, float)):
                            total_distance += leg["distance"]
                        
                if total_distance < min_distance:
                    min_distance = total_distance
                    shortest_route = route
                    
            if shortest_route:
                route = shortest_route
            else:
                # Fallback to first route if comparison fails
                route = routes[0]
        else:
            # Only one route available
            route = routes[0]
            
        # Extract route details
        overview_polyline = None
        if isinstance(route.get("overview_polyline"), dict):
            overview_polyline = route.get("overview_polyline", {}).get("points")
        elif isinstance(route.get("overview_polyline"), str):
            overview_polyline = route.get("overview_polyline")
        
        legs = route.get("legs", [])
        # Ensure legs is a list of dictionaries
        if not isinstance(legs, list):
            print(f"Warning: legs is not a list: {type(legs)}")
            legs = []
        
        # Calculate total distance and duration
        total_distance_meters = 0
        total_duration_seconds = 0
        
        for leg in legs:
            if "distance" in leg and "value" in leg["distance"]:
                total_distance_meters += leg["distance"]["value"]
                
            if "duration" in leg and "value" in leg["duration"]:
                total_duration_seconds += leg["duration"]["value"]
        
        return {
            "overview_polyline": overview_polyline,
            "legs": legs,
            "directions": directions_data,  # Include full directions object for rendering
            "distance": total_distance_meters / 1000,  # Convert to kilometers
            "time": total_duration_seconds / 60,  # Convert to minutes
            "timestamp": directions_data.get("timestamp", int(time.time()))
        }