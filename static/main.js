// MapManager handles Google Maps initialization and route rendering
class MapManager {
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.directionsService = null;
        this.directionsRenderer = null;
        this.markers = [];
        this.polylines = [];
        this.infoWindows = [];
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
            
            // We'll create a new DirectionsRenderer each time we render a route
            // This avoids issues with reusing the same renderer
            this.directionsRenderer = null;
            
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
        
        // DIRECT APPROACH: Create a DirectionsService request to get fresh directions
        // This ensures we have valid directions data for rendering
        const origin = route.stops && route.stops.length > 0 ? 
            { lat: route.stops[0].lat, lng: route.stops[0].lng } : null;
        const destination = route.stops && route.stops.length > 1 ? 
            { lat: route.stops[route.stops.length - 1].lat, lng: route.stops[route.stops.length - 1].lng } : null;
            
        // Check if we have valid origin and destination coordinates
        if (origin && destination) {
            console.log('Creating direct directions request with:', origin, destination);
            
            // Create waypoints array for any stops between origin and destination
            const waypoints = [];
            if (route.stops && route.stops.length > 2) {
                for (let i = 1; i < route.stops.length - 1; i++) {
                    waypoints.push({
                        location: { lat: route.stops[i].lat, lng: route.stops[i].lng },
                        stopover: true
                    });
                }
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
                    departureTime: now,  // Use current time for traffic estimation
                    trafficModel: google.maps.TrafficModel.BEST_GUESS // Can be BEST_GUESS, PESSIMISTIC, or OPTIMISTIC
                },
                avoidHighways: route.avoidHighways === true
            };
            
            // Make a direct request to Google Maps DirectionsService
            this.directionsService.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    console.log('Received fresh directions:', result);
                    
                    // Configure the DirectionsRenderer
                    this.directionsRenderer = new google.maps.DirectionsRenderer({
                        map: this.map,
                        suppressMarkers: true,  // We'll add our own markers
                        polylineOptions: {
                            strokeColor: '#0088FF',
                            strokeWeight: 5,
                            strokeOpacity: 0.7
                        }
                    });
                    
