from flask import Blueprint, request, jsonify, send_from_directory
from db import get_places, get_edges, search_places
from config import Config
import traceback
import asyncio
import os
import requests
from business.route_planner import RoutePlanner
from dotenv import load_dotenv

routes_bp = Blueprint('routes_bp', __name__)

route_planner = RoutePlanner()

@routes_bp.route('/api/maps-key', methods=['GET', 'POST'])
def maps_key():
    if request.method == 'GET':
        key = Config.GOOGLE_MAPS_API_KEY
        if not key:
            return jsonify({'error': 'API key not set'}), 404
        return jsonify({'key': key})
    elif request.method == 'POST':
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400

        data = request.get_json()
        new_key = data.get('key')

        if not new_key:
            return jsonify({'error': 'API key is required'}), 400

        # Validate the key by making a test request
        try:
            # Make a simple request to the Google Maps API
            url = f"https://maps.googleapis.com/maps/api/directions/json?origin=Prague&destination=Brno&key={new_key}"
            response = requests.get(url)
            data = response.json()

            if data.get('status') == 'REQUEST_DENIED':
                return jsonify({'error': 'Invalid API key'}), 400

            # Update the API key in the environment
            os.environ['GOOGLE_MAPS_API_KEY'] = new_key

            # Update the API key in the config
            Config.GOOGLE_MAPS_API_KEY = new_key

            # Save the API key to the .env file
            env_path = '.env'
            if os.path.exists(env_path):
                with open(env_path, 'r') as f:
                    lines = f.readlines()

                with open(env_path, 'w') as f:
                    key_updated = False
                    for line in lines:
                        if line.startswith('GOOGLE_MAPS_API_KEY='):
                            f.write(f'GOOGLE_MAPS_API_KEY={new_key}\n')
                            key_updated = True
                        else:
                            f.write(line)

                    # If the key wasn't in the file, add it
                    if not key_updated:
                        f.write(f'GOOGLE_MAPS_API_KEY={new_key}\n')
            else:
                # Create a new .env file if it doesn't exist
                with open(env_path, 'w') as f:
                    f.write(f'GOOGLE_MAPS_API_KEY={new_key}\n')

            # Reload environment variables from .env file
            load_dotenv(override=True)

            # Update the API key in the config again to ensure it's updated
            Config.GOOGLE_MAPS_API_KEY = new_key

            # Print confirmation for debugging
            print(f"API key updated to: {new_key}")
            print(f"Config API key: {Config.GOOGLE_MAPS_API_KEY}")
            print(f"Environment API key: {os.environ.get('GOOGLE_MAPS_API_KEY')}")

            return jsonify({'success': True, 'key': new_key}), 200
        except Exception as e:
            return jsonify({'error': f'Error validating API key: {str(e)}'}), 500

@routes_bp.route('/')
def index():
    # Serve the index.html file directly without modifying it
    # The API key is now fetched via AJAX from the /api/maps-key endpoint
    return send_from_directory('static', 'index.html')

@routes_bp.route('/settings')
def settings():
    # Serve the settings.html file
    return send_from_directory('static', 'settings.html')

@routes_bp.route('/main.js')
def main_js():
    return send_from_directory('static', 'main.js')

@routes_bp.route('/test-map')
def test_map():
    # The test-map.html now fetches the API key from the server
    return send_from_directory('static', 'test-map.html')

@routes_bp.route('/mapdata')
def mapdata():
    places = get_places()
    edges = get_edges()
    return jsonify({'places': places, 'edges': edges})

@routes_bp.route('/search')
def search():
    q = request.args.get('q', '')

    # Validate search query
    if not isinstance(q, str):
        return jsonify({'error': 'Search query must be a string'}), 400

    # Limit query length for security
    if len(q) > 100:
        return jsonify({'error': 'Search query too long (max 100 characters)'}), 400

    # Perform search
    results = search_places(q)
    return jsonify(results)

