/**
 * UIController handles user interactions and coordinates map and route service
 */
import { formatDuration, formatDistance, formatTimeWithPeriod } from './utils.js';
import { WaypointsManager } from './waypoints-manager.js';
import { ExportManager } from './export-manager.js';

export class UIController {
    constructor(mapManager, routeService) {
        this.mapManager = mapManager;
        this.routeService = routeService;

        // Initialize UI elements
        this.initUIElements();

        // Initialize waypoints manager
        this.waypointsManager = new WaypointsManager(this.waypointsList);
        this.waypointsManager.setOnReorderCallback(() => this.handleWaypointsReordered());
        this.waypointsManager.setOnRemoveCallback(() => this.handleWaypointsChanged());

        // Initialize export manager
        this.exportManager = new ExportManager();

        // Track the last optimized route to prevent duplicate optimizations
        this.lastOptimizedRoute = null;
        this.lastOptimizedWaypoints = [];

        // Set default departure time to current date and time
        this.setDefaultDepartureTime();

        // Initialize autocomplete for origin and destination inputs
        this.initAutocomplete();

        // Initialize event listeners
        this.initEventListeners();
    }

    /**
     * Initialize UI elements
     */
    initUIElements() {
        this.originInput = document.getElementById('start');
        this.destinationInput = document.getElementById('end');
        this.waypointsList = document.getElementById('waypoints-list');
        this.planButton = document.getElementById('plan-route');
        this.routeDetails = document.getElementById('route-details');
        this.spinner = document.getElementById('loading-spinner');
        this.excelUpload = document.getElementById('excel-upload');
        this.addWaypointButton = document.getElementById('add-waypoint');
        this.departureTimeInput = document.getElementById('departure-time');
        this.useHighwaysCheckbox = document.getElementById('use-highways');
        this.routeModeSelect = document.getElementById('route-mode');
        this.useRouteTypeCheckbox = document.getElementById('use-route-type');
        this.routeTypeStatus = document.getElementById('route-type-status');
        this.exportExcelButton = document.getElementById('export-excel');
        this.exportGpsButton = document.getElementById('export-gps');
        this.clearCacheButton = document.getElementById('clear-cache');
        this.sidebarToggleButton = document.getElementById('sidebar-toggle');
        this.container = document.getElementById('container');
    }

