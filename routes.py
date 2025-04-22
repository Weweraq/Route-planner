from flask import Blueprint, request, jsonify, send_from_directory
from db import get_places, get_edges, search_places
from google_api import GoogleDirectionsAPI
from config import Config

routes_bp = Blueprint('routes_bp', __name__)

google_directions = GoogleDirectionsAPI(api_key=Config.GOOGLE_MAPS_API_KEY)

@routes_bp.route('/api/maps-key')
def maps_key():
    from flask import jsonify
    key = Config.GOOGLE_MAPS_API_KEY
    if not key:
        return jsonify({'error': 'API key not set'}), 404
    return jsonify({'key': key})

@routes_bp.route('/')
def index():
    return send_from_directory('static', 'index.html')

@routes_bp.route('/main.js')
def main_js():
    return send_from_directory('static', 'main.js')

@routes_bp.route('/mapdata')
def mapdata():
    places = get_places()
    edges = get_edges()
    return jsonify({'places': places, 'edges': edges})

@routes_bp.route('/search')
def search():
    q = request.args.get('q', '')
    results = search_places(q)
    return jsonify(results)

import traceback

@routes_bp.route('/route', methods=['POST'])
def route():
    try:
        data = request.json
        print('Request data:', data)
        origin = data.get('start')
        destination = data.get('end')
        waypoints = data.get('waypoints', [])
        # Vždy použijeme 'driving', protože Google Directions API nepodporuje 'distance' ani 'time'
        mode = 'driving'
        # Převod departure_time z ISO na unix timestamp (sekundy)
        departure_time = data.get('departure_time')
        if departure_time:
            import datetime
            try:
                dt = datetime.datetime.fromisoformat(departure_time)
                departure_time = int(dt.timestamp())
            except Exception as e:
                print('Chyba při převodu departure_time:', e)
                departure_time = None
        avoid = None if data.get('use_highways', True) else 'highways'
        traffic_model = 'best_guess'
        print(f'Calling GoogleDirectionsAPI with origin={origin}, destination={destination}, waypoints={waypoints}, mode={mode}, departure_time={departure_time}, avoid={avoid}, traffic_model={traffic_model}')
        api_result = google_directions.plan_route(
            origin=origin,
            destination=destination,
            waypoints=waypoints,
            mode=mode,
            departure_time=departure_time,
            avoid=avoid,
            traffic_model=traffic_model
        )
        print('Google API response:', api_result)
        if api_result.get('status') != 'OK':
            print('Google API error status:', api_result.get('status'))
            return jsonify({'error': api_result.get('status', 'No route found')}), 400
        # Transform response for frontend
        try:
            route = api_result['routes'][0]
            leg = route['legs'][0]
            distance_km = leg['distance']['value'] / 1000 if 'distance' in leg and 'value' in leg['distance'] else None
            # Prefer duration_in_traffic if present
            if 'duration_in_traffic' in leg and 'value' in leg['duration_in_traffic']:
                duration_min = leg['duration_in_traffic']['value'] / 60
            else:
                duration_min = leg['duration']['value'] / 60 if 'duration' in leg and 'value' in leg['duration'] else None
            tolls = any('toll' in (step.get('html_instructions','').lower()) for step in leg.get('steps', []))
            eta = None
            if 'duration_in_traffic' in leg and 'value' in leg['duration_in_traffic']:
                from datetime import datetime, timedelta
                if 'departure_time' in leg:
                    try:
                        dep_epoch = int(leg['departure_time']['value'])
                        eta_dt = datetime.utcfromtimestamp(dep_epoch) + timedelta(seconds=leg['duration_in_traffic']['value'])
                        eta = eta_dt.strftime('%Y-%m-%d %H:%M')
                    except Exception:
                        eta = None
            result = {
                'distance': distance_km,
                'time': duration_min,
                'tolls': tolls,
                'eta': eta,
                'overview_polyline': route.get('overview_polyline', {}).get('points')
            }
            # Check for missing values
            if result['distance'] is None or result['time'] is None:
                return jsonify({'error': 'Chybí data o vzdálenosti nebo čase v odpovědi Google API.'}), 500
            return jsonify(result)
        except Exception as e:
            print('Chyba při transformaci odpovědi Google Directions:', e)
            return jsonify({'error': 'Chyba při zpracování odpovědi z Google Directions API.'}), 500
    except Exception as e:
        print('Chyba v /route:', e)
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
