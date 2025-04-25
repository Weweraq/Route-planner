/**
 * MapManager handles Google Maps initialization and route rendering
 */
export class MapManager {
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.directionsService = null;
        this.directionsRenderer = null;
        this.markers = [];
        this.polylines = [];
        this.infoWindows = [];
        this.trafficLayer = null;
    }

    initMap() {
        try {
            console.log('Initializing map with element ID:', this.mapElementId);
            const mapElement = document.getElementById(this.mapElementId);
            console.log('Map element found:', mapElement);

            if (!google || !google.maps) {
                console.error('Google Maps API not loaded!');
                return;
            }

            this.map = new google.maps.Map(mapElement, {
                zoom: 7,
                center: { lat: 49.8175, lng: 15.4730 }, // Centered on Czech Republic
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                    position: google.maps.ControlPosition.TOP_RIGHT
                },
                zoomControl: true,
                zoomControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_TOP
                },
                scaleControl: true,
                streetViewControl: true,
                streetViewControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_TOP
                },
                fullscreenControl: true
            });
            console.log('Map created successfully');

            // Initialize traffic layer but don't add it to the map yet
            this.trafficLayer = new google.maps.TrafficLayer();

            // Add traffic toggle control
            this.addTrafficToggle();

            this.directionsService = new google.maps.DirectionsService();
            console.log('DirectionsService created');

            // Initialize the DirectionsRenderer
            this.directionsRenderer = new google.maps.DirectionsRenderer({
                suppressMarkers: true, // We'll add our own markers
                preserveViewport: false,
                polylineOptions: {
                    strokeColor: '#0088FF',
                    strokeWeight: 5,
                    strokeOpacity: 0.7
                }
            });
            console.log('DirectionsRenderer created');

            console.log('Map initialization complete');
        } catch (error) {
            console.error('Error in initMap:', error);
        }
    }

    addTrafficToggle() {
        // Create a custom control for toggling traffic
        const trafficControlDiv = document.createElement('div');
        trafficControlDiv.className = 'custom-map-control';
        trafficControlDiv.style.backgroundColor = 'white';
        trafficControlDiv.style.border = '2px solid #ccc';
        trafficControlDiv.style.borderRadius = '3px';
        trafficControlDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
        trafficControlDiv.style.cursor = 'pointer';
        trafficControlDiv.style.marginBottom = '22px';
        trafficControlDiv.style.textAlign = 'center';
        trafficControlDiv.title = 'Click to toggle traffic';

        // Set CSS for the control interior
        const controlUI = document.createElement('div');
        controlUI.style.color = 'rgb(25,25,25)';
        controlUI.style.fontFamily = 'Roboto,Arial,sans-serif';
        controlUI.style.fontSize = '16px';
        controlUI.style.lineHeight = '38px';
        controlUI.style.paddingLeft = '5px';
        controlUI.style.paddingRight = '5px';
        controlUI.innerHTML = 'Show Traffic';
        trafficControlDiv.appendChild(controlUI);

        // Setup the click event listener
        let trafficEnabled = false;
        trafficControlDiv.addEventListener('click', () => {
            if (trafficEnabled) {
                this.trafficLayer.setMap(null);
                controlUI.innerHTML = 'Show Traffic';
                trafficEnabled = false;
            } else {
                this.trafficLayer.setMap(this.map);
                controlUI.innerHTML = 'Hide Traffic';
                trafficEnabled = true;
            }
        });

        this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(trafficControlDiv);
    }

    renderRoute(route) {
        // Clear any existing markers and routes
        this.clearMap();

        if (!route) {
            console.error('No route data provided');
            return;
        }

        console.log('Rendering route:', route);

        // Ensure we have a DirectionsRenderer
        if (!this.directionsRenderer) {
            this.directionsRenderer = new google.maps.DirectionsRenderer({
                suppressMarkers: true, // We'll add our own markers
                preserveViewport: false,
                polylineOptions: {
                    strokeColor: '#0088FF',
                    strokeWeight: 5,
                    strokeOpacity: 0.7
                }
            });
            console.log('Created new DirectionsRenderer in renderRoute');
        }

        // Add markers for all stops first
        this.addRouteMarkers(route);

        // First try to render detailed path using step-by-step polylines for better accuracy
        console.log('Trying detailed path rendering for better accuracy');
        if (this.renderDetailedPath(route)) {
            console.log('Successfully rendered route using detailed path');
            return;
        }

        // If detailed path rendering fails, try to use DirectionsService to get fresh directions
        console.log('Detailed path rendering failed, trying DirectionsService');
        if (this.renderDirectRoute(route)) {
            console.log('Successfully rendered route using DirectionsService');
            return;
        }

        // If that fails, try to use the DirectionsRenderer with the directions object from the backend
        console.log('DirectionsService failed, trying backend directions');
        if (route.directions && this.renderDirectionsFromBackend(route)) {
            console.log('Successfully rendered route using DirectionsRenderer with backend data');
            return;
        }

        // As a last resort, fall back to polyline approach
        console.log('Backend directions rendering failed, falling back to polyline approach');
        if (this.renderPolylineRoute(route)) {
            console.log('Successfully rendered route using polyline');
            return;
        }

        console.error('All route rendering methods failed');
    }

    renderPolylineRoute(route) {
        console.log('Attempting to render route using polyline');

        // Try to get polyline data from various sources
        let polylineString = null;

        // Check direct polyline property
        if (route.polyline) {
            console.log('Found polyline in route data');
            polylineString = route.polyline;
        }
        // Check overview_polyline property
        else if (route.overview_polyline) {
            console.log('Found overview_polyline in route data');
            if (typeof route.overview_polyline === 'string') {
                polylineString = route.overview_polyline;
            } else if (typeof route.overview_polyline === 'object' && route.overview_polyline.points) {
                polylineString = route.overview_polyline.points;
            }
        }
        // Check directions object
        else if (route.directions && route.directions.routes && route.directions.routes.length > 0) {
            const firstRoute = route.directions.routes[0];
            if (firstRoute.overview_polyline) {
                console.log('Found overview_polyline in directions data');
                if (typeof firstRoute.overview_polyline === 'string') {
                    polylineString = firstRoute.overview_polyline;
                } else if (typeof firstRoute.overview_polyline === 'object' && firstRoute.overview_polyline.points) {
                    polylineString = firstRoute.overview_polyline.points;
                }
            }
        }

        // If we found a polyline string, try to decode and render it
        if (polylineString) {
            try {
                console.log('Decoding polyline:', polylineString);
                const decodedPath = google.maps.geometry.encoding.decodePath(polylineString);
                console.log('Decoded path points:', decodedPath.length);

                if (decodedPath.length > 0) {
                    // Create a polyline and add it to the map
                    const routePolyline = new google.maps.Polyline({
                        path: decodedPath,
                        strokeColor: '#0088FF',
                        strokeWeight: 5,
                        strokeOpacity: 0.7,
                        map: this.map
                    });

                    // Store the polyline for later cleanup
                    this.polylines.push(routePolyline);

                    // Fit the map to the polyline bounds
                    const bounds = new google.maps.LatLngBounds();
                    decodedPath.forEach(point => bounds.extend(point));
                    this.map.fitBounds(bounds);

                    console.log('Polyline rendered successfully');
                    return true; // Success
                } else {
                    console.error('Decoded path has no points');
                }
            } catch (error) {
                console.error('Error rendering polyline:', error);
            }
        }

        // If we don't have a polyline or decoding failed, try to use the stops coordinates
        if (route.stops && route.stops.length > 1) {
            try {
                const path = [];

                // Extract valid coordinates from stops
                for (const stop of route.stops) {
                    let lat, lng;

                    if (typeof stop.lat !== 'undefined' && typeof stop.lng !== 'undefined') {
                        lat = parseFloat(stop.lat);
                        lng = parseFloat(stop.lng);
                    } else if (stop.location && typeof stop.location.lat !== 'undefined' && typeof stop.location.lng !== 'undefined') {
                        lat = parseFloat(stop.location.lat);
                        lng = parseFloat(stop.location.lng);
                    }

                    if (!isNaN(lat) && !isNaN(lng)) {
                        path.push({ lat, lng });
                    }
                }

                if (path.length > 1) {
                    console.log('Drawing route with straight lines between stops:', path);

                    const polyline = new google.maps.Polyline({
                        path: path,
                        strokeColor: '#0088FF',
                        strokeWeight: 6,
                        strokeOpacity: 0.8,
                        map: this.map
                    });

                    this.polylines.push(polyline);

                    // Fit bounds to show the entire route
                    const bounds = new google.maps.LatLngBounds();
                    path.forEach(point => bounds.extend(point));
                    this.map.fitBounds(bounds);

                    console.log('Route rendered using straight lines between stops');
                    return true; // Success
                } else {
                    console.error('Not enough valid coordinates to draw route');
                }
            } catch (error) {
                console.error('Failed to render straight lines between stops', error);
            }
        }

        return false; // Failed to render using polyline
    }

    renderDirectRoute(route) {
        console.log('Attempting to render route using Google Maps DirectionsService');

        // Try to get origin and destination coordinates
        const origin = route.stops && route.stops.length > 0 ?
            { lat: parseFloat(route.stops[0].lat), lng: parseFloat(route.stops[0].lng) } : null;
        const destination = route.stops && route.stops.length > 1 ?
            { lat: parseFloat(route.stops[route.stops.length - 1].lat), lng: parseFloat(route.stops[route.stops.length - 1].lng) } : null;

        // Check if we have valid coordinates
        if (origin && destination && !isNaN(origin.lat) && !isNaN(origin.lng) && !isNaN(destination.lat) && !isNaN(destination.lng)) {
            console.log('Using coordinates for directions:', origin, destination);

            // Create waypoints array for any stops between origin and destination
            const waypoints = [];
            if (route.stops && route.stops.length > 2) {
                for (let i = 1; i < route.stops.length - 1; i++) {
                    const stop = route.stops[i];
                    if (stop.lat && stop.lng) {
                        waypoints.push({
                            location: { lat: parseFloat(stop.lat), lng: parseFloat(stop.lng) },
                            stopover: true
                        });
                    }
                }
            }

            // Get current time for traffic consideration
            const now = new Date();

            // Create the request
            const request = {
                origin: origin,
                destination: destination,
                waypoints: waypoints,
                travelMode: google.maps.TravelMode.DRIVING,
                optimizeWaypoints: false,
                drivingOptions: {
                    departureTime: now,
                    trafficModel: google.maps.TrafficModel.BEST_GUESS
                },
                provideRouteAlternatives: false,
                avoidHighways: route.avoidHighways === true
            };

            // Make the request
            this.directionsService.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    console.log('Received directions from Google Maps API:', result);

                    // Ensure we have a DirectionsRenderer
                    if (!this.directionsRenderer) {
                        this.directionsRenderer = new google.maps.DirectionsRenderer({
                            suppressMarkers: true, // We'll add our own markers
                            preserveViewport: false,
                            polylineOptions: {
                                strokeColor: '#0088FF',
                                strokeWeight: 5,
                                strokeOpacity: 0.7
                            }
                        });
                    }

                    // Set the map for the renderer
                    this.directionsRenderer.setMap(this.map);

                    // This is the key line that displays the route
                    this.directionsRenderer.setDirections(result);
                    console.log('Route rendered using DirectionsRenderer with fresh data');
                    return true;
                } else {
                    console.error('Google Maps DirectionsService failed:', status);
                    return false;
                }
            });

            return true; // Indicate that we're handling the rendering
        }

        // If we don't have coordinates, try to use addresses
        const originAddress = route.stops && route.stops.length > 0 ? route.stops[0].address : null;
        const destAddress = route.stops && route.stops.length > 1 ? route.stops[route.stops.length - 1].address : null;

        if (originAddress && destAddress) {
            console.log('Using addresses for directions:', originAddress, destAddress);

            // Create waypoints array for any stops between origin and destination
            const waypoints = [];
            if (route.stops && route.stops.length > 2) {
                for (let i = 1; i < route.stops.length - 1; i++) {
                    if (route.stops[i].address) {
                        waypoints.push({
                            location: route.stops[i].address,
                            stopover: true
                        });
                    }
                }
            }

            // Get current time for traffic consideration
            const now = new Date();

            // Create the request
            const request = {
                origin: originAddress,
                destination: destAddress,
                waypoints: waypoints,
                travelMode: google.maps.TravelMode.DRIVING,
                optimizeWaypoints: false,
                drivingOptions: {
                    departureTime: now,
                    trafficModel: google.maps.TrafficModel.BEST_GUESS
                },
                provideRouteAlternatives: false
            };

            // Make the request
            this.directionsService.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    console.log('Received directions from Google Maps API (addresses):', result);

                    // Create a new DirectionsRenderer if needed
                    if (!this.directionsRenderer) {
                        this.directionsRenderer = new google.maps.DirectionsRenderer({
                            suppressMarkers: true, // We'll add our own markers
                            preserveViewport: false,
                            polylineOptions: {
                                strokeColor: '#0088FF',
                                strokeWeight: 5,
                                strokeOpacity: 0.7
                            }
                        });
                    }

                    // Set the map for the renderer
                    this.directionsRenderer.setMap(this.map);

                    // This is the key line that displays the route
                    this.directionsRenderer.setDirections(result);
                    console.log('Route rendered using DirectionsRenderer with address data');
                    return true;
                } else {
                    console.error('Google Maps DirectionsService failed (addresses):', status);
                    return false;
                }
            });

            return true; // Indicate that we're handling the rendering
        }

        console.error('Could not render route: no valid coordinates or addresses');

        // Add markers anyway
        this.addRouteMarkers(route);
        return false;
    }

    addRouteMarkers(route) {
        this.markers = [];
        this.infoWindows = [];
        console.log('Adding route markers for route:', route);

        // Add markers for stops if available
        if (route.stops && route.stops.length > 0) {
            console.log('Adding markers for', route.stops.length, 'stops');

            // Process each stop and add appropriate markers
            route.stops.forEach((stop, index) => {
                // Skip stops without coordinates
                if (!stop.lat || !stop.lng) {
                    console.warn(`Stop ${index} has no coordinates:`, stop);
                    return;
                }

                const position = { lat: parseFloat(stop.lat), lng: parseFloat(stop.lng) };
                const label = String.fromCharCode(65 + index); // A, B, C, etc.

                // Determine stop type
                let stopType = stop.type || (index === 0 ? 'origin' :
                                         (index === route.stops.length - 1 ? 'destination' : 'waypoint'));

                this.addMarkerWithInfo(position, label, stop.address || stopType, {
                    type: stopType.charAt(0).toUpperCase() + stopType.slice(1), // Capitalize first letter
                    address: stop.address,
                    distance: stop.distance,
                    duration: stop.duration,
                    arrival: stop.arrival_time
                });

                console.log(`Added ${stopType} marker ${label} at`, position);
            });

            console.log(`Added ${this.markers.length} markers for stops`);
        }
        // If no stops with coordinates, try to add markers for origin and destination
        else if (route.directions && route.directions.routes && route.directions.routes.length > 0) {
            console.log('No stops with coordinates, trying to add markers from directions');

            const legs = route.directions.routes[0].legs;
            if (legs && legs.length > 0) {
                // Add origin marker
                if (legs[0].start_location) {
                    const position = {
                        lat: legs[0].start_location.lat,
                        lng: legs[0].start_location.lng
                    };
                    this.addMarkerWithInfo(position, 'A', legs[0].start_address || 'Origin', {
                        type: 'Origin',
                        address: legs[0].start_address
                    });
                    console.log('Added origin marker at', position);
                }

                // Add destination marker
                const lastLeg = legs[legs.length - 1];
                if (lastLeg.end_location) {
                    const position = {
                        lat: lastLeg.end_location.lat,
                        lng: lastLeg.end_location.lng
                    };
                    this.addMarkerWithInfo(position, 'B', lastLeg.end_address || 'Destination', {
                        type: 'Destination',
                        address: lastLeg.end_address
                    });
                    console.log('Added destination marker at', position);
                }

                // Add waypoint markers
                if (legs.length > 1) {
                    for (let i = 0; i < legs.length - 1; i++) {
                        const leg = legs[i];
                        if (leg.end_location) {
                            const position = {
                                lat: leg.end_location.lat,
                                lng: leg.end_location.lng
                            };
                            const label = String.fromCharCode(66 + i); // B, C, D, etc.
                            this.addMarkerWithInfo(position, label, leg.end_address || 'Waypoint', {
                                type: 'Waypoint',
                                address: leg.end_address
                            });
                            console.log(`Added waypoint marker ${label} at`, position);
                        }
                    }
                }

                console.log(`Added ${this.markers.length} markers from directions`);
            }
        }
    }

    addMarkerWithInfo(position, label, title, info) {
        try {
            // Create marker
            const marker = new google.maps.Marker({
                position: position,
                map: this.map,
                label: label,
                title: title,
                animation: google.maps.Animation.DROP
            });

            // Store marker for later cleanup
            this.markers.push(marker);

            // Create info window content
            let content = `<div class="info-window">`;
            content += `<h3>${info.type || 'Stop'}</h3>`;

            if (info.address) {
                content += `<p><strong>Address:</strong> ${info.address}</p>`;
            }

            if (info.distance) {
                content += `<p><strong>Distance:</strong> ${info.distance}</p>`;
            }

            if (info.duration) {
                content += `<p><strong>Duration:</strong> ${info.duration}</p>`;
            }

            if (info.arrival) {
                content += `<p><strong>Arrival:</strong> ${info.arrival}</p>`;
            }

            content += `</div>`;

            // Create info window
            const infoWindow = new google.maps.InfoWindow({
                content: content
            });

            // Store info window for later cleanup
            this.infoWindows.push(infoWindow);

            // Add click listener to show info window
            marker.addListener('click', () => {
                // Close any open info windows
                this.infoWindows.forEach(iw => iw.close());

                // Open this info window
                infoWindow.open(this.map, marker);
            });

            return marker;
        } catch (error) {
            console.error('Error adding marker:', error);
            return null;
        }
    }

    clearMap() {
        // Clear directions renderer
        if (this.directionsRenderer) {
            this.directionsRenderer.setMap(null);
            this.directionsRenderer = null;
        }

        // Clear any markers we've added
        if (this.markers) {
            this.markers.forEach(marker => marker.setMap(null));
        }
        this.markers = [];

        // Clear any polylines we've added
        if (this.polylines) {
            this.polylines.forEach(polyline => polyline.setMap(null));
        }
        this.polylines = [];

        // Close any open info windows
        if (this.infoWindows) {
            this.infoWindows.forEach(infoWindow => infoWindow.close());
        }
        this.infoWindows = [];

        console.log('Map cleared');
    }

    // Render a more detailed path using step-by-step polylines for better accuracy
    renderDetailedPath(route) {
        console.log('Attempting to render detailed path for better accuracy');

        // Check if we have directions data with steps
        if (!route.directions || !route.directions.routes || route.directions.routes.length === 0) {
            console.log('No directions data available for detailed path rendering');
            return false;
        }

        try {
            const bounds = new google.maps.LatLngBounds();
            let pathRendered = false;

            // Process each route
            route.directions.routes.forEach(routeData => {
                if (routeData.legs && routeData.legs.length > 0) {
                    // Process each leg (segment between stops)
                    routeData.legs.forEach(leg => {
                        if (leg.steps && leg.steps.length > 0) {
                            // Process each step in the leg
                            leg.steps.forEach(step => {
                                // Get the detailed path for this step
                                let stepPath = [];

                                // Try to get path from step.path if available
                                if (step.path && step.path.length > 0) {
                                    stepPath = step.path;
                                }
                                // Otherwise, try to decode the polyline
                                else if (step.polyline && step.polyline.points) {
                                    try {
                                        stepPath = google.maps.geometry.encoding.decodePath(step.polyline.points);
                                    } catch (error) {
                                        console.warn('Error decoding step polyline:', error);
                                    }
                                }

                                // If we have a path with points, create a polyline
                                if (stepPath && stepPath.length > 0) {
                                    // Create a polyline for this step
                                    const stepPolyline = new google.maps.Polyline({
                                        path: stepPath,
                                        strokeColor: '#0088FF',
                                        strokeWeight: 5,
                                        strokeOpacity: 0.7,
                                        map: this.map
                                    });

                                    // Store the polyline for later cleanup
                                    this.polylines.push(stepPolyline);

                                    // Extend bounds to include this path
                                    stepPath.forEach(point => bounds.extend(point));

                                    pathRendered = true;
                                }
                            });
                        }
                    });
                }
            });

            // If we rendered any paths, fit the map to the bounds
            if (pathRendered) {
                this.map.fitBounds(bounds);
                console.log('Detailed path rendered successfully');
                return true;
            }

            console.log('No detailed path segments found to render');
            return false;
        } catch (error) {
            console.error('Error rendering detailed path:', error);
            return false;
        }
    }

    // Render route using the directions object from the backend
    renderDirectionsFromBackend(route) {
        console.log('Attempting to render route using DirectionsRenderer with backend data');

        // Check if we have a valid directions object
        if (!route.directions || !route.directions.routes || route.directions.routes.length === 0) {
            console.error('No valid directions object in route data');
            return false;
        }

        try {
            // Ensure we have a DirectionsRenderer
            if (!this.directionsRenderer) {
                this.directionsRenderer = new google.maps.DirectionsRenderer({
                    suppressMarkers: true, // We'll add our own markers
                    preserveViewport: false,
                    polylineOptions: {
                        strokeColor: '#0088FF',
                        strokeWeight: 5,
                        strokeOpacity: 0.7
                    }
                });
                console.log('Created new DirectionsRenderer in renderDirectionsFromBackend');
            }

            // Set the map for the renderer
            this.directionsRenderer.setMap(this.map);

            // This is the key line that displays the route
            this.directionsRenderer.setDirections(route.directions);
            console.log('Route rendered using DirectionsRenderer with backend data');

            return true;
        } catch (error) {
            console.error('Failed to render directions from backend, falling back to polyline', error);
            return false;
        }
    }

    // Try direct approach with Google Maps DirectionsService
    tryDirectionsService(origin, destination, waypoints = []) {
        return new Promise((resolve, reject) => {
            if (!this.directionsService) {
                this.directionsService = new google.maps.DirectionsService();
            }

            // Get current time for traffic consideration
            const now = new Date();

            const request = {
                origin: origin,
                destination: destination,
                waypoints: waypoints,
                travelMode: google.maps.TravelMode.DRIVING,
                optimizeWaypoints: false,
                drivingOptions: {
                    departureTime: now,
                    trafficModel: google.maps.TrafficModel.BEST_GUESS
                },
                provideRouteAlternatives: false
            };

            console.log('Sending DirectionsService request:', request);

            this.directionsService.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    console.log('DirectionsService returned successfully:', result);
                    resolve(result);
                } else {
                    console.error(`DirectionsService failed: ${status}`);
                    reject(new Error(`DirectionsService failed: ${status}`));
                }
            });
        });
    }
}
