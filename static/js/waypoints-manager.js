/**
 * WaypointsManager handles waypoint operations and UI
 */
import { createElement } from './utils.js';

export class WaypointsManager {
    constructor(waypointsListElement) {
        this.waypointsList = waypointsListElement;
        this.waypoints = [];
        this.initSortable();
    }

    /**
     * Initialize Sortable.js for waypoints list
     */
    initSortable() {
        try {
            if (typeof Sortable !== 'undefined') {
                this.sortable = new Sortable(this.waypointsList, {
                    animation: 150,
                    handle: '.drag-handle',
                    ghostClass: 'sortable-ghost',
                    onEnd: this.onSortEnd.bind(this)
                });
                console.log('Waypoints sortable initialized');

                // Add property to track auto-update preference
                this.autoUpdateRoute = false;
            } else {
                console.error('Sortable library not loaded');
            }
        } catch (error) {
            console.error('Error initializing waypoints sortable:', error);
        }
    }

    /**
     * Handle the end of a sort operation
     * @param {Event} evt - Sortable.js event
     */
    onSortEnd(evt) {
        console.log('Waypoints reordered');
        // Update the letter markers after manual reordering
        this.updateWaypointLetters();

        // Trigger the onReorder callback if defined
        if (typeof this.onReorder === 'function') {
            this.onReorder(this.getWaypoints());
        }
    }

    /**
     * Set callback for when waypoints are reordered
     * @param {Function} callback - Function to call when waypoints are reordered
     */
    setOnReorderCallback(callback) {
        this.onReorder = callback;
    }

    /**
     * Add a new waypoint
     * @param {string} address - Optional address for the waypoint
     * @param {string} letter - Optional letter marker for the waypoint
     * @returns {HTMLElement} The created waypoint row element
     */
    addWaypoint(address = '', letter = '') {
        const index = this.waypointsList.children.length;
        const waypointLetter = letter || String.fromCharCode(67 + index); // C, D, E, etc. (A=origin, B=destination)

        const waypointRow = createElement('div', { className: 'waypoint-row' }, [
            createElement('div', { className: 'drag-handle' }, ['≡']),
            createElement('div', { className: 'waypoint-marker' }, [waypointLetter]),
            createElement('input', {
                type: 'text',
                className: 'waypoint',
                placeholder: 'Enter waypoint',
                value: address
            }),
            createElement('button', {
                className: 'remove-waypoint',
                type: 'button',
                title: 'Remove waypoint',
                onclick: (e) => this.removeWaypoint(e)
            }, ['×'])
        ]);

        this.waypointsList.appendChild(waypointRow);

        // Initialize Google Maps autocomplete for the new input
        try {
            const input = waypointRow.querySelector('input.waypoint');
            if (input && google && google.maps && google.maps.places) {
                new google.maps.places.Autocomplete(input);
            }
        } catch (error) {
            console.error('Error initializing autocomplete for waypoint:', error);
        }

        return waypointRow;
    }

    /**
     * Remove a waypoint
     * @param {Event} event - Click event from the remove button
     */
    removeWaypoint(event) {
        const button = event.target;
        const waypointRow = button.closest('.waypoint-row');

        if (waypointRow) {
            waypointRow.remove();
            this.updateWaypointLetters();

            // Trigger the onRemove callback if defined
            if (typeof this.onRemove === 'function') {
                this.onRemove(this.getWaypoints());
            }
        }
    }

    /**
     * Set callback for when waypoints are removed
     * @param {Function} callback - Function to call when waypoints are removed
     */
    setOnRemoveCallback(callback) {
        this.onRemove = callback;
    }

    /**
     * Update the letter markers for all waypoint rows
     */
    updateWaypointLetters() {
        const waypointRows = this.waypointsList.querySelectorAll('.waypoint-row');

        waypointRows.forEach((row, index) => {
            const marker = row.querySelector('.waypoint-marker');
            if (marker) {
                // C, D, E, etc. (A=origin, B=destination)
                marker.textContent = String.fromCharCode(67 + index);
            }
        });
    }

    /**
     * Get all waypoints as an array of address strings
     * @returns {Array<string>} Array of waypoint addresses
     */
    getWaypoints() {
        const waypoints = [];
        const waypointInputs = this.waypointsList.querySelectorAll('input.waypoint');

        waypointInputs.forEach(input => {
            if (input.value.trim()) {
                waypoints.push(input.value.trim());
            }
        });

        return waypoints;
    }

    /**
     * Clear all waypoints
     */
    clearWaypoints() {
        while (this.waypointsList.firstChild) {
            this.waypointsList.removeChild(this.waypointsList.firstChild);
        }
    }

    /**
     * Set waypoints from an array of addresses
     * @param {Array<string>} addresses - Array of waypoint addresses
     */
    setWaypoints(addresses) {
        this.clearWaypoints();

        addresses.forEach(address => {
            this.addWaypoint(address);
        });

        this.updateWaypointLetters();
    }

    /**
     * Update waypoints from an optimized route
     * @param {Object} route - Route object from the API
     * @param {boolean} forceUpdate - Whether to force update even if the route hasn't changed
     */
    updateWaypointsFromOptimizedRoute(route, forceUpdate = false) {
        if (!route || !route.stops || route.stops.length < 3) {
            console.log('No waypoints to update from route');
            return false;
        }

        // Extract just the waypoints (not origin or destination)
        const waypointStops = route.stops.slice(1, -1);

        // Check if we have any waypoints to update
        if (waypointStops.length === 0) {
            console.log('No waypoints in route to update from');
            return false;
        }

        // Get current waypoint addresses for comparison
        const currentWaypoints = this.getWaypoints();

        // If we already have the same waypoints in the same order, don't update
        if (!forceUpdate) {
            // Check if we have the same number of waypoints
            if (currentWaypoints.length === waypointStops.length) {
                // Check if all waypoints match
                let allMatch = true;
                for (let i = 0; i < currentWaypoints.length; i++) {
                    // Compare addresses (ignoring case and whitespace)
                    const current = currentWaypoints[i].toLowerCase().trim();
                    const optimized = (waypointStops[i].address || '').toLowerCase().trim();
                    if (current !== optimized) {
                        allMatch = false;
                        break;
                    }
                }

                if (allMatch) {
                    console.log('Waypoints already match optimized route, not updating');
                    return false;
                }
            }
        }

        // Clear existing waypoints
        this.clearWaypoints();

        // Add waypoints from the optimized route
        waypointStops.forEach(stop => {
            if (stop.address) {
                this.addWaypoint(stop.address);
            }
        });

        // Update the letter markers
        this.updateWaypointLetters();

        console.log('Updated waypoints from optimized route');
        return true;
    }
}
