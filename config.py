import os

class Config:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_FILENAME = 'places.db'
    DB_PATH = os.path.join(BASE_DIR, DB_FILENAME)
    DEBUG = True
    SECRET_KEY = 'change-this-key'
    # Nastav svůj Google Maps API klíč bezpečně (nejlépe přes proměnnou prostředí GOOGLE_MAPS_API_KEY)
    GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")

