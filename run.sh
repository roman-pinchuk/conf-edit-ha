#!/usr/bin/with-contenv bashio
# ==============================================================================
# Start Configuration Editor
# ==============================================================================

bashio::log.info "Starting Configuration Editor..."

# Check if token is available
if bashio::supervisor.ping; then
    bashio::log.info "Supervisor connection OK"
    export SUPERVISOR_TOKEN="${SUPERVISOR_TOKEN}"
    bashio::log.info "Token configured"
else
    bashio::log.warning "Cannot connect to supervisor"
fi

# Start the Flask application
cd /app || bashio::exit.nok "Cannot change to /app directory"
exec python3 app.py
