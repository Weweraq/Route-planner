from flask import Flask
from config import get_config
from routes import routes_bp
import os

def create_app(config_class=None):
    """Application factory function to create and configure the Flask app.
    This pattern makes the app more modular and easier to test.
    """
    # Create Flask app
    app = Flask(__name__, static_folder='static')

    # Load configuration
    if config_class is None:
        config_class = get_config()
    app.config.from_object(config_class)

    # Validate configuration
    config_class.validate_config()

    # Register blueprints
    app.register_blueprint(routes_bp)

    # Print startup information
    print(f"Starting application in {config_class.ENV} mode")
    print(f"Database path: {config_class.DB_PATH}")

    return app

# Create the application instance
app = create_app()

if __name__ == '__main__':
    # Get host and port from config
    host = app.config.get('HOST', '0.0.0.0')
    port = app.config.get('PORT', 5000)
    debug = app.config.get('DEBUG', False)

    # Run the application
    print(f"Running on http://{host}:{port} (Press CTRL+C to quit)")
    app.run(host=host, port=port, debug=debug)
