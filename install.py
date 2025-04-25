#!/usr/bin/env python3
"""
Installation script for the Route Planner application.
This script helps set up the application on a new machine.
"""
import os
import sys
import shutil
import subprocess
import platform

def check_python_version():
    """Check if Python version is compatible."""
    required_version = (3, 8)
    current_version = sys.version_info
    
    if current_version < required_version:
        print(f"Error: Python {required_version[0]}.{required_version[1]} or higher is required.")
        print(f"Current version: {current_version[0]}.{current_version[1]}")
        return False
    return True

def check_pip():
    """Check if pip is installed."""
    try:
        subprocess.run([sys.executable, "-m", "pip", "--version"], 
                      check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return True
    except subprocess.CalledProcessError:
        print("Error: pip is not installed or not working properly.")
        return False

def install_dependencies():
    """Install dependencies from requirements.txt."""
    print("Installing dependencies...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        print("Dependencies installed successfully.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error installing dependencies: {e}")
        return False

def setup_env_file():
    """Set up the .env file if it doesn't exist."""
    if not os.path.exists(".env"):
        if os.path.exists(".env.example"):
            shutil.copy(".env.example", ".env")
            print(".env file created from .env.example")
            print("Please edit the .env file to set your Google Maps API key.")
        else:
            print("Warning: .env.example file not found. Creating empty .env file.")
            with open(".env", "w") as f:
                f.write("# Environment variables\n")
                f.write("GOOGLE_MAPS_API_KEY=\n")
            print("Please edit the .env file to set your Google Maps API key.")
    else:
        print(".env file already exists.")

def initialize_database():
    """Initialize the database if it doesn't exist."""
    from config import Config
    
    if not os.path.exists(Config.DB_PATH):
        print(f"Database file not found at {Config.DB_PATH}")
        try:
            if os.path.exists("init_db.py"):
                print("Initializing database...")
                subprocess.run([sys.executable, "init_db.py"], check=True)
                print("Database initialized successfully.")
            else:
                print("Warning: init_db.py not found. Database initialization skipped.")
        except subprocess.CalledProcessError as e:
            print(f"Error initializing database: {e}")
    else:
        print(f"Database file already exists at {Config.DB_PATH}")

def create_start_script():
    """Create a start script based on the operating system."""
    if platform.system() == "Windows":
        with open("start.bat", "w") as f:
            f.write("@echo off\n")
            f.write("echo Starting Route Planner application...\n")
            f.write("python app.py\n")
        print("Created start.bat script for Windows.")
    else:
        with open("start.sh", "w") as f:
            f.write("#!/bin/bash\n")
            f.write("echo Starting Route Planner application...\n")
            f.write("python3 app.py\n")
        os.chmod("start.sh", 0o755)  # Make executable
        print("Created start.sh script for Unix/Linux/Mac.")

def main():
    """Main installation function."""
    print("=== Route Planner Installation ===")
    
    # Check Python version
    if not check_python_version():
        return
    
    # Check pip
    if not check_pip():
        return
    
    # Install dependencies
    if not install_dependencies():
        return
    
    # Set up .env file
    setup_env_file()
    
    # Initialize database
    try:
        initialize_database()
    except ImportError:
        print("Warning: Could not import Config. Database initialization skipped.")
    
    # Create start script
    create_start_script()
    
    print("\n=== Installation Complete ===")
    print("To start the application:")
    if platform.system() == "Windows":
        print("  Run start.bat")
    else:
        print("  Run ./start.sh")
    print("\nMake sure to set your Google Maps API key in the .env file.")

if __name__ == "__main__":
    main()
