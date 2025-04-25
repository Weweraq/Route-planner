/**
 * Main application entry point
 */
import { MapManager } from './map-manager.js';
import { RouteService } from './route-service.js';
import { UIController } from './ui-controller.js';

/**
 * Initialize the application
 */
export function initApp() {
    console.log('initApp called');
    try {
        // Create map manager
        const mapManager = new MapManager('gmap');
        console.log('MapManager created');
        mapManager.initMap();
        console.log('Map initialized');

        // Create route service
        const routeService = new RouteService('');
        console.log('RouteService created');

        // Create UI controller
        const uiController = new UIController(mapManager, routeService);
        console.log('UIController created');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing app...');
    initApp();
});
