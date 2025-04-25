/**
 * ExportManager handles exporting route data to different formats
 */
export class ExportManager {
    constructor() {
        this.currentRoute = null;
    }

    /**
     * Set the current route data
     * @param {Object} route - Route data from the API
     */
    setRouteData(route) {
        this.currentRoute = route;
    }

    /**
     * Export route data to Excel
     */
    exportToExcel() {
        if (!this.currentRoute || !this.currentRoute.stops) {
            console.error('No route data available for export');
            return false;
        }

        try {
            // Create a new workbook
            const wb = XLSX.utils.book_new();

            // Create data for the stops sheet
            const stopsData = [
                ['Stop', 'Address', 'Latitude', 'Longitude', 'Distance', 'Duration', 'Arrival Time']
            ];

            this.currentRoute.stops.forEach((stop, index) => {
                const letter = String.fromCharCode(65 + index);
                stopsData.push([
                    letter,
                    stop.address || '',
                    stop.lat || '',
                    stop.lng || '',
                    stop.distance || '',
                    stop.duration || '',
                    stop.arrival_time || ''
                ]);
            });

            // Create a worksheet for stops
            const stopsWs = XLSX.utils.aoa_to_sheet(stopsData);

            // Add the worksheet to the workbook
            XLSX.utils.book_append_sheet(wb, stopsWs, 'Stops');

            // Create data for the route sheet
            const routeData = [
                ['Property', 'Value']
            ];

            routeData.push(['Total Distance', this.currentRoute.total_distance || '']);
            routeData.push(['Total Duration', this.currentRoute.total_duration || '']);
            routeData.push(['Start Time', this.currentRoute.start_time || '']);
            routeData.push(['End Time', this.currentRoute.end_time || '']);
            routeData.push(['Avoid Highways', this.currentRoute.avoidHighways ? 'Yes' : 'No']);

            // Create a worksheet for route summary
            const routeWs = XLSX.utils.aoa_to_sheet(routeData);

            // Add the worksheet to the workbook
            XLSX.utils.book_append_sheet(wb, routeWs, 'Route Summary');

            // Generate Excel file
            const excelFileName = `route_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, excelFileName);

            console.log('Route exported to Excel:', excelFileName);
            return true;
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            return false;
        }
    }

    /**
     * Export GPS coordinates in GPX format
     */
    exportGpsCoordinates() {
        if (!this.currentRoute || !this.currentRoute.stops) {
            console.error('No route data available for GPS export');
            return false;
        }

        try {
            // Create GPX content
            let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Route Planner" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Route ${new Date().toISOString().slice(0, 10)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <rte>
    <name>Planned Route</name>
`;

            // Add route points
            this.currentRoute.stops.forEach((stop, index) => {
                if (stop.lat && stop.lng) {
                    const letter = String.fromCharCode(65 + index);
                    gpxContent += `    <rtept lat="${stop.lat}" lon="${stop.lng}">
      <name>Stop ${letter}</name>
      <desc>${stop.address || `Stop ${letter}`}</desc>
    </rtept>
`;
                }
            });

            // Close GPX tags
            gpxContent += `  </rte>
</gpx>`;

            // Create a Blob with the GPX content
            const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });

            // Create a download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `route_${new Date().toISOString().slice(0, 10)}.gpx`;

            // Trigger the download
            document.body.appendChild(a);
            a.click();

            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);

            console.log('GPS coordinates exported as GPX');
            return true;
        } catch (error) {
            console.error('Error exporting GPS coordinates:', error);
            return false;
        }
    }

    /**
     * Enable or disable export buttons based on route availability
     * @param {HTMLElement} excelButton - Excel export button
     * @param {HTMLElement} gpsButton - GPS export button
     */
    updateExportButtons(excelButton, gpsButton) {
        const hasValidRoute = this.currentRoute && this.currentRoute.stops && this.currentRoute.stops.length > 0;

        if (excelButton) {
            excelButton.disabled = !hasValidRoute;
        }

        if (gpsButton) {
            gpsButton.disabled = !hasValidRoute;
        }
    }
}