                    // This is the key line that displays the route
                    this.directionsRenderer.setDirections(result);
                    console.log('Route rendered using DirectionsRenderer with fresh data');
                } else {
                    console.error('DirectionsService failed:', status);
                    this.renderFallbackRoute(route);
                }
                
                // Add markers for all stops
                this.addRouteMarkers(route);
            });
            
            return;
        } else {
            console.warn('Missing origin or destination coordinates, trying to use address data');
            
            // Try to use addresses if coordinates are not available
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
                    avoidHighways: route.avoidHighways === true
                };
                
                // Make a direct request to Google Maps DirectionsService
                this.directionsService.route(request, (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK) {
                        console.log('Received fresh directions from addresses:', result);
                        
                        // Configure the DirectionsRenderer
                        this.directionsRenderer = new google.maps.DirectionsRenderer({
                            map: this.map,
                            suppressMarkers: true,  // We'll add our own markers
                            polylineOptions: {
                                strokeColor: '#0088FF',
                                strokeWeight: 5,
                                strokeOpacity: 0.7
                            }
                        });
                        
                        // This is the key line that displays the route
                        this.directionsRenderer.setDirections(result);
                        console.log('Route rendered using DirectionsRenderer with address data');
                    } else {
                        console.error('DirectionsService with addresses failed:', status);
                        this.renderFallbackRoute(route);
                    }
                    
                    // Add markers for all stops
                    this.addRouteMarkers(route);
                });
                
                return;
            }
        }
        
        // Try using the directions object from the backend if available
        if (route.directions && route.directions.routes && route.directions.routes.length > 0) {
            try {
                console.log('Using directions from backend');
                // Configure the DirectionsRenderer
                this.directionsRenderer = new google.maps.DirectionsRenderer({
                    map: this.map,
                    suppressMarkers: true,  // We'll add our own markers
                    polylineOptions: {
                        strokeColor: '#0088FF',
                        strokeWeight: 5,
                        strokeOpacity: 0.7
                    }
                });
                
                // This is the key line that displays the route
                this.directionsRenderer.setDirections(route.directions);
                console.log('Route rendered using DirectionsRenderer with backend data');
                
                // Add markers for all stops
                this.addRouteMarkers(route);
                return;
            } catch (error) {
                console.error('Failed to render directions from backend, falling back to polyline', error);
                this.renderFallbackRoute(route);
            }
        } else {
            console.warn('No valid directions object in route data');
            this.renderFallbackRoute(route);
        }
    }
        
    renderFallbackRoute(route) {
        console.log('Using fallback route rendering');
        
        // Try to use overview_polyline if available
        if (route.overview_polyline && route.overview_polyline.points) {
            try {
                const path = google.maps.geometry.encoding.decodePath(route.overview_polyline.points);
                const polyline = new google.maps.Polyline({
                    path: path,
                    strokeColor: '#0088FF',
                    strokeWeight: 6,
                    strokeOpacity: 0.8,
                    map: this.map
                });
                
                this.polylines.push(polyline);
                console.log('Route rendered using polyline from overview_polyline');
                return true;
            } catch (error) {
                console.error('Failed to render polyline from overview_polyline', error);
            }
        }
        
        // If we have stops with coordinates, draw straight lines between them
        if (route.stops && route.stops.length >= 2) {
            try {
                const path = route.stops.map(stop => ({ lat: stop.lat, lng: stop.lng }));
                const polyline = new google.maps.Polyline({
                    path: path,
                    strokeColor: '#FF5722',
                    strokeWeight: 4,
                    strokeOpacity: 0.7,
                    map: this.map
                });
                
                this.polylines.push(polyline);
                console.log('Route rendered using straight lines between stops');
                return true;
            } catch (error) {
                console.error('Failed to render straight lines between stops', error);
            }
        }
        
        console.error('No valid route data available for rendering');
        return false;
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
                
                const position = { lat: stop.lat, lng: stop.lng };
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
            console.log('No stops with coordinates, using directions data for markers');
            const legs = route.directions.routes[0].legs;
            if (legs && legs.length > 0) {
                // Origin marker (first leg's start_location)
                if (legs[0].start_location) {
                    this.addMarkerWithInfo(
                        legs[0].start_location, 
                        'A', 
                        legs[0].start_address || 'Origin',
                        {
                            type: 'Origin',
                            address: legs[0].start_address
                        }
                    );
                    console.log('Added origin marker A from directions data');
                }
                
                // Waypoints and destination
                legs.forEach((leg, index) => {
                    if (leg.end_location) {
                        const label = String.fromCharCode(66 + index); // B, C, D, etc.
                        this.addMarkerWithInfo(
                            leg.end_location,
                            label,
                            leg.end_address || (index === legs.length - 1 ? 'Destination' : 'Waypoint'),
                            {
                                type: index === legs.length - 1 ? 'Destination' : 'Waypoint',
                                address: leg.end_address,
                                distance: leg.distance?.text,
                                duration: leg.duration?.text,
                                arrival: leg.arrival_time?.text
                            }
                        );
                        console.log(`Added ${index === legs.length - 1 ? 'destination' : 'waypoint'} marker ${label} from directions data`);
                    }
                });
            }
            
            console.log(`Added ${this.markers.length} markers from directions data`);
        } else {
            console.warn('No valid route data for adding markers');
        }    
    }
    
    addMarkerWithInfo(position, label, title, details) {
        // Create marker
        const marker = new google.maps.Marker({
            position: position,
            map: this.map,
            label: label,
            title: title || `Stop ${label}`,
            animation: google.maps.Animation.DROP,
            zIndex: 10
        });
        
        this.markers.push(marker);
        
        // Create info window content
        let infoContent = `<div class="info-window"><h3>${label}: ${title || 'Stop ' + label}</h3>`;
        
        if (details) {
            if (details.type) {
                infoContent += `<div><strong>Type:</strong> ${details.type}</div>`;
            }
            if (details.distance) {
                infoContent += `<div><strong>Distance:</strong> ${details.distance}</div>`;
            }
            if (details.duration) {
                infoContent += `<div><strong>Duration:</strong> ${details.duration}</div>`;
            }
            if (details.duration_in_traffic) {
                infoContent += `<div><strong>Duration with traffic:</strong> ${details.duration_in_traffic}</div>`;
            }
            if (details.arrival) {
                infoContent += `<div><strong>Estimated arrival:</strong> ${details.arrival}</div>`;
            }
        }
        
        infoContent += '</div>';
        
        const infoWindow = new google.maps.InfoWindow({
            content: infoContent,
            maxWidth: 300
        });
        
        this.infoWindows.push(infoWindow);
        
        // Add click listener
        marker.addListener('click', () => {
            // Close all other info windows first
            this.infoWindows.forEach(window => window.close());
            
            // Open this info window
            infoWindow.open(this.map, marker);
        });
        
        return marker;
    }
    
    renderDetailedRoutes(directions) {
        if (!directions || !directions.routes || directions.routes.length === 0) {
            console.error('No valid directions data for detailed routes');
            return;
        }
        
        const route = directions.routes[0];
        console.log('Rendering detailed routes with', route.legs.length, 'legs');
        
        // For multiple legs, we want to show each leg with a different color
        const colors = [
            '#0088FF', // Blue
            '#FF5722', // Orange
            '#4CAF50', // Green
            '#9C27B0', // Purple
            '#FF9800', // Amber
            '#E91E63', // Pink
            '#607D8B'  // Blue Grey
        ];
        
        this.legRenderers = this.legRenderers || [];
        
        // First, render the main route as a background
        const mainRenderer = new google.maps.DirectionsRenderer({
            map: this.map,
            directions: directions,
            routeIndex: 0,
            suppressMarkers: true,
            suppressInfoWindows: true,
            polylineOptions: {
                strokeColor: '#666666',
                strokeWeight: 4,
                strokeOpacity: 0.4
            }
        });
        this.legRenderers.push(mainRenderer);
        
        // Then create a renderer for each leg with a different color
        route.legs.forEach((leg, index) => {
            // Skip legs with no steps
            if (!leg.steps || leg.steps.length === 0) {
                console.warn('Skipping leg with no steps:', index);
                return;
            }
            
            try {
                // Extract the path from the leg's steps
                const legPath = [];
                leg.steps.forEach(step => {
                    if (step.path) {
                        legPath.push(...step.path);
                    } else if (step.start_location && step.end_location) {
                        legPath.push(step.start_location, step.end_location);
                    }
                });
                
                // If we couldn't extract a path, skip this leg
                if (legPath.length === 0) {
                    console.warn('No path found for leg:', index);
                    return;
                }
                
                // Create a polyline for this leg
                const legPolyline = new google.maps.Polyline({
                    path: legPath,
                    strokeColor: colors[index % colors.length],
                    strokeWeight: 6,
                    strokeOpacity: 0.8,
                    map: this.map
                });
                
                this.polylines.push(legPolyline);
                console.log('Added polyline for leg', index, 'with', legPath.length, 'points');
                
                // Alternative approach using DirectionsRenderer
                // Only use this if the polyline approach doesn't work well
                if (false) {
                    // Create a mini-directions object for this leg
                    const legDirections = {
                        routes: [{
                            legs: [leg],
                            overview_path: legPath
                        }]
                    };
                    
                    // Create a renderer for this leg
                    const legRenderer = new google.maps.DirectionsRenderer({
                        map: this.map,
                        directions: legDirections,
                        routeIndex: 0,
                        suppressMarkers: true,
                        suppressInfoWindows: true,
                        preserveViewport: true,
                        polylineOptions: {
                            strokeColor: colors[index % colors.length],
                            strokeWeight: 5,
                            strokeOpacity: 0.7
                        }
                    });
                    
                    this.legRenderers.push(legRenderer);
                }
            } catch (error) {
                console.error('Error rendering leg', index, error);
            }
        });
        
        console.log('Rendered', this.polylines.length, 'leg polylines');
    }
}