@routes_bp.route('/route', methods=['POST'])
def route():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400

        # Extract and validate required parameters
        origin = data.get('start')
        destination = data.get('end')

        # Validate origin and destination
        if not origin or not isinstance(origin, str) or len(origin.strip()) == 0:
            return jsonify({'error': 'Origin is required and must be a non-empty string'}), 400

        if not destination or not isinstance(destination, str) or len(destination.strip()) == 0:
            return jsonify({'error': 'Destination is required and must be a non-empty string'}), 400

        # Extract and validate waypoints
        waypoints = data.get('waypoints', [])
        if not isinstance(waypoints, list):
            return jsonify({'error': 'Waypoints must be a list'}), 400

        # Validate each waypoint
        validated_waypoints = []
        for i, waypoint in enumerate(waypoints):
            if not isinstance(waypoint, str) or len(waypoint.strip()) == 0:
                return jsonify({'error': f'Waypoint {i+1} must be a non-empty string'}), 400
            validated_waypoints.append(waypoint.strip())

        # Replace with validated waypoints
        waypoints = validated_waypoints

        # Extract and validate optional parameters
        mode = 'driving'  # Only driving mode is supported

        # Validate departure_time
        departure_time = data.get('departure_time')
        if departure_time:
            from datetime import datetime
            try:
                if isinstance(departure_time, str):
                    dt = datetime.fromisoformat(departure_time)
                    departure_time = int(dt.timestamp())
                elif not isinstance(departure_time, (int, float)):
                    return jsonify({'error': 'Departure time must be an ISO date string or timestamp'}), 400
            except Exception as e:
                print(f"Error parsing departure time: {e}")
                return jsonify({'error': 'Invalid departure time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'}), 400

        # Validate use_highways
        use_highways = data.get('use_highways')
        if use_highways is not None and not isinstance(use_highways, bool):
            return jsonify({'error': 'use_highways must be a boolean value'}), 400
        avoid = None if data.get('use_highways', True) else 'highways'

        # Validate traffic_model
        traffic_model = data.get('traffic_model', 'best_guess')
        valid_traffic_models = ['best_guess', 'pessimistic', 'optimistic']
        if traffic_model not in valid_traffic_models:
            traffic_model = 'best_guess'  # Default to best_guess if invalid

        # Validate route mode
        route_mode = data.get('mode')
        valid_modes = ['time', 'distance', 'shortest']
        if route_mode is not None and route_mode not in valid_modes:
            return jsonify({'error': f'Invalid route mode. Must be one of: {valid_modes}'}), 400

        # Validate optimize_waypoints
        optimize_waypoints = data.get('optimize_waypoints')
        if optimize_waypoints is not None and not isinstance(optimize_waypoints, bool):
            return jsonify({'error': 'optimize_waypoints must be a boolean value'}), 400

        # If optimize_waypoints is not specified, determine based on route mode
        if optimize_waypoints is None:
            optimize_waypoints = route_mode == 'distance' or route_mode == 'shortest'

        print(f"Route mode: {data.get('mode')}, Optimizing waypoints: {optimize_waypoints}")

        try:
            route = asyncio.run(route_planner.plan_route(
                origin=origin,
                destination=destination,
                waypoints=waypoints,
                mode=mode,
                departure_time=departure_time,
                avoid=avoid,
                traffic_model=traffic_model,
                optimize_waypoints=optimize_waypoints
            ))
        except Exception as e:
            print(f"Error in route_planner.plan_route: {e}")
            # Return a simplified response for debugging
            return jsonify({
                'error': f"Route planning failed: {str(e)}",
                'stops': [{'address': origin, 'type': 'origin'}, {'address': destination, 'type': 'destination'}],
                'distance': 0,
                'duration': 0,
                'legs': []
            }), 500

        if not route:
            return jsonify({'error': 'No route found'}), 404

        stops = []
        legs = route.get('legs', [])
        # Calculate total distance and duration from legs
        total_distance_meters = 0
        total_duration_seconds = 0
        total_duration_with_traffic_seconds = 0

        # Add the origin location as the first stop
        if legs and len(legs) > 0 and isinstance(legs[0], dict):
            if 'start_location' in legs[0] and 'start_address' in legs[0]:
                stops.append({
                    'address': legs[0].get('start_address'),
                    'departure_time': legs[0].get('departure_time', {}).get('text') if isinstance(legs[0].get('departure_time'), dict) else None,
                    'departure_time_value': legs[0].get('departure_time', {}).get('value') if isinstance(legs[0].get('departure_time'), dict) else None,
                    'lat': legs[0].get('start_location', {}).get('lat') if isinstance(legs[0].get('start_location'), dict) else None,
                    'lng': legs[0].get('start_location', {}).get('lng') if isinstance(legs[0].get('start_location'), dict) else None,
                    'type': 'origin'
                })
                print(f"Added origin stop: {legs[0].get('start_address')}")
            else:
                # If we can't get the origin from legs, try to use the input origin
                print(f"No start/end location in legs, using input origin: {origin}")
                stops.append({
                    'address': origin,
                    'type': 'origin'
                    # We don't have coordinates here, but the frontend will geocode it
                })
        else:
            # If legs is empty or not a dictionary, use the input origin
            print(f"No valid legs data, using input origin: {origin}")
            stops.append({
                'address': origin,
                'type': 'origin'
                # We don't have coordinates here, but the frontend will geocode it
            })

        # Add the waypoints and destination
        for leg in legs:
            if not isinstance(leg, dict):
                print(f"Skipping invalid leg data: {leg}")
                continue

            leg_data = {
                'address': leg.get('end_address'),
                'type': 'waypoint' if leg != legs[-1] else 'destination'
            }

            # Safely add optional fields
            if isinstance(leg.get('arrival_time'), dict):
                leg_data['arrival_time'] = leg['arrival_time'].get('text')
                leg_data['arrival_time_value'] = leg['arrival_time'].get('value')

            if isinstance(leg.get('departure_time'), dict):
                leg_data['departure_time'] = leg['departure_time'].get('text')
                leg_data['departure_time_value'] = leg['departure_time'].get('value')

            if isinstance(leg.get('distance'), dict):
                leg_data['distance'] = leg['distance'].get('text')
                if 'value' in leg['distance']:
                    leg_data['distance_value'] = leg['distance']['value']

            if isinstance(leg.get('duration'), dict):
                leg_data['duration'] = leg['duration'].get('text')
                leg_data['duration_sec'] = leg['duration'].get('value')

            if isinstance(leg.get('duration_in_traffic'), dict):
                leg_data['duration_in_traffic'] = leg['duration_in_traffic'].get('text')
                leg_data['duration_in_traffic_sec'] = leg['duration_in_traffic'].get('value')

            if isinstance(leg.get('end_location'), dict):
                leg_data['lat'] = leg['end_location'].get('lat')
                leg_data['lng'] = leg['end_location'].get('lng')

            stops.append(leg_data)
            # Don't double-count distances and durations here
            # We already calculated them above

        distance_km = round(total_distance_meters / 1000, 1) if total_distance_meters else 0
        # Duration in seconds is used directly in the response

        # Safely check for tolls
        tolls = False
        try:
            for leg in legs:
                if isinstance(leg, dict) and 'steps' in leg:
                    for step in leg['steps']:
                        if isinstance(step, dict) and 'html_instructions' in step:
                            if 'toll' in step['html_instructions'].lower():
                                tolls = True
                                break
        except Exception as e:
            print(f"Error checking for tolls: {e}")
            tolls = False
        eta = None
        if legs and isinstance(legs[0], dict):
            from datetime import datetime, timedelta

            # Calculate ETA based on departure time and duration
            if departure_time:
                try:
                    dep_epoch = int(departure_time)
                    total_seconds = total_duration_seconds

                    if total_seconds > 0:
                        eta_dt = datetime.fromtimestamp(dep_epoch) + timedelta(seconds=total_seconds)
                        eta = eta_dt.strftime('%Y-%m-%d %H:%M')
                except Exception as e:
                    print(f"Error calculating ETA: {e}")
                    eta = None

        # Calculate total duration with traffic
        total_duration_with_traffic_seconds = 0
        for leg in legs:
            if isinstance(leg, dict) and 'duration_in_traffic' in leg:
                if isinstance(leg['duration_in_traffic'], dict) and 'value' in leg['duration_in_traffic']:
                    total_duration_with_traffic_seconds += leg['duration_in_traffic']['value']

        # If no traffic data, use regular duration
        if total_duration_with_traffic_seconds == 0:
            total_duration_with_traffic_seconds = total_duration_seconds

        # Return the route with additional information
        try:
            # Extract total distance and duration from the route object if available
            route_distance = route.get('distance')
            route_time = route.get('time')

            # Debug logging
            print(f"Backend route data - distance: {route_distance} km, time: {route_time} min")
            print(f"Calculated values - distance: {distance_km} km, duration: {total_duration_seconds/60 if total_duration_seconds else 0} min")

            # Use the values from the route object if they exist, otherwise use calculated values
            final_distance = route_distance if route_distance is not None else distance_km
            final_duration = route_time * 60 if route_time is not None else total_duration_seconds  # Convert minutes to seconds

            response_data = {
                'stops': stops,
                'distance': final_distance,  # Use the distance from route_planner in km
                'duration': final_duration,  # Use the duration from route_planner in seconds
                'duration_in_traffic': total_duration_with_traffic_seconds if total_duration_with_traffic_seconds is not None else 0,
                'tolls': tolls,
                'eta': eta,
                'legs': legs,  # Include the original legs data for detailed processing
                'directions': route.get('directions')  # Include the complete directions object
            }

            # Safely add polyline data
            polyline = None
            if isinstance(route.get('overview_polyline'), dict):
                polyline = route.get('overview_polyline', {}).get('points')
            elif isinstance(route.get('overview_polyline'), str):
                polyline = route.get('overview_polyline')
            response_data['polyline'] = polyline

            # Add raw distance and time values for debugging
            response_data['raw_distance_km'] = distance_km
            response_data['raw_duration_sec'] = total_duration_seconds
            response_data['raw_route_distance'] = route.get('distance')
            response_data['raw_route_time'] = route.get('time')

            # Safely add bounds data
            if isinstance(route.get('bounds'), dict):
                response_data['bounds'] = route.get('bounds')

            return jsonify(response_data)
        except Exception as e:
            print(f"Error preparing response: {e}")
            # Return a simplified response for debugging
            return jsonify({
                'stops': [{'address': origin, 'type': 'origin'}, {'address': destination, 'type': 'destination'}],
                'distance': 0,
                'duration': 0,
                'error': f"Error preparing response: {str(e)}"
            })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