    /**
     * Initialize event listeners
     */
    initEventListeners() {
        this.planButton.addEventListener('click', () => this.onPlanRoute());
        this.addWaypointButton.addEventListener('click', () => {
            this.waypointsManager.addWaypoint();
            this.waypointsManager.updateWaypointLetters();
        });
        this.excelUpload.addEventListener('change', (e) => this.handleExcelUpload(e));
        this.exportExcelButton.addEventListener('click', () => this.exportManager.exportToExcel());
        this.exportGpsButton.addEventListener('click', () => this.exportManager.exportGpsCoordinates());

        // Add event listener for the clear cache button
        if (this.clearCacheButton) {
            this.clearCacheButton.addEventListener('click', () => this.clearRouteCache());
        }

        // Add event listener for the sidebar toggle button
        if (this.sidebarToggleButton && this.container) {
            this.sidebarToggleButton.addEventListener('click', () => this.toggleSidebar());

            // Check if we're on mobile and set initial state
            if (window.innerWidth <= 768) {
                // Start with sidebar visible on mobile
                this.container.classList.remove('sidebar-hidden');
            }
        }

        // Add event listener for the "Použít typ trasy" checkbox
        if (this.useRouteTypeCheckbox && this.routeTypeStatus) {
            this.useRouteTypeCheckbox.addEventListener('change', () => {
                const isChecked = this.useRouteTypeCheckbox.checked;
                this.routeTypeStatus.textContent = isChecked ? 'Active' : 'Inactive';
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
    }

    /**
     * Set default departure time to current date and time
     */
    setDefaultDepartureTime() {
        if (this.departureTimeInput) {
            // Get current date and time
            const now = new Date();

            // Format for datetime-local input (YYYY-MM-DDThh:mm)
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');

            const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

            // Set the input value
            this.departureTimeInput.value = formattedDateTime;
            console.log('Default departure time set to:', formattedDateTime);
        }
    }

    /**
     * Initialize Google Maps autocomplete for address inputs
     */
    initAutocomplete() {
        try {
            // Initialize autocomplete for origin and destination inputs
            const originAutocomplete = new google.maps.places.Autocomplete(this.originInput);
            const destinationAutocomplete = new google.maps.places.Autocomplete(this.destinationInput);

            console.log('Autocomplete initialized');
        } catch (error) {
            console.error('Error initializing autocomplete:', error);
        }
    }

    /**
     * Handle waypoints being reordered
     */
    handleWaypointsReordered() {
        console.log('Waypoints reordered:', this.waypointsManager.getWaypoints());
        // If auto-update is enabled, recalculate the route
        if (this.waypointsManager.autoUpdateRoute) {
            this.onPlanRoute();
        } else {
            // Show a notification that the route needs to be recalculated
            this.showNotification('Waypoint order has been changed. Click "Plan Route" to update.', 5000);
        }
    }

    /**
     * Handle waypoints being changed (added or removed)
     */
    handleWaypointsChanged() {
        // If auto-update is enabled, recalculate the route
        if (this.waypointsManager.autoUpdateRoute && this.originInput.value && this.destinationInput.value) {
            this.onPlanRoute();
        }
    }

    /**
     * Show a notification message
     * @param {string} message - Message to display
     * @param {number} duration - Duration in milliseconds
     */
    showNotification(message, duration = 5000) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.backgroundColor = '#ffeb3b';
        notification.style.color = '#000';
        notification.style.padding = '8px';
        notification.style.marginBottom = '10px';
        notification.style.borderRadius = '4px';
        notification.style.textAlign = 'center';

        // Add the notification before the route details
        if (this.routeDetails && this.routeDetails.parentNode) {
            this.routeDetails.parentNode.insertBefore(notification, this.routeDetails);

            // Remove the notification after the specified duration
            setTimeout(() => {
                notification.remove();
            }, duration);
        }
    }

    /**
     * Handle Excel file upload
     * @param {Event} event - File input change event
     */
    handleExcelUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        this.showSpinner(true);
        this.readExcelFile(file);
    }

    /**
     * Read and process Excel file
     * @param {File} file - Excel file to read
     */
    readExcelFile(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                this.processExcelData(workbook);
            } catch (error) {
                console.error('Error processing Excel file:', error);
                this.showError('Error processing Excel file: ' + error.message);
            } finally {
                this.showSpinner(false);
            }
        };

        reader.onerror = (error) => {
            console.error('Error reading Excel file:', error);
            this.showError('Error reading Excel file');
            this.showSpinner(false);
        };

