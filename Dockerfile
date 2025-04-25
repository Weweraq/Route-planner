FROM python:3.9-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Set environment variables
ENV FLASK_ENV=production
ENV FLASK_DEBUG=0
ENV FLASK_PORT=5000
ENV FLASK_HOST=0.0.0.0

# Expose the port
EXPOSE 5000

# Run the application
CMD ["python", "app.py"]