// RouteService handles communication with backend API
class RouteService {
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
    }

    async planRoute(data) {
        try {
            console.log('Sending route request to:', '/route');
            console.log('Request data:', data);
            const response = await fetch('/route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${errorText}`);
            }
            const routeData = await response.json();
            console.log('Received route data:', routeData);
            
            // Verify the directions object is present and valid
            if (routeData.directions) {
                console.log('Directions object present, routes:', 
                    routeData.directions.routes ? routeData.directions.routes.length : 'none');
            } else {
                console.warn('No directions object in response');
            }
            
            return routeData;
        } catch (error) {
            console.error('Error in planRoute:', error);
            throw new Error(`Failed to fetch route: ${error.message}`);
        }
    }
}

// UIController handles user interactions and coordinates map and route service
class UIController {
    constructor(mapManager, routeService) {
        this.mapManager = mapManager;
        this.routeService = routeService;

        this.originInput = document.getElementById('start');
        this.destinationInput = document.getElementById('end');
        this.waypointsList = document.getElementById('waypoints-list');
        this.planButton = document.getElementById('plan-route');
        this.routeDetails = document.getElementById('route-details');
        this.spinner = document.getElementById('loading-spinner');
        this.excelUpload = document.getElementById('excel-upload');
        this.addWaypointButton = document.getElementById('add-waypoint');
        this.departureTimeInput = document.getElementById('departure-time');
        this.useHighwaysCheckbox = document.getElementById('pouzit-highways');
        this.routeModeSelect = document.getElementById('route-mode');
        this.useRouteTypeCheckbox = document.getElementById('use-route-type');
        this.routeTypeStatus = document.getElementById('route-type-status');
        this.exportExcelButton = document.getElementById('export-excel');
        this.exportGpsButton = document.getElementById('export-gps');
        
        // Track the last optimized route to prevent duplicate optimizations
        this.lastOptimizedRoute = null;
        this.lastOptimizedWaypoints = [];

        // Initialize autocomplete for origin and destination inputs
        this.initAutocomplete();

        // Initialize event listeners
        this.planButton.addEventListener('click', () => this.onPlanRoute());
        this.addWaypointButton.addEventListener('click', () => {
            this.addWaypoint();
            this.updateWaypointLetters();
        });
        this.excelUpload.addEventListener('change', (e) => this.handleExcelUpload(e));
        this.exportExcelButton.addEventListener('click', () => this.exportToExcel());
        this.exportGpsButton.addEventListener('click', () => this.exportGpsCoordinates());
        
        // Add event listener for the "Použít typ trasy" checkbox
        if (this.useRouteTypeCheckbox && this.routeTypeStatus) {
            this.useRouteTypeCheckbox.addEventListener('change', () => {
                const isChecked = this.useRouteTypeCheckbox.checked;
                this.routeTypeStatus.textContent = isChecked ? 'Aktivní' : 'Neaktivní';
                this.routeTypeStatus.style.color = isChecked ? '#4CAF50' : '#F44336';
                this.routeModeSelect.disabled = !isChecked;
                
                console.log(`Route type optimization ${isChecked ? 'enabled' : 'disabled'}`);
                
                // If we have a route, recalculate it with the new setting
                if (this.lastOptimizedRoute && this.originInput.value && this.destinationInput.value) {
                    // Reset optimization tracking to force recalculation
                    this.lastOptimizedRoute = null;
                    this.lastOptimizedWaypoints = [];
                    // Trigger route recalculation
                    this.onPlanRoute();
                }
            });
        }
        
        // Add event listener for route mode changes to automatically recalculate the route
        if (this.routeModeSelect) {
            this.routeModeSelect.addEventListener('change', () => {
                // Only auto-recalculate if route type is enabled and we have a route
                const useRouteType = this.useRouteTypeCheckbox ? this.useRouteTypeCheckbox.checked : true;
                if (useRouteType && this.originInput.value && this.destinationInput.value) {
                    console.log('Route type changed, recalculating route with mode:', this.routeModeSelect.value);
                    // Reset optimization tracking to force recalculation
                    this.lastOptimizedRoute = null;
                    this.lastOptimizedWaypoints = [];
                    // Trigger route recalculation
                    this.onPlanRoute();
                }
            });
        }

        // Initialize waypoints sortable
        this.initWaypointsSortable();
    }

