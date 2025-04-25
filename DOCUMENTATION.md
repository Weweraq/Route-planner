# Route Planner Application Documentation

## Overview

The Route Planner is a web application that allows users to plan and visualize routes between multiple locations using Google Maps API. It provides detailed information about routes including distance, duration, traffic conditions, and estimated arrival times.

## Core Features

### 1. Route Planning

#### Basic Route Planning
- **Start and Destination Points**: Enter any address or location for your starting point and destination.
- **Waypoints**: Add multiple stops between your start and destination points.
- **Route Calculation**: Calculate the optimal route between all points.

#### Route Options
- **Fastest Route**: Calculate the route with the shortest travel time (considers traffic).
- **Shortest Route**: Calculate the route with the shortest distance.
- **Highway Avoidance**: Option to avoid highways in route calculation.

### 2. Traffic Information

- **Real-time Traffic**: Display current traffic conditions along the route.
- **Traffic Delays**: Show estimated delays due to traffic.
- **Traffic Model**: Uses Google Maps' "best guess" traffic model for predictions.

### 3. Time Management

- **Departure Time**: Set a specific departure time for your journey.
- **Arrival Time Estimation**: Display estimated arrival times for each waypoint and final destination.
- **Time Format**: Times are displayed with "morning" and "afternoon" instead of AM/PM.
- **Date Display**: Shows dates alongside times to indicate if arrivals are on the same or next day.

### 4. Data Import/Export

- **Excel Import**: Import addresses from Excel (.xlsx) files.
- **Excel Export**: Export route details to Excel for offline use.
- **GPS Export**: Export route data in formats compatible with GPS devices.

### 5. Map Visualization

- **Interactive Map**: View the route on an interactive Google Map.
- **Waypoint Markers**: Clear markers for start, destination, and all waypoints.
- **Route Line**: Visual representation of the route on the map.

## User Interface Components

### Main Interface

- **Sidebar**: Contains input fields and controls for route planning.
- **Map Area**: Displays the Google Map with the planned route.
- **Route Details Panel**: Shows detailed information about the calculated route.

### Input Controls

- **Origin Input**: Text field with autocomplete for entering the starting point.
- **Destination Input**: Text field with autocomplete for entering the destination.
- **Waypoints List**: Dynamic list of waypoint inputs with drag-and-drop reordering.
- **Add Waypoint Button**: Adds a new waypoint input field.
- **Departure Time Picker**: Date and time picker for setting departure time.
- **Route Options**: Checkboxes and dropdowns for route preferences.

### Route Information Display

- **Total Distance**: Shows the total distance of the route.
- **Total Duration**: Shows the estimated total travel time.
- **Traffic Information**: Displays traffic delay information.
- **Departure/Arrival Times**: Shows departure and estimated arrival times.
- **Waypoint Details**: For each waypoint, shows:
  - Address
  - Distance from previous point
  - Travel time to reach
  - Traffic delay (if applicable)
  - Estimated arrival time

## How to Use the Application

### Planning a Basic Route

1. Enter a starting point in the "Start" field.
2. Enter a destination in the "Destination" field.
3. (Optional) Add waypoints by clicking "Add Waypoint" and entering addresses.
4. (Optional) Set a departure time.
5. Click "Plan Route" to calculate and display the route.

### Customizing Route Options

1. Use the "Route Type" dropdown to select between fastest and shortest routes.
2. Toggle "Use Highways" to include or exclude highways from the route.
3. Reorder waypoints by dragging and dropping them in the list.

### Importing Addresses from Excel

1. Prepare an Excel file with addresses in a column.
2. Click "Browse" next to the Excel upload field.
3. Select your Excel file.
4. The addresses will be loaded as waypoints.

### Exporting Route Data

1. After calculating a route, the export buttons will become active.
2. Click "Export to Excel" to download route details as an Excel file.
3. Click "Export for GPS" to download route data in a GPS-compatible format.

## Technical Details

### API Usage

The application uses the following Google Maps APIs:
- **Directions API**: For route calculation and traffic information.
- **Places API**: For address autocomplete functionality.
- **Maps JavaScript API**: For map display and interaction.

### Data Flow

1. User inputs are collected from the UI.
2. Route request is sent to the backend server.
3. Server communicates with Google Maps API.
4. Route data is processed and enhanced with additional information.
5. Results are returned to the frontend and displayed to the user.

### Configuration

The application can be configured through environment variables in the `.env` file:
- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key (required).
- `FLASK_ENV`: Application environment (development/production).
- `FLASK_DEBUG`: Enable/disable debug mode.
- `FLASK_PORT`: Port for the web server.
- `FLASK_HOST`: Host address for the web server.
- `DB_PATH`: Path to the database file.

## Troubleshooting

### Common Issues

- **No Route Found**: Ensure all addresses are valid and reachable by road.
- **API Key Error**: Check that your Google Maps API key is valid and has the necessary APIs enabled.
- **Missing Traffic Data**: Traffic information requires a valid departure time.
- **Excel Import Fails**: Ensure your Excel file has addresses in a recognizable column format.

### Getting Help

If you encounter issues not covered in this documentation, please:
1. Check the console for error messages (press F12 in most browsers).
2. Verify your Google Maps API key has the necessary permissions.
3. Contact the application administrator for further assistance.
