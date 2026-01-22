ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base-python:3.11-alpine3.18
FROM $BUILD_FROM

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy Flask app
COPY app.py .

# Copy built frontend
COPY static ./static

# Copy run script
COPY run.sh /
RUN chmod a+x /run.sh

# Expose port
EXPOSE 8099

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8099/health || exit 1

# Run via s6 supervisor
CMD ["/run.sh"]