    initAutocomplete() {
        try {
            // Initialize autocomplete for origin and destination inputs
            const originAutocomplete = new google.maps.places.Autocomplete(this.originInput);
            const destinationAutocomplete = new google.maps.places.Autocomplete(this.destinationInput);
            
            // Add listener to initialize autocomplete for any new waypoint inputs
            this.waypointsList.addEventListener('DOMNodeInserted', (event) => {
                if (event.target.classList && event.target.classList.contains('waypoint-row')) {
                    const input = event.target.querySelector('input.waypoint');
                    if (input) {
                        new google.maps.places.Autocomplete(input);
                    }
                }
            });
            
            console.log('Autocomplete initialized');
        } catch (error) {
            console.error('Error initializing autocomplete:', error);
        }
    }
    
    initWaypointsSortable() {
        try {
            if (typeof Sortable !== 'undefined') {
                new Sortable(this.waypointsList, {
                    animation: 150,
                    handle: '.drag-handle',
                    ghostClass: 'sortable-ghost',
                    // Add an event handler for when sorting ends
                    onEnd: (evt) => {
                        console.log('Waypoints reordered:', this.getWaypoints());
                        // If auto-update is enabled, recalculate the route
                        if (this.autoUpdateRoute) {
                            this.onPlanRoute();
                        } else {
                            // Show a notification that the route needs to be recalculated
                            const notification = document.createElement('div');
                            notification.className = 'notification';
                            notification.textContent = 'Pořadí zastávek bylo změněno. Klikněte na "Naplánovat trasu" pro aktualizaci.';
                            notification.style.backgroundColor = '#ffeb3b';
                            notification.style.color = '#000';
                            notification.style.padding = '8px';
                            notification.style.marginBottom = '10px';
                            notification.style.borderRadius = '4px';
                            notification.style.textAlign = 'center';
                            
                            // Add the notification before the route details
                            const routeDetails = document.getElementById('route-details');
                            if (routeDetails && routeDetails.parentNode) {
                                routeDetails.parentNode.insertBefore(notification, routeDetails);
                                
                                // Remove the notification after 5 seconds
                                setTimeout(() => {
                                    notification.remove();
                                }, 5000);
                            }
                        }
                        // Update the letter markers after manual reordering
                        this.updateWaypointLetters();
                    }
                });
                console.log('Waypoints sortable initialized with reordering handler');
                
                // Add property to track auto-update preference
                this.autoUpdateRoute = false;
            } else {
                console.error('Sortable library not loaded');
            }
        } catch (error) {
            console.error('Error initializing waypoints sortable:', error);
        }
    }
    
    addWaypoint(address = '', letter = '') {
        const waypointRow = document.createElement('div');
        waypointRow.className = 'waypoint-row';
        waypointRow.innerHTML = `
            <div class="drag-handle">≡</div>
            <div class="waypoint-marker">${letter}</div>
            <input type="text" class="waypoint" value="${address}" placeholder="Zastávka">
            <button type="button" class="remove-waypoint">×</button>
        `;
        
        const removeButton = waypointRow.querySelector('.remove-waypoint');
        removeButton.addEventListener('click', () => {
            waypointRow.remove();
            // Reset optimization tracking when waypoints are modified
            this.lastOptimizedRoute = null;
            this.lastOptimizedWaypoints = [];
        });
        
        this.waypointsList.appendChild(waypointRow);
        
        // Initialize autocomplete for the new waypoint input
        const input = waypointRow.querySelector('input.waypoint');
        new google.maps.places.Autocomplete(input);
        
        // Reset optimization tracking when waypoints are added
        this.lastOptimizedRoute = null;
        this.lastOptimizedWaypoints = [];
    }
    