        reader.readAsArrayBuffer(file);
    }

    /**
     * Process Excel data and extract addresses
     * @param {Object} workbook - XLSX workbook object
     */
    processExcelData(workbook) {
        try {
            // Get the first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert to JSON
            const data = XLSX.utils.sheet_to_json(worksheet);

            if (data.length === 0) {
                this.showError('Excel file does not contain any data');
                return;
            }

            console.log('Excel data:', data);

            // Look for address columns
            const possibleAddressColumns = ['Address', 'Adresa', 'Místo', 'Location', 'Lokalita'];
            let addressColumn = null;

            // Find the first matching column
            for (const column of possibleAddressColumns) {
                if (data[0].hasOwnProperty(column)) {
                    addressColumn = column;
                    break;
                }
            }

            // If no address column found, use the first column
            if (!addressColumn) {
                addressColumn = Object.keys(data[0])[0];
            }

            console.log('Using address column:', addressColumn);

            // Extract addresses
            const addresses = data.map(row => row[addressColumn]).filter(Boolean);

            if (addresses.length === 0) {
                this.showError('No addresses found in Excel file');
                return;
            }

            console.log('Extracted addresses:', addresses);

            // Set origin, destination, and waypoints
            if (addresses.length >= 2) {
                this.originInput.value = addresses[0];
                this.destinationInput.value = addresses[addresses.length - 1];

                // Add waypoints
                this.waypointsManager.clearWaypoints();
                for (let i = 1; i < addresses.length - 1; i++) {
                    this.waypointsManager.addWaypoint(addresses[i]);
                }
                this.waypointsManager.updateWaypointLetters();

                // Show success message
                this.showNotification(`Loaded ${addresses.length} addresses from Excel file`, 3000);
            } else {
                this.showError('Excel file must contain at least 2 addresses');
            }
        } catch (error) {
            console.error('Error processing Excel data:', error);
            this.showError('Error processing data from Excel file');
        }
    }

    /**
     * Validate input values
     * @returns {boolean} True if all inputs are valid
     */
    validateInputs() {
        // Validate origin
        if (!this.originInput.value || this.originInput.value.trim().length === 0) {
            this.showError('Please enter a starting point');
            this.originInput.focus();
            return false;
        }

        // Validate destination
        if (!this.destinationInput.value || this.destinationInput.value.trim().length === 0) {
            this.showError('Please enter a destination');
            this.destinationInput.focus();
            return false;
        }

        // Validate waypoints
        const waypoints = this.waypointsManager.getWaypoints();
        for (let i = 0; i < waypoints.length; i++) {
            if (!waypoints[i] || waypoints[i].trim().length === 0) {
                this.showError(`Waypoint ${i+1} cannot be empty`);
                return false;
            }

            // Limit waypoint length for security
            if (waypoints[i].length > 500) {
                this.showError(`Waypoint ${i+1} is too long (max 500 characters)`);
                return false;
            }
        }

        // Validate departure time if provided
        if (this.departureTimeInput.value) {
            const departureDate = new Date(this.departureTimeInput.value);
            if (isNaN(departureDate.getTime())) {
                this.showError('Invalid departure time format');
                this.departureTimeInput.focus();
                return false;
            }
        }

        return true;
    }

    /**
     * Plan a route based on current inputs
     */
    async onPlanRoute() {
        try {
            // Validate all inputs
            if (!this.validateInputs()) {
                return;
            }

            // Show loading spinner
            this.showSpinner(true);

            // Get waypoints
            const waypoints = this.waypointsManager.getWaypoints();

            // Get departure time
            let departureTime = null;
            if (this.departureTimeInput.value) {
                departureTime = new Date(this.departureTimeInput.value).toISOString();
            }

            // Get route options
            const useHighways = this.useHighwaysCheckbox.checked;
            const useRouteType = this.useRouteTypeCheckbox ? this.useRouteTypeCheckbox.checked : true;
            const routeMode = useRouteType ? this.routeModeSelect.value : 'time';

            // We don't need to check for duplicate requests anymore
            // The cache manager in RouteService will handle that

            // Prepare request data
            const requestData = {
                start: this.originInput.value.trim(),
                end: this.destinationInput.value.trim(),
                waypoints: waypoints.map(wp => wp.trim()),
                use_highways: useHighways,
                mode: routeMode,
                departure_time: departureTime
            };

            console.log('Planning route with data:', requestData);

            // Send request to backend
            const route = await this.routeService.planRoute(requestData);

            // Log the complete route data for debugging
            console.log('Received route data:', JSON.stringify(route, null, 2));

            // Process the route data to ensure all stops have distance and duration information
            if (route.stops && route.stops.length > 0) {
                // First, get leg data directly from Google directions if available
                let legData = [];
                let hasValidDirections = false;

                if (route.directions && route.directions.routes && route.directions.routes.length > 0 &&
                    route.directions.routes[0].legs && route.directions.routes[0].legs.length > 0) {
                    legData = route.directions.routes[0].legs;
                    hasValidDirections = true;
                    console.log('Using Google Directions API data for route calculations');
                }

                // Calculate total distance and duration from Google directions data
                let totalDistance = 0;
                let totalDuration = 0;

                if (hasValidDirections) {
                    // Use Google directions data for accurate calculations
                    legData.forEach(leg => {
                        if (leg.distance && leg.distance.value) {
                            totalDistance += leg.distance.value;
                        }

                        if (leg.duration && leg.duration.value) {
                            totalDuration += leg.duration.value;
                        }
                    });

                    console.log(`Total distance from Google: ${totalDistance} meters, duration: ${totalDuration} seconds`);

                    // Process each stop to ensure it has distance and duration information
                    for (let i = 1; i < route.stops.length; i++) {
                        const stop = route.stops[i];
                        const legIndex = i - 1;

                        // Use leg data from Google directions
                        if (legIndex < legData.length) {
                            const leg = legData[legIndex];

                            // Set distance from Google data
                            if (leg.distance && leg.distance.value) {
                                stop.distance = leg.distance.value;
                            }

                            // Set duration from Google data
                            if (leg.duration && leg.duration.value) {
                                stop.duration = leg.duration.value;
                            }

                            // Set arrival time if available
                            if (leg.arrival_time) {
                                stop.arrival_time = leg.arrival_time.text || leg.arrival_time;
                            }
                        }
                    }
                } else {
                    // Fallback to backend data if Google directions not available
                    console.log('No Google Directions data available, using backend data');

                    // Check if we have distance/time in the route object
                    if (route.distance) {
                        totalDistance = parseFloat(route.distance) * 1000; // Convert km to meters
                    }

                    if (route.time) {
                        totalDuration = parseFloat(route.time) * 60; // Convert minutes to seconds
                    }
                }

                // Set the calculated totals
                route.total_distance = totalDistance;
                route.total_duration = totalDuration;

                console.log(`Final route totals: ${route.total_distance} meters, ${route.total_duration} seconds`);
            }

            // Update last optimized route tracking
            // Store the route request data as a simple identifier
            this.lastOptimizedRoute = JSON.stringify(requestData);
            this.lastOptimizedWaypoints = [...waypoints];

            // Update UI with route data
            this.displayRouteDetails(route);

            // Render route on map
            this.mapManager.renderRoute(route);

            // Update waypoints if they were optimized
            this.waypointsManager.updateWaypointsFromOptimizedRoute(route);

            // Update export manager
            this.exportManager.setRouteData(route);
            this.exportManager.updateExportButtons(this.exportExcelButton, this.exportGpsButton);

        } catch (error) {
            console.error('Error planning route:', error);

            // Provide user-friendly error messages based on error type
            let errorMessage = 'An error occurred while planning the route.';

            if (error.message) {
                if (error.message.includes('API key')) {
                    errorMessage = 'Google Maps API key is invalid or missing. Please check your API key in the settings.';
                } else if (error.message.includes('ZERO_RESULTS')) {
                    errorMessage = 'No route found between the specified locations. Please check your addresses.';
                } else if (error.message.includes('OVER_QUERY_LIMIT')) {
                    errorMessage = 'You have exceeded your Google Maps API quota. Please try again later.';
                } else if (error.message.includes('REQUEST_DENIED')) {
                    errorMessage = 'The request was denied. Your API key may not have the necessary permissions.';
                } else if (error.message.includes('INVALID_REQUEST')) {
                    errorMessage = 'The request was invalid. Please check your addresses.';
                } else if (error.message.includes('UNKNOWN_ERROR')) {
                    errorMessage = 'An unknown error occurred. Please try again later.';
                } else if (error.message.includes('NOT_FOUND')) {
                    errorMessage = 'One or more of the specified locations could not be found. Please check your addresses.';
                } else if (error.message.includes('MAX_WAYPOINTS_EXCEEDED')) {
                    errorMessage = 'You have exceeded the maximum number of waypoints allowed. Please reduce the number of stops.';
                } else if (error.message.includes('MAX_ROUTE_LENGTH_EXCEEDED')) {
                    errorMessage = 'The route is too long. Please reduce the distance between stops.';
                } else if (error.message.includes('network')) {
                    errorMessage = 'A network error occurred. Please check your internet connection and try again.';
                } else {
                    // Include the original error message for other cases
                    errorMessage = `Error planning route: ${error.message}`;
                }
            }

            this.showError(errorMessage);
        } finally {
            this.showSpinner(false);
        }
    }

    /**
     * Display route details in the UI
     * @param {Object} route - Route data from the API
     */
    displayRouteDetails(route) {
        if (!route) {
            this.routeDetails.innerHTML = '<p>No route data available</p>';
            return;
        }

        let html = '<div class="route-summary">';

        // Add total distance and duration in a prominent section at the top
        html += '<div class="route-totals">';
        if (route.total_distance) {
            const formattedDistance = formatDistance(route.total_distance);
            html += `<div><strong>Total distance:</strong> ${formattedDistance}</div>`;
        } else {
            html += `<div><strong>Total distance:</strong> Unknown</div>`;
        }

        if (route.total_duration) {
            const formattedDuration = formatDuration(route.total_duration);
            html += `<div><strong>Total time:</strong> ${formattedDuration}</div>`;
        } else {
            html += `<div><strong>Total time:</strong> Unknown</div>`;
        }

        // Calculate and display traffic delay if available
        if (route.directions && route.directions.routes &&
            route.directions.routes[0] && route.directions.routes[0].legs) {

            let totalDurationInTraffic = 0;
            let totalDuration = 0;

            route.directions.routes[0].legs.forEach(leg => {
                if (leg.duration_in_traffic && leg.duration_in_traffic.value) {
                    totalDurationInTraffic += leg.duration_in_traffic.value;
                }
                if (leg.duration && leg.duration.value) {
                    totalDuration += leg.duration.value;
                }
            });

            if (totalDurationInTraffic > 0 && totalDuration > 0) {
                const trafficDelay = totalDurationInTraffic - totalDuration;

                if (trafficDelay > 0) {
                    const formattedDelay = formatDuration(trafficDelay);
                    html += `<div><strong>Traffic delay:</strong> <span style="color: #f44336;">+${formattedDelay}</span></div>`;
                } else if (trafficDelay < 0) {
                    const formattedSaving = formatDuration(Math.abs(trafficDelay));
                    html += `<div><strong>Traffic saving:</strong> <span style="color: #4CAF50;">-${formattedSaving}</span></div>`;
                } else {
                    html += `<div><strong>Traffic:</strong> No delays</div>`;
                }
            }
        }

        // Calculate departure and arrival times
        let departureTime = null;
        if (this.departureTimeInput && this.departureTimeInput.value) {
            departureTime = new Date(this.departureTimeInput.value);

            if (!isNaN(departureTime.getTime())) {
                // Always show date for departure time
                const formattedDepartureTime = formatTimeWithPeriod(departureTime, null, true);
                html += `<div><strong>Departure time:</strong> ${formattedDepartureTime}</div>`;

                // Calculate estimated arrival time
                if (route.total_duration) {
                    const arrivalTime = new Date(departureTime.getTime() + (route.total_duration * 1000));
                    // Show date for arrival time, comparing with departure time
                    const formattedArrivalTime = formatTimeWithPeriod(arrivalTime, departureTime);
                    html += `<div><strong>Estimated arrival:</strong> ${formattedArrivalTime}</div>`;
                }
            }
        }

        html += '</div>';

        // Add stops details
        if (route.stops && route.stops.length > 0) {
            html += '<div class="route-stops">';
            html += '<h3>Stops:</h3>';

            // Calculate cumulative time for arrival at each stop
            let cumulativeTime = 0;

            route.stops.forEach((stop, index) => {
                const letter = String.fromCharCode(65 + index);
                const stopType = index === 0 ? 'Start' : (index === route.stops.length - 1 ? 'Destination' : 'Waypoint');

                html += `<div class="route-point-row">
                    <div class="route-point-marker">${letter}</div>
                    <div class="route-point-label">${stopType}</div>
                    <div class="route-point-details">
                        <div><strong>${stop.address || 'Unknown address'}</strong></div>`;

                // Always show distance and duration for all stops except the first one
                if (index > 0) {
                    // Distance from previous stop - ensure we have a valid value
                    let distanceValue = stop.distance;
                    if (distanceValue) {
                        // If it's an object with a value property (Google Maps format)
                        if (typeof distanceValue === 'object' && distanceValue.value) {
                            distanceValue = distanceValue.value;
                        }
                        // If it's a string that might contain non-numeric characters
                        else if (typeof distanceValue === 'string') {
                            const match = distanceValue.match(/[\d.]+/);
                            if (match) {
                                distanceValue = parseFloat(match[0]);
                            }
                        }
                    } else {
                        // If no distance data available, try to get it from Google directions
                        if (route.directions && route.directions.routes &&
                            route.directions.routes[0] && route.directions.routes[0].legs &&
                            route.directions.routes[0].legs[index-1] &&
                            route.directions.routes[0].legs[index-1].distance) {

                            distanceValue = route.directions.routes[0].legs[index-1].distance.value;
                        }
                    }

                    const formattedDistance = formatDistance(distanceValue);
                    html += `<div><small>Distance: ${formattedDistance}</small></div>`;

                    // Duration from previous stop - ensure we have a valid value
                    let durationValue = stop.duration;
                    let durationInTrafficValue = 0;

                    // Check if we have traffic information
                    if (route.directions && route.directions.routes &&
                        route.directions.routes[0] && route.directions.routes[0].legs &&
                        route.directions.routes[0].legs[index-1]) {

                        const leg = route.directions.routes[0].legs[index-1];

                        if (leg.duration_in_traffic && leg.duration_in_traffic.value) {
                            durationInTrafficValue = leg.duration_in_traffic.value;
                        }
                    }

                    if (durationValue) {
                        // If it's an object with a value property (Google Maps format)
                        if (typeof durationValue === 'object' && durationValue.value) {
                            durationValue = durationValue.value;
                        }
                        // If it's a string that might contain non-numeric characters
                        else if (typeof durationValue === 'string') {
                            const match = durationValue.match(/[\d.]+/);
                            if (match) {
                                durationValue = parseFloat(match[0]);
                            }
                        }
                    } else {
                        // If no duration data available, try to get it from Google directions
                        if (route.directions && route.directions.routes &&
                            route.directions.routes[0] && route.directions.routes[0].legs &&
                            route.directions.routes[0].legs[index-1] &&
                            route.directions.routes[0].legs[index-1].duration) {

                            durationValue = route.directions.routes[0].legs[index-1].duration.value;
                        }
                    }

                    // Add to cumulative time for arrival calculation
                    if (durationInTrafficValue > 0) {
                        cumulativeTime += durationInTrafficValue;
                    } else {
                        cumulativeTime += durationValue || 0;
                    }

                    const formattedDuration = formatDuration(durationValue);
                    html += `<div><small>Time: ${formattedDuration}</small></div>`;

                    // Show traffic delay if available
                    if (durationInTrafficValue > 0 && durationValue > 0) {
                        const trafficDelay = durationInTrafficValue - durationValue;

                        if (trafficDelay > 0) {
                            const formattedDelay = formatDuration(trafficDelay);
                            html += `<div><small>Traffic delay: <span style="color: #f44336;">+${formattedDelay}</span></small></div>`;

                            // Show time with traffic
                            const formattedDurationWithTraffic = formatDuration(durationInTrafficValue);
                            html += `<div><small>Time with traffic: ${formattedDurationWithTraffic}</small></div>`;
                        } else if (trafficDelay < 0) {
                            const formattedSaving = formatDuration(Math.abs(trafficDelay));
                            html += `<div><small>Traffic saving: <span style="color: #4CAF50;">-${formattedSaving}</span></small></div>`;
                        } else {
                            html += `<div><small>No traffic impact</small></div>`;
                        }
                    }

                    // Calculate and show arrival time if departure time is set
                    if (departureTime && !isNaN(departureTime.getTime())) {
                        const arrivalTime = new Date(departureTime.getTime() + (cumulativeTime * 1000));
                        // Show date for arrival time if it's different from departure date
                        const formattedArrivalTime = formatTimeWithPeriod(arrivalTime, departureTime);
                        html += `<div><small>Estimated arrival: ${formattedArrivalTime}</small></div>`;
                    }
                    // Or show arrival time from API if available
                    else if (stop.arrival_time) {
                        let arrivalTime = stop.arrival_time;
                        // If it's an object with a text property (Google Maps format)
                        if (typeof arrivalTime === 'object') {
                            if (arrivalTime.text) {
                                arrivalTime = arrivalTime.text;
                            } else if (arrivalTime.value) {
                                // If it's a timestamp, convert to Date
                                arrivalTime = new Date(arrivalTime.value * 1000);
                            }
                        } else if (typeof arrivalTime === 'string' && !isNaN(Date.parse(arrivalTime))) {
                            // If it's a date string, convert to Date
                            arrivalTime = new Date(arrivalTime);
                        }

                        // Format the arrival time
                        let formattedArrival;
                        if (arrivalTime instanceof Date) {
                            formattedArrival = formatTimeWithPeriod(arrivalTime, departureTime);
                        } else {
                            formattedArrival = arrivalTime;
                        }

                        html += `<div><small>Arrival: ${formattedArrival}</small></div>`;
                    }
                }

                html += `</div>
                </div>`;
            });

            html += '</div>';
        }

        html += '</div>';
        this.routeDetails.innerHTML = html;
    }

    /**
     * Show or hide the loading spinner
     * @param {boolean} show - Whether to show the spinner
     */
    showSpinner(show) {
        if (!this.spinner) {
            return;
        }

        if (show) {
            this.spinner.innerHTML = '<div class="spinner">Loading...</div>';
        } else {
            this.spinner.innerHTML = '';
        }
    }

    /**
     * Show an error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        console.error('Error:', message);

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.backgroundColor = '#f44336';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '10px';
        errorDiv.style.marginBottom = '10px';
        errorDiv.style.borderRadius = '4px';
        errorDiv.style.textAlign = 'center';
        errorDiv.textContent = message;

        // Add the error before the route details
        if (this.routeDetails && this.routeDetails.parentNode) {
            this.routeDetails.parentNode.insertBefore(errorDiv, this.routeDetails);

            // Remove the error after 5 seconds
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
        }
    }

    /**
     * Show a notification message
     * @param {string} message - Message to display
     * @param {number} [duration=3000] - Duration in milliseconds
     */
    showNotification(message, duration = 3000) {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'notification-message';
        notificationDiv.style.backgroundColor = '#4CAF50';
        notificationDiv.style.color = 'white';
        notificationDiv.style.padding = '10px';
        notificationDiv.style.marginBottom = '10px';
        notificationDiv.style.borderRadius = '4px';
        notificationDiv.style.textAlign = 'center';
        notificationDiv.style.position = 'fixed';
        notificationDiv.style.bottom = '20px';
        notificationDiv.style.left = '50%';
        notificationDiv.style.transform = 'translateX(-50%)';
        notificationDiv.style.zIndex = '1000';
        notificationDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        notificationDiv.style.minWidth = '200px';
        notificationDiv.textContent = message;

        // Add to the body
        document.body.appendChild(notificationDiv);

        // Remove after the specified duration
        setTimeout(() => {
            // Add fade-out effect
            notificationDiv.style.transition = 'opacity 0.5s';
            notificationDiv.style.opacity = '0';

            // Remove from DOM after fade completes
            setTimeout(() => {
                notificationDiv.remove();
            }, 500);
        }, duration);
    }

    /**
     * Clear the route cache and show a notification
     */
    clearRouteCache() {
        try {
            // Clear the cache in the route service
            this.routeService.clearCache();

            // Reset the last optimized route tracking
            this.lastOptimizedRoute = null;
            this.lastOptimizedWaypoints = [];

            // Show a success notification
            this.showNotification('Route cache has been cleared', 3000);

            console.log('Route cache cleared');
        } catch (error) {
            console.error('Error clearing route cache:', error);
            this.showError('Error clearing cache: ' + error.message);
        }
    }

    /**
     * Toggle sidebar visibility on mobile devices
     */
    toggleSidebar() {
        if (!this.container) return;

        // Toggle the sidebar-hidden class
        this.container.classList.toggle('sidebar-hidden');

        // Update the map size after toggling to ensure it renders correctly
        if (window.google && window.google.maps && this.mapManager && this.mapManager.map) {
            // Trigger a resize event on the map after a short delay
            setTimeout(() => {
                google.maps.event.trigger(this.mapManager.map, 'resize');

                // If we have a current route with bounds, fit to those bounds
                if (this.currentRoute && this.currentRoute.bounds) {
                    this.mapManager.map.fitBounds(this.currentRoute.bounds);
                }
            }, 100);
        }
    }
}
