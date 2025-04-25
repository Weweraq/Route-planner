import os
import secrets
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration class for the application.
    All configuration is set through environment variables for better portability.
    """
    # Environment
    ENV = os.environ.get('FLASK_ENV', 'development')

    # Application paths
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    # Database settings
    # Use environment variable for DB_PATH if provided, otherwise use default
    DB_PATH = os.environ.get('DB_PATH', os.path.join(BASE_DIR, 'places.db'))

    # Make DB_PATH absolute if it's a relative path
    if not os.path.isabs(DB_PATH):
        DB_PATH = os.path.join(BASE_DIR, DB_PATH)

    # Application settings
    DEBUG = os.environ.get('FLASK_DEBUG', '1') == '1'
    PORT = int(os.environ.get('FLASK_PORT', 5000))
    HOST = os.environ.get('FLASK_HOST', '0.0.0.0')

    # Generate a random secret key if not provided
    SECRET_KEY = os.environ.get('SECRET_KEY', secrets.token_hex(16))

    # Google Maps API key - set in .env file
    GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")

    @classmethod
    def get_db_uri(cls):
        """Get database URI in a format suitable for SQLAlchemy"""
        return f"sqlite:///{cls.DB_PATH}"

    @classmethod
    def is_production(cls):
        """Check if the application is running in production mode"""
        return cls.ENV == 'production'

    @classmethod
    def validate_config(cls):
        """Validate the configuration and print warnings for missing values"""
        if not cls.GOOGLE_MAPS_API_KEY:
            print("WARNING: Google Maps API key is not set. Route planning functionality will not work.")
            print("Set the GOOGLE_MAPS_API_KEY environment variable in your .env file.")

        # Check if database file exists
        if not os.path.exists(cls.DB_PATH) and not cls.DB_PATH.endswith(':memory:'):
            print(f"WARNING: Database file does not exist at {cls.DB_PATH}")
            print("You may need to initialize the database.")


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False


# Create config object based on environment
def get_config():
    env = os.environ.get('FLASK_ENV', 'development')
    if env == 'production':
        return ProductionConfig
    return DevelopmentConfig