    async handleExcelUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            console.log('Processing Excel file:', file.name);
            const data = await this.readExcelFile(file);
            console.log('Excel data parsed:', data);
            this.processExcelData(data);
        } catch (error) {
            console.error('Error processing Excel file:', error);
            this.showError(`Error processing Excel file: ${error.message}`);
        } finally {
            // Reset the file input so the same file can be selected again
            event.target.value = '';
        }
    }
    
    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Try to detect the column that contains addresses
                    const range = XLSX.utils.decode_range(worksheet['!ref']);
                    let addressColumn = null;
                    
                    // Check the first row for column headers
                    for (let c = range.s.c; c <= range.e.c; c++) {
                        const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: c });
                        const cell = worksheet[cellAddress];
                        
                        if (cell && cell.v) {
                            const header = cell.v.toString().toLowerCase();
                            if (header.includes('address') || header.includes('adresa') || 
                                header.includes('místo') || header.includes('lokace')) {
                                addressColumn = c;
                                break;
                            }
                        }
                    }
                    
                    // If no address column found, use the first column
                    if (addressColumn === null && range.e.c >= 0) {
                        addressColumn = 0;
                    }
                    
                    // Extract addresses from the identified column
                    const addresses = [];
                    if (addressColumn !== null) {
                        for (let r = range.s.r + 1; r <= range.e.r; r++) {
                            const cellAddress = XLSX.utils.encode_cell({ r: r, c: addressColumn });
                            const cell = worksheet[cellAddress];
                            
                            if (cell && cell.v) {
                                addresses.push({
                                    Address: cell.v.toString().trim()
                                });
                            }
                        }
                    }
                    
                    // If no addresses found using column detection, fall back to standard conversion
                    if (addresses.length === 0) {
                        const json = XLSX.utils.sheet_to_json(worksheet);
                        
                        // Try to find addresses in the JSON data
                        for (const row of json) {
                            // Look for any property that might contain an address
                            let address = null;
                            for (const key in row) {
                                if (key.toLowerCase().includes('address') || 
                                    key.toLowerCase().includes('adresa') || 
                                    key.toLowerCase().includes('místo') || 
                                    key.toLowerCase().includes('lokace')) {
                                    address = row[key];
                                    break;
                                }
                            }
                            
                            // If no address-like property found, use the first string property
                            if (!address) {
                                for (const key in row) {
                                    if (typeof row[key] === 'string' || typeof row[key] === 'number') {
                                        address = row[key].toString();
                                        break;
                                    }
                                }
                            }
                            
                            if (address) {
                                addresses.push({ Address: address.toString().trim() });
                            }
                        }
                    }
                    
                    console.log('Extracted addresses:', addresses);
                    resolve(addresses);
                } catch (error) {
                    console.error('Error parsing Excel file:', error);
                    reject(error);
                }
            };
            
            reader.onerror = function(error) {
                reject(error);
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    processExcelData(data) {
        if (!data || data.length === 0) {
            this.showError('No addresses found in Excel file');
            return;
        }
        
        // Clear existing waypoints
        this.waypointsList.innerHTML = '';
        
        console.log('Processing Excel data with', data.length, 'addresses');
        
        // First address is the origin
        if (data[0] && data[0].Address) {
            this.originInput.value = data[0].Address;
            console.log('Set origin to:', data[0].Address);
        }
        
        // Last address is the destination
        if (data.length > 1 && data[data.length - 1] && data[data.length - 1].Address) {
            this.destinationInput.value = data[data.length - 1].Address;
            console.log('Set destination to:', data[data.length - 1].Address);
        }
        
        // Middle addresses are waypoints
        if (data.length > 2) {
            for (let i = 1; i < data.length - 1; i++) {
                if (data[i] && data[i].Address) {
                    this.addWaypoint(data[i].Address, String.fromCharCode(67 + (i - 1)));
                    console.log('Added waypoint:', data[i].Address);
                }
            }
        }
        
        console.log('Excel data processing complete');
    }
    
    exportToExcel() {
        const origin = this.originInput.value.trim();
        const destination = this.destinationInput.value.trim();
        const waypoints = this.getWaypoints();
        
        if (!origin || !destination) {
            this.showError('Origin and destination are required for export');
            return;
        }
        
        const data = [
            { Address: origin, Type: 'Origin' }
        ];
        
        waypoints.forEach((waypoint, index) => {
            data.push({ Address: waypoint, Type: `Waypoint ${index + 1}` });
        });
        
        data.push({ Address: destination, Type: 'Destination' });
        
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Route');
        
        XLSX.writeFile(workbook, 'route_export.xlsx');
    }
    
    exportGpsCoordinates() {
        // This would require geocoding the addresses to get coordinates
        this.showError('GPS export functionality not implemented yet');
    }
    
    getWaypoints() {
        // Get all waypoint inputs in their current order (after any drag and drop reordering)
        return Array.from(this.waypointsList.querySelectorAll('input.waypoint'))
            .map(input => input.value.trim())
            .filter(Boolean);
    }

    async onPlanRoute() {
        this.clearRouteDetails();
        this.showSpinner(true);

        const origin = this.originInput.value.trim();
        const destination = this.destinationInput.value.trim();
        const waypoints = this.getWaypoints();

        if (!origin || !destination) {
            this.showError('Origin and destination are required.');
            this.showSpinner(false);
            return;
        }
        
        // Get additional route parameters
        let departureTime;
        if (this.departureTimeInput.value) {
            // Use specified departure time
            departureTime = new Date(this.departureTimeInput.value).toISOString();
        } else {
            // Use current time for real-time traffic data
            departureTime = new Date().toISOString();
        }
        
        const useHighways = this.useHighwaysCheckbox.checked;
        const routeMode = this.routeModeSelect.value;
        
        // Check if route type optimization is enabled
        const useRouteType = this.useRouteTypeCheckbox ? this.useRouteTypeCheckbox.checked : true;
        
        // Set traffic model for more accurate traffic estimation
        const trafficModel = 'best_guess'; // Options: best_guess, pessimistic, optimistic

        try {
            console.log('Planning route with parameters:', {
                start: origin,
                end: destination,
                waypoints: waypoints,
                departure_time: departureTime,
                use_highways: useHighways,
                mode: routeMode,
                traffic_model: trafficModel
            });
            
            const route = await this.routeService.planRoute({
                start: origin,
                end: destination,
                waypoints: waypoints,
                departure_time: departureTime,
                use_highways: useHighways,
                mode: routeMode,
                traffic_model: trafficModel,
                optimize_waypoints: useRouteType && (routeMode === 'distance' || routeMode === 'shortest')
            });
            console.log('Route received from server:', route);
            
            // Only update waypoints in the UI if route type optimization is enabled
            // We already have useRouteType defined above, so we don't need to redefine it
            
            if (waypoints.length > 1 && useRouteType) {
                console.log('Updating waypoints in UI based on optimized route');
                // Force the update based on route mode
                this.updateWaypointsFromOptimizedRoute(route, true);
            } else {
                console.log(useRouteType ? 'No waypoints to reorder' : 'Route type optimization disabled, preserving waypoint order');
                // Just update our tracking without reordering waypoints
                this.lastOptimizedRoute = route;
                this.lastOptimizedWaypoints = this.getWaypoints();
            }
            
            this.mapManager.renderRoute(route);
            this.displayRouteDetails(route);
            
            // Enable export buttons when route is available
            this.exportExcelButton.disabled = false;
            this.exportGpsButton.disabled = false;
        } catch (error) {
            console.error('Error planning route:', error);
            this.showError(error.message);
        } finally {
            this.showSpinner(false);
        }
    }

    updateWaypointsFromOptimizedRoute(route, forceUpdate = false) {
        // Only proceed if we have stops in the route
        if (!route || !route.stops || route.stops.length < 3) {
            console.log('Not enough stops to reorder waypoints');
            return;
        }
        
        // Check if this is a re-optimization of an already optimized route
        // If so, we'll skip reordering to avoid duplicates, unless forceUpdate is true
        if (!forceUpdate && this.lastOptimizedRoute) {
            const currentWaypoints = this.getWaypoints();
            const lastWaypoints = this.lastOptimizedWaypoints || [];
            
            // If the current waypoints match our last optimized set, skip reordering
            if (currentWaypoints.length === lastWaypoints.length && 
                currentWaypoints.every((wp, i) => wp.toLowerCase() === lastWaypoints[i].toLowerCase())) {
                console.log('Route already optimized, skipping reordering');
                return;
            }
        }
        
        console.log('Updating waypoints from optimized route');
        
        // We need to skip the first and last stops (origin and destination)
        // and only update the waypoints in between
        const waypointStops = route.stops.slice(1, -1);
        const waypointInputs = Array.from(this.waypointsList.querySelectorAll('input.waypoint'));
        
        console.log('Waypoint stops from route:', waypointStops);
        
        // Only proceed if we have the same number of waypoints in the UI as in the route
        if (waypointStops.length !== waypointInputs.length) {
            console.warn('Mismatch between route waypoints and UI waypoints:', 
                         waypointStops.length, 'vs', waypointInputs.length);
            return;
        }
        
        // Create a notification to inform the user that waypoints have been reordered
        const notification = document.createElement('div');
        notification.className = 'notification';
        
        // Different message based on the route type
        const routeMode = this.routeModeSelect ? this.routeModeSelect.value : 'fastest';
        if (routeMode === 'distance' || routeMode === 'shortest') {
            notification.textContent = 'Zastávky byly přeuspořádány pro optimalizaci nejkratší trasy.';
            notification.style.backgroundColor = '#4CAF50';
        } else {
            notification.textContent = 'Zastávky byly přeuspořádány podle nejrychlejší trasy.';
            notification.style.backgroundColor = '#2196F3';
        }
        
        notification.style.color = 'white';
        notification.style.padding = '8px';
        notification.style.marginBottom = '10px';
        notification.style.borderRadius = '4px';
        notification.style.textAlign = 'center';
        
        // Add the notification before the route details
        const routeDetails = document.getElementById('route-details');
        if (routeDetails && routeDetails.parentNode) {
            routeDetails.parentNode.insertBefore(notification, routeDetails);
            
            // Remove the notification after 5 seconds
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
        
        // Create a new list of waypoint rows in the optimized order
        const waypointRows = Array.from(this.waypointsList.querySelectorAll('.waypoint-row'));
        const fragment = document.createDocumentFragment();
        
        // Create a map to track which rows have been used
        const usedRows = new Set();
        
        // Map each optimized waypoint to its corresponding UI row
        waypointStops.forEach((stop, index) => {
            console.log('Matching waypoint:', stop.address, index);
            
            // Find the UI waypoint that matches this stop's address
            const matchingInputIndex = waypointInputs.findIndex((input, idx) => 
                !usedRows.has(idx) && input.value.trim().toLowerCase() === stop.address.toLowerCase());
            
            if (matchingInputIndex !== -1) {
                // Mark this row as used
                usedRows.add(matchingInputIndex);
                // Add the corresponding row to our fragment in the new order
                fragment.appendChild(waypointRows[matchingInputIndex].cloneNode(true));
            } else {
                // If we can't find an exact match, try a more flexible approach
                // Find any unused waypoint that's closest to this stop
                let bestMatchIndex = -1;
                let bestMatchScore = 0;
                
                for (let i = 0; i < waypointInputs.length; i++) {
                    if (!usedRows.has(i)) {
                        // Simple matching score - can be improved with more sophisticated matching
                        const inputValue = waypointInputs[i].value.trim().toLowerCase();
                        const stopAddress = stop.address.toLowerCase();
                        
                        // Check if there's any overlap in the address strings
                        if (inputValue.includes(stopAddress.split(',')[0]) || 
                            stopAddress.includes(inputValue.split(',')[0])) {
                            usedRows.add(i);
                            fragment.appendChild(waypointRows[i].cloneNode(true));
                            console.log('Found partial match for:', stop.address);
                            bestMatchIndex = i;
                            break;
                        }
                    }
                }
                
                // If we still couldn't find a match, create a new waypoint with this address
                if (bestMatchIndex === -1) {
                    console.warn('Creating new waypoint for:', stop.address);
                    const waypointRow = document.createElement('div');
                    waypointRow.className = 'waypoint-row';
                    // Use B, C, D, etc. for waypoints (A is origin, Z is destination)
                    const letter = String.fromCharCode(66 + index); // Start with 'B' for first waypoint
                    waypointRow.innerHTML = `
                        <div class="drag-handle">≡</div>
                        <div class="waypoint-marker">${letter}</div>
                        <input type="text" class="waypoint" value="${stop.address}" placeholder="Zastávka">
                        <button type="button" class="remove-waypoint">×</button>
                    `;
                    fragment.appendChild(waypointRow);
                }
            }
        });
        
        // Clear the current waypoints list
        this.waypointsList.innerHTML = '';
        
        // Add the reordered waypoints
        this.waypointsList.appendChild(fragment);
        
        console.log('Waypoints reordered successfully, new order:', this.getWaypoints());
        
        // Reinitialize event listeners for the new waypoint rows
        Array.from(this.waypointsList.querySelectorAll('.remove-waypoint')).forEach(button => {
            button.addEventListener('click', () => {
                button.closest('.waypoint-row').remove();
            });
        });
        
        // Reinitialize autocomplete for the new waypoint inputs
        Array.from(this.waypointsList.querySelectorAll('input.waypoint')).forEach(input => {
            new google.maps.places.Autocomplete(input);
        });
        
        // Store the current optimized route and waypoints to prevent duplicate optimizations
        this.lastOptimizedRoute = route;
        this.lastOptimizedWaypoints = this.getWaypoints();
        
        console.log('Waypoints updated to match optimized route');
    }
    
    // Update the letter markers for all waypoint rows
    updateWaypointLetters() {
        // Get all waypoint rows
        const waypointRows = Array.from(this.waypointsList.querySelectorAll('.waypoint-row'));
        
        // Update each row with the appropriate letter
        waypointRows.forEach((row, index) => {
            // B is the first waypoint letter (A is origin, Z is destination)
            const letter = String.fromCharCode(66 + index);
            
            // Find or create the marker element
            let markerElement = row.querySelector('.waypoint-marker');
            if (!markerElement) {
                markerElement = document.createElement('div');
                markerElement.className = 'waypoint-marker';
                // Insert after drag handle
                const dragHandle = row.querySelector('.drag-handle');
                if (dragHandle && dragHandle.nextSibling) {
                    row.insertBefore(markerElement, dragHandle.nextSibling);
                } else {
                    row.insertBefore(markerElement, row.firstChild.nextSibling);
                }
            }
            
            // Update the letter
            markerElement.textContent = letter;
        });
        
        console.log('Updated waypoint letters for', waypointRows.length, 'waypoints');
    }

    displayRouteDetails(route) {
        if (!route || !route.stops || route.stops.length === 0) {
            this.routeDetails.innerHTML = 'Nebyla nalezena žádná trasa.';
            return;
        }

        // Debug the route object to see what data we're getting
        console.log('Route data received:', route);
        
        // Safely extract distance and duration values
        const totalDistance = route.distance || 0;
        const totalDuration = route.duration || 0;
        const totalDurationWithTraffic = route.duration_in_traffic || totalDuration;
        
        // Calculate estimated arrival time based on departure time and duration
        let departureTime = null;
        let estimatedArrivalTime = null;
        let trafficDelayMinutes = 0;
        
        if (this.departureTimeInput && this.departureTimeInput.value) {
            departureTime = new Date(this.departureTimeInput.value);
            
                // Use the total duration directly from the route data
            const routeDuration = route.duration || 0;
            
            // Calculate estimated arrival time based on total duration
            estimatedArrivalTime = new Date(departureTime.getTime() + (routeDuration * 1000));
            
            // Calculate traffic delay if applicable
            let trafficDuration = 0;
            if (route.legs && route.legs.length > 0) {
                route.legs.forEach(leg => {
                    if (leg.duration_in_traffic && leg.duration_in_traffic.value && 
                        leg.duration && leg.duration.value && 
                        leg.duration_in_traffic.value > leg.duration.value) {
                        trafficDuration += (leg.duration_in_traffic.value - leg.duration.value);
                    }
                });
            } else if (totalDurationWithTraffic > totalDuration) {
                trafficDuration = totalDurationWithTraffic - totalDuration;
            }
            
            trafficDelayMinutes = Math.round(trafficDuration / 60);
            
            console.log('Route duration:', routeDuration, 'Traffic delay:', trafficDuration);
        }

        let html = `<div><strong>Celková vzdálenost:</strong> ${totalDistance.toFixed(1)} km</div>`;
        html += `<div><strong>Celkový čas jízdy:</strong> ${this.formatDuration(totalDuration)}</div>`;
        
        if (departureTime) {
            const formattedDepartureTime = departureTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
            const formattedArrivalTime = estimatedArrivalTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
            
            html += `<div><strong>Odjezd:</strong> ${formattedDepartureTime}</div>`;
            
            if (trafficDelayMinutes > 0) {
                html += `<div><strong>Předpokládaný příjezd:</strong> ${formattedArrivalTime} <span style="color:#F44336">(+${trafficDelayMinutes} min kvůli dopravě)</span></div>`;
            } else {
                html += `<div><strong>Předpokládaný příjezd:</strong> ${formattedArrivalTime}</div>`;
            }
        }
        
        // Add Czech speed limit information based on route type
        const routeMode = this.routeModeSelect ? this.routeModeSelect.value : 'time';
        html += '<div style="margin-top:10px;background:#f0f0f0;padding:8px;border-radius:4px;">';
        if (routeMode === 'distance') {
            html += '<strong>Nejkratší trasa:</strong> Odhad času založen na maximálních povolených rychlostech dle českého zákona:<br>';
            html += '- Dálnice: 130 km/h<br>- Silnice I. třídy: 90 km/h<br>- Ve městě: 50 km/h';
        } else {
            html += '<strong>Nejrychlejší trasa:</strong> Odhad času založen na reálném provozu a maximálních povolených rychlostech dle českého zákona:<br>';
            html += '- Dálnice: 130 km/h<br>- Silnice I. třídy: 90 km/h<br>- Ve městě: 50 km/h';
        }
        html += '</div>';

        html += '<div style="margin-top:10px;"><strong>Zastávky:</strong></div>';
        html += '<ol style="padding-left:20px;margin-top:5px;">';
        
        // Display all stops with their corresponding letters and arrival times
        let cumulativeTime = 0;
        route.stops.forEach((stop, index) => {
            let letter;
            if (index === 0) {
                letter = 'A'; // Origin
            } else if (index === route.stops.length - 1) {
                letter = 'Z'; // Destination (using Z instead of B to avoid confusion)
            } else {
                letter = String.fromCharCode(66 + (index - 1)); // B, C, D, etc. for waypoints
            }
            
            let stopHtml = `<li><span class="route-point-marker" style="display:inline-flex;margin-right:5px;">${letter}</span>${stop.address}`;
            
            // Add arrival time for each stop except the origin
            if (index > 0 && departureTime) {
                // For the first stop, use its own duration
                // For subsequent stops, we need to calculate the cumulative time
                if (index === 1) {
                    cumulativeTime = 0;
                }
                
                // Get the duration from the leg data
                let legDuration = 0;
                if (index > 0 && index <= route.legs.length) {
                    const prevLeg = route.legs[index - 1];
                    if (prevLeg && prevLeg.duration && prevLeg.duration.value) {
                        legDuration = prevLeg.duration.value;
                        console.log(`Leg ${index} duration:`, legDuration);
                    }
                }
                
                cumulativeTime += legDuration;
                
                const stopArrivalTime = new Date(departureTime.getTime() + (cumulativeTime * 1000));
                const formattedStopArrivalTime = stopArrivalTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
                
                // Check if there's traffic delay for this leg
                let legTrafficDelay = 0;
                if (index > 0 && index <= route.legs.length) {
                    const prevLeg = route.legs[index - 1];
                    if (prevLeg && prevLeg.duration_in_traffic && prevLeg.duration && 
                        prevLeg.duration_in_traffic.value > prevLeg.duration.value) {
                        legTrafficDelay = Math.round((prevLeg.duration_in_traffic.value - prevLeg.duration.value) / 60);
                        console.log(`Leg ${index} traffic delay:`, legTrafficDelay);
                    }
                }
                
                // Always show the arrival time
                const durationText = this.formatDuration(legDuration);
                if (legTrafficDelay > 0) {
                    stopHtml += ` <span style="color:#666;font-size:0.9em;">${durationText}, Příjezd: ${formattedStopArrivalTime} <span style="color:#F44336">(+${legTrafficDelay} min)</span></span>`;
                } else {
                    stopHtml += ` <span style="color:#666;font-size:0.9em;">${durationText}, Příjezd: ${formattedStopArrivalTime}</span>`;
                }
            }
            
            stopHtml += '</li>';
            html += stopHtml;
        });
        
        html += '</ol>';
        this.routeDetails.innerHTML = html;
    }

    showError(message) {
        this.routeDetails.textContent = `Error: ${message}`;
        this.routeDetails.style.color = 'red';
    }

    showSpinner(show) {
        if (this.spinner) {
            this.spinner.style.display = show ? 'flex' : 'none';
        }
    }
    
    formatDuration(seconds) {
        if (!seconds && seconds !== 0) return '0m';
        
        // Convert to minutes first if seconds is in seconds
        let minutes = seconds;
        if (seconds > 60) { // If the value is in seconds
            minutes = Math.floor(seconds / 60);
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.floor(minutes % 60);
        
        if (hours > 0) {
            return `${hours}h ${remainingMinutes}m`;
        } else {
            return `${remainingMinutes}m`;
        }
    }
}

// Initialize app on window load
window.initApp = function() {
    console.log('initApp called');
    try {
        const mapManager = new MapManager('gmap');
        console.log('MapManager created');
        mapManager.initMap();
        console.log('Map initialized');

        const routeService = new RouteService('/api');
        console.log('RouteService created');

        const uiController = new UIController(mapManager, routeService);
        console.log('UIController created');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
};
