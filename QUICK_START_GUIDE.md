# Route Planner Quick Start Guide

## Getting Started

This guide will help you quickly get up and running with the Route Planner application.

### Installation

1. Follow the installation instructions in the README.md file.
2. Make sure you have a valid Google Maps API key in your `.env` file.
3. Start the application using one of the methods described in the README.md.
4. Open your browser and navigate to http://localhost:5000.

## Main Functions

### 1. Planning a Route

![Planning a Route](https://via.placeholder.com/800x400?text=Route+Planning+Screenshot)

#### Basic Route
1. Enter your starting point in the "Start" field.
2. Enter your destination in the "Destination" field.
3. Click "Plan Route" to calculate and display the route.

#### Adding Waypoints
1. Click the "Add Waypoint" button to add a stop between your start and destination.
2. Enter the address for the waypoint.
3. Add as many waypoints as needed.
4. Reorder waypoints by dragging and dropping them in the list.

#### Setting Departure Time
1. Click the departure time field.
2. Select a date and time for your departure.
3. This will enable traffic predictions and arrival time estimates.

### 2. Route Options

![Route Options](https://via.placeholder.com/800x200?text=Route+Options+Screenshot)

#### Fastest vs. Shortest Route
- Select "Fastest" to prioritize travel time (default).
- Select "Shortest" to prioritize distance.

#### Highway Preferences
- Toggle "Use Highways" to include or exclude highways from your route.

### 3. Viewing Route Details

![Route Details](https://via.placeholder.com/800x400?text=Route+Details+Screenshot)

After planning a route, you'll see:
- Total distance and duration
- Traffic delay information
- Departure and estimated arrival times
- For each waypoint:
  - Distance from previous point
  - Travel time
  - Traffic conditions
  - Estimated arrival time

### 4. Working with Excel Files

![Excel Import/Export](https://via.placeholder.com/800x200?text=Excel+Features+Screenshot)

#### Importing Addresses
1. Prepare an Excel file with addresses in a column.
2. Click "Browse" next to the Excel upload field.
3. Select your Excel file.
4. The addresses will be loaded as waypoints.

#### Exporting Route Data
1. After calculating a route, click "Export to Excel".
2. The route details will be downloaded as an Excel file.

### 5. Map Interaction

![Map Interaction](https://via.placeholder.com/800x400?text=Map+Interaction+Screenshot)

- **Zoom**: Use the mouse wheel or pinch gestures to zoom in/out.
- **Pan**: Click and drag to move the map.
- **Markers**: Click on markers to see information about each location.
- **Route Line**: The calculated route is shown as a colored line on the map.

## Tips and Tricks

- **Address Autocomplete**: As you type in the address fields, suggestions will appear to help you enter valid locations.
- **Reordering Waypoints**: After reordering waypoints, click "Plan Route" again to update the route.
- **Traffic Information**: For the most accurate traffic predictions, set a departure time close to when you plan to travel.
- **Mobile View**: On mobile devices, you can toggle the sidebar to see more of the map.

## Need More Help?

For detailed information about all features and functions, please refer to the full DOCUMENTATION.md file.
