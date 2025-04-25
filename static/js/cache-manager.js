/**
 * CacheManager handles caching of route data to improve performance
 */
export class CacheManager {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 20; // Maximum number of routes to cache
        this.cacheDuration = 30 * 60 * 1000; // Cache duration in milliseconds (30 minutes)
    }
    
    /**
     * Generate a cache key from route request data
     * @param {Object} requestData - Route request data
     * @returns {string} Cache key
     */
    generateCacheKey(requestData) {
        // Create a normalized version of the request data for consistent cache keys
        const normalizedData = {
            start: requestData.start.trim(),
            end: requestData.end.trim(),
            waypoints: Array.isArray(requestData.waypoints) 
                ? requestData.waypoints.map(wp => wp.trim()) 
                : [],
            use_highways: !!requestData.use_highways,
            mode: requestData.mode || 'time',
            departure_time: requestData.departure_time || null
        };
        
        return JSON.stringify(normalizedData);
    }
    
    /**
     * Store route data in cache
     * @param {Object} requestData - Route request data
     * @param {Object} routeData - Route response data
     */
    cacheRoute(requestData, routeData) {
        // Don't cache if there was an error
        if (routeData.error) {
            return;
        }
        
        const cacheKey = this.generateCacheKey(requestData);
        
        // Store in cache with timestamp
        this.cache.set(cacheKey, {
            data: routeData,
            timestamp: Date.now()
        });
        
        // Prune cache if it exceeds max size
        this.pruneCache();
        
        console.log(`Route cached with key: ${cacheKey}`);
    }
    
    /**
     * Get cached route data if available
     * @param {Object} requestData - Route request data
     * @returns {Object|null} Cached route data or null if not found
     */
    getCachedRoute(requestData) {
        const cacheKey = this.generateCacheKey(requestData);
        
        // Check if we have this route in cache
        if (!this.cache.has(cacheKey)) {
            return null;
        }
        
        const cachedItem = this.cache.get(cacheKey);
        const now = Date.now();
        
        // Check if cache has expired
        if (now - cachedItem.timestamp > this.cacheDuration) {
            console.log(`Cache expired for key: ${cacheKey}`);
            this.cache.delete(cacheKey);
            return null;
        }
        
        console.log(`Cache hit for key: ${cacheKey}`);
        return cachedItem.data;
    }
    
    /**
     * Remove oldest items from cache if it exceeds max size
     */
    pruneCache() {
        if (this.cache.size <= this.maxCacheSize) {
            return;
        }
        
        // Convert to array for sorting
        const cacheEntries = Array.from(this.cache.entries());
        
        // Sort by timestamp (oldest first)
        cacheEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Remove oldest entries until we're under the limit
        const entriesToRemove = cacheEntries.slice(0, cacheEntries.length - this.maxCacheSize);
        
        for (const [key] of entriesToRemove) {
            this.cache.delete(key);
            console.log(`Removed old cache entry: ${key}`);
        }
    }
    
    /**
     * Clear all cached routes
     */
    clearCache() {
        this.cache.clear();
        console.log('Route cache cleared');
    }
}
