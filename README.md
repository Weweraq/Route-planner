# Route Planner Application

This application is a route planning tool that uses Google Maps API to calculate routes between locations.

## Features
- Plan routes between any locations using Google Maps API
- Calculate fastest or shortest routes
- Display traffic information and delays
- Show estimated arrival times for each waypoint
- Support for multiple waypoints
- Import addresses from Excel files

## Project Structure

```
Windsurf-trasy/
├── app.py              # Flask application entry point
├── config.py            # Configuration (paths, keys, debug settings)
├── db.py                # Data layer (database operations)
├── algorithms.py        # Route calculation logic
├── routes.py            # Flask Blueprint with API routes
├── test_algorithms.py  # Tests for algorithms
├── test_db.py          # Tests for data layer
├── openapi.yaml        # OpenAPI/Swagger API documentation
├── requirements.txt    # Dependencies (Flask, pytest)
├── .env.example        # Example environment variables file
├── business/           # Business logic layer
│   └── route_planner.py # Route planning service
├── data/               # Data access layer
│   └── google_maps_client.py # Google Maps API client
├── static/             # Static files
│   ├── index.html      # Frontend (HTML)
│   ├── js/             # JavaScript modules
│   │   ├── app.js      # Main application
│   │   ├── map-manager.js # Map handling
│   │   ├── route-service.js # Route service
│   │   ├── ui-controller.js # UI interactions
│   │   └── utils.js    # Utility functions
│   └── css/            # Stylesheets
├── places.db           # SQLite database
└── README.md           # This file
```

## Installation

### Option 1: Easy Installation (Recommended)

Run the installation script which will set up everything for you:

```bash
python install.py
```

This script will:
1. Check Python version compatibility
2. Install dependencies
3. Create a `.env` file from `.env.example`
4. Initialize the database if needed
5. Create a start script for your operating system

After installation, edit the `.env` file to add your Google Maps API key.

### Option 2: Manual Installation

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up your Google Maps API key:
   - Copy `.env.example` to `.env`
   - Add your Google Maps API key to the `.env` file
   ```
   GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

3. Initialize the database (if it doesn't exist):
   ```bash
   python init_db.py
   ```

### Option 3: Docker Installation

If you have Docker and Docker Compose installed:

1. Copy `.env.example` to `.env` and add your Google Maps API key
2. Run:
   ```bash
   docker-compose up -d
   ```

## Running the Application

### Standard Method
```bash
python app.py
```

### Using the Start Script
After running the installation script:
- On Windows: Run `start.bat`
- On Linux/Mac: Run `./start.sh`

### Using Docker
```bash
docker-compose up
```

The application will be available at [http://localhost:5000](http://localhost:5000)

## Testing

Run tests with:
```bash
pytest
```

## Configuration

All important settings are in `config.py` (e.g., DB_PATH, DEBUG, SECRET_KEY, GOOGLE_MAPS_API_KEY).

The application follows a clean architecture pattern:
- **Presentation Layer**: Flask routes in `routes.py`
- **Business Logic Layer**: Route planning in `business/route_planner.py`
- **Data Access Layer**: Google Maps API client in `data/google_maps_client.py`
- **Frontend**: Modular JavaScript in `static/js/`

## API Documentation

The OpenAPI/Swagger specification is in the `openapi.yaml` file and can be viewed using the [Swagger Editor](https://editor.swagger.io/).

## Google Maps API Setup

This application requires a Google Maps API key with the following APIs enabled:

1. **Directions API** - For calculating routes between locations
2. **Maps JavaScript API** - For displaying the interactive map
3. **Geocoding API** - For converting addresses to coordinates
4. **Distance Matrix API** - For calculating distances and travel times

### How to Get a Google Maps API Key:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Library"
4. Enable each of the required APIs listed above
5. Go to "APIs & Services" > "Credentials"
6. Click "Create Credentials" > "API Key"
7. Copy your new API key

### Recommended API Restrictions:

For security, it's recommended to restrict your API key:

1. In the Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Find your API key and click "Edit"
3. Under "Application restrictions", select "HTTP referrers (websites)"
4. Add your domain(s) or localhost for development (e.g., `localhost:*`, `127.0.0.1:*`)
5. Under "API restrictions", select "Restrict key"
6. Select only the four APIs mentioned above
7. Click "Save"

After obtaining your API key, add it to your `.env` file:
```
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

**Important:** Never commit your API key to version control. The `.env` file is included in `.gitignore` to prevent this.

## Transferring to Another Machine

The application is designed to be easily transferable between machines. Here are the recommended methods:

### Method 1: Simple Copy (Recommended for Most Users)

1. Copy the entire application directory to the new machine
2. Run the installation script on the new machine:
   ```bash
   python install.py
   ```
3. Edit the `.env` file to set your Google Maps API key
4. Start the application using the generated start script

### Method 2: Using Git

1. Push your changes to a Git repository
2. On the new machine, clone the repository:
   ```bash
   git clone https://github.com/yourusername/route-planner.git
   ```
3. Follow the installation instructions above

### Method 3: Using Docker (Recommended for Production)

1. Copy the application directory to the new machine
2. Make sure Docker and Docker Compose are installed on the new machine
3. Create/edit the `.env` file with your settings
4. Run:
   ```bash
   docker-compose up -d
   ```

### Method 4: Creating a Package

1. Create a distributable package:
   ```bash
   python setup.py sdist bdist_wheel
   ```
2. Copy the generated package from the `dist` directory to the new machine
3. On the new machine, install the package:
   ```bash
   pip install route-planner-1.0.0.tar.gz
   ```
4. Create a `.env` file with your Google Maps API key