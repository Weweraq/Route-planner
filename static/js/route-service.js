/**
 * RouteService handles communication with backend API
 */
import { CacheManager } from './cache-manager.js';

export class RouteService {
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
        this.cacheManager = new CacheManager();
    }

    /**
     * Validate request data before sending to server
     * @param {Object} data - Request data to validate
     * @throws {Error} If data is invalid
     */
    validateRequestData(data) {
        if (!data) {
            throw new Error('No request data provided');
        }

        // Validate required fields
        if (!data.start || typeof data.start !== 'string' || data.start.trim().length === 0) {
            throw new Error('Origin (start) is required and must be a non-empty string');
        }

        if (!data.end || typeof data.end !== 'string' || data.end.trim().length === 0) {
            throw new Error('Destination (end) is required and must be a non-empty string');
        }

        // Validate waypoints if present
        if (data.waypoints) {
            if (!Array.isArray(data.waypoints)) {
                throw new Error('Waypoints must be an array');
            }

            // Check each waypoint
            data.waypoints.forEach((waypoint, index) => {
                if (typeof waypoint !== 'string' || waypoint.trim().length === 0) {
                    throw new Error(`Waypoint ${index + 1} must be a non-empty string`);
                }
            });
        }

        // Validate optional fields
        if (data.departure_time !== undefined && data.departure_time !== null) {
            if (typeof data.departure_time !== 'string' && !(data.departure_time instanceof Date)) {
                throw new Error('Departure time must be a string or Date object');
            }
        }

        if (data.use_highways !== undefined && typeof data.use_highways !== 'boolean') {
            throw new Error('use_highways must be a boolean value');
        }

        if (data.mode !== undefined) {
            const validModes = ['time', 'distance', 'shortest'];
            if (!validModes.includes(data.mode)) {
                throw new Error(`Invalid route mode: ${data.mode}. Must be one of: ${validModes.join(', ')}`);
            }
        }
    }

    /**
     * Plan a route with the given parameters
     * @param {Object} data - Route request data
     * @param {boolean} [useCache=true] - Whether to use cached data if available
     * @returns {Promise<Object>} Route data
     * @throws {Error} If request fails
     */
    async planRoute(data, useCache = true) {
        try {
            // Validate request data
            this.validateRequestData(data);

            // Always ensure we have a departure time for traffic information
            if (!data.departure_time) {
                data.departure_time = new Date().toISOString();
                console.log('Setting current time as departure time for traffic information');
            }

            // Set traffic model to best_guess if not specified
            if (!data.traffic_model) {
                data.traffic_model = 'best_guess';
            }

            // Check cache first if enabled
            if (useCache) {
                const cachedRoute = this.cacheManager.getCachedRoute(data);
                if (cachedRoute) {
                    console.log('Using cached route data');
                    return cachedRoute;
                }
            }

            const endpoint = `${this.apiBaseUrl}/route`;
            console.log('Sending route request to:', endpoint);
            console.log('Request data:', data);

            // Set timeout for the request (30 seconds)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                    signal: controller.signal
                });

                // Clear the timeout
                clearTimeout(timeoutId);

                if (!response.ok) {
                    let errorMessage = `Server returned ${response.status} ${response.statusText}`;
                    try {
                        const errorData = await response.json();
                        if (errorData && errorData.error) {
                            errorMessage = errorData.error;
                        }
                    } catch (e) {
                        // If we can't parse JSON, try to get text
                        try {
                            const errorText = await response.text();
                            if (errorText) {
                                errorMessage = errorText;
                            }
                        } catch (textError) {
                            // Ignore text parsing error
                        }
                    }
                    throw new Error(`API error: ${errorMessage}`);
                }

                const routeData = await response.json();
                console.log('Received route data:', routeData);

                // Check for error in response data
                if (routeData.error) {
                    throw new Error(`API error: ${routeData.error}`);
                }

                // Verify the directions object is present and valid
                if (routeData.directions) {
                    console.log('Directions object present, routes:',
                        routeData.directions.routes ? routeData.directions.routes.length : 'none');
                } else {
                    console.warn('No directions object in response');
                }

                // Cache the successful response
                if (useCache) {
                    this.cacheManager.cacheRoute(data, routeData);
                }

                return routeData;
            } catch (fetchError) {
                // Clear the timeout if fetch fails
                clearTimeout(timeoutId);

                // Handle abort error specifically
                if (fetchError.name === 'AbortError') {
                    throw new Error('Request timed out. Please try again.');
                }

                throw fetchError;
            }
        } catch (error) {
            console.error('Error in planRoute:', error);
            throw new Error(`Failed to fetch route: ${error.message}`);
        }
    }

    /**
     * Clear the route cache
     */
    clearCache() {
        this.cacheManager.clearCache();
    }
}
