#!/usr/bin/env python3
"""
Lightweight Configuration Editor for Home Assistant
Flask backend with API endpoints for file operations and HA entity discovery
"""

from flask import Flask, jsonify, request, send_from_directory, send_file
import requests
import os
import shutil
import logging
from pathlib import Path
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static', static_url_path='')

# Configuration
HA_URL = 'http://supervisor/core/api'
TOKEN = os.getenv('SUPERVISOR_TOKEN', '')
PORT = 8099

# Determine config directory
possible_config_dirs = [
    os.getenv('CONFIG_DIR'),  # explicit override
    '/config',                # standard HA add-on path
    '/homeassistant'          # alternative path
]
CONFIG_DIR = next((d for d in possible_config_dirs if d and Path(d).exists()), '/config')

# Ensure we have the token
if not TOKEN:
    logger.warning("SUPERVISOR_TOKEN not found in environment")


@app.route('/')
def index():
    """Serve the main HTML file"""
    return send_file('static/index.html')


@app.route('/assets/<path:filename>')
def serve_assets(filename):
    """Serve static assets"""
    return send_from_directory('static/assets', filename)


@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'}), 200


@app.route('/api/entities')
def get_entities():
    """Fetch all entities from Home Assistant"""
    try:
        if not TOKEN:
            logger.warning("SUPERVISOR_TOKEN is not set - cannot fetch entities")
            return jsonify([]), 200

        headers = {'Authorization': f'Bearer {TOKEN}'}
        response = requests.get(f'{HA_URL}/states', headers=headers, timeout=10)
        response.raise_for_status()

        states = response.json()

        # Return simplified entity list
        entities = [
            {
                'entity_id': state['entity_id'],
                'friendly_name': state.get('attributes', {}).get('friendly_name', state['entity_id']),
                'domain': state['entity_id'].split('.')[0],
                'state': state['state']
            }
            for state in states
        ]

        logger.info("Loaded %d entities for autocomplete", len(entities))
        return jsonify(entities), 200

    except requests.exceptions.RequestException as e:
        logger.error("Error fetching entities: %s", e)
        # Return empty list when HA is not available
        return jsonify([]), 200


@app.route('/api/services')
def get_services():
    """Fetch all services from Home Assistant"""
    try:
        headers = {'Authorization': f'Bearer {TOKEN}'}
        response = requests.get(f'{HA_URL}/services', headers=headers, timeout=10)
        response.raise_for_status()

        return jsonify(response.json()), 200

    except requests.exceptions.RequestException as e:
        logger.error("Error fetching services: %s", e)
        # Return empty dict when HA is not available
        return jsonify({}), 200


@app.route('/api/validate', methods=['POST'])
def validate_config():
    """Run Home Assistant's config validation check"""
    if not TOKEN:
        logger.warning("SUPERVISOR_TOKEN is not set - cannot validate config")
        return jsonify({
            'result': 'unavailable',
            'errors': 'Home Assistant supervisor token is not configured'
        }), 503

    try:
        headers = {
            'Authorization': f'Bearer {TOKEN}',
            'Content-Type': 'application/json'
        }
        response = requests.post(
            f'{HA_URL}/config/core/check_config',
            headers=headers,
            json={},
            timeout=60
        )
        response.raise_for_status()

        result = response.json()
        return jsonify({
            'result': result.get('result', 'unknown'),
            'errors': result.get('errors')
        }), 200

    except ValueError as e:
        logger.error("Invalid config validation response: %s", e)
        return jsonify({
            'result': 'unavailable',
            'errors': 'Home Assistant returned an invalid validation response'
        }), 502
    except requests.exceptions.RequestException as e:
        logger.error("Error validating config: %s", e)
        return jsonify({
            'result': 'unavailable',
            'errors': 'Could not check Home Assistant config'
        }), 502


def build_file_tree(root_path, current_path=None):
    """Recursively build a tree structure of files and directories"""
    if current_path is None:
        current_path = root_path

    tree = []

    try:
        items = sorted(current_path.iterdir(), key=lambda x: (not x.is_dir(), x.name))

        for item in items:
            # Skip hidden files and common ignored directories
            if item.name.startswith('.') or item.name in ['__pycache__', 'node_modules']:
                continue

            relative_path = str(item.relative_to(root_path))

            if item.is_dir():
                # It's a directory
                node = {
                    'name': item.name,
                    'path': relative_path,
                    'type': 'directory',
                    'children': build_file_tree(root_path, item)
                }
                tree.append(node)
            elif item.suffix.lower() in ['.yaml', '.yml']:
                # It's a YAML file
                node = {
                    'name': item.name,
                    'path': relative_path,
                    'type': 'file',
                    'size': item.stat().st_size,
                    'modified': datetime.fromtimestamp(item.stat().st_mtime).isoformat()
                }
                tree.append(node)
    except PermissionError:
        pass

    return tree


@app.route('/api/files')
def list_files():
    """List all YAML files in the config directory as a tree structure"""
    try:
        config_path = Path(CONFIG_DIR)

        if not config_path.exists():
            return jsonify({'error': 'Config directory not found'}), 404

        tree = build_file_tree(config_path)
        return jsonify(tree), 200

    except PermissionError as e:
        logger.error("Permission denied listing files: %s", e)
        return jsonify({'error': 'Permission denied'}), 403
    except OSError as e:
        logger.error("Error listing files: %s", e)
        return jsonify({'error': 'Failed to list files'}), 500


@app.route('/api/files/<path:filename>')
def read_file(filename):
    """Read the content of a specific file"""
    try:
        resolved = os.path.normpath(os.path.join(CONFIG_DIR, filename))
        if not resolved.startswith(CONFIG_DIR + os.sep) and resolved != CONFIG_DIR:
            logger.warning("Path validation failed for: %s", filename)
            return jsonify({'error': 'Access denied'}), 403

        with open(resolved, 'r', encoding='utf-8') as f:
            content = f.read()

        return jsonify({
            'filename': filename,
            'content': content,
            'size': os.path.getsize(resolved),
            'modified': datetime.fromtimestamp(os.path.getmtime(resolved)).isoformat()
        }), 200

    except FileNotFoundError:
        return jsonify({'error': 'File not found'}), 404
    except PermissionError:
        logger.error("Permission denied reading file %s", filename)
        return jsonify({'error': 'Permission denied'}), 403
    except UnicodeDecodeError:
        return jsonify({'error': 'File is not a text file'}), 400
    except OSError as e:
        logger.error("Error reading file %s: %s", filename, e)
        return jsonify({'error': 'Failed to read file'}), 500


@app.route('/api/files/<path:filename>', methods=['PUT'])
def write_file(filename):
    """Write content to a specific file (creates backup first)"""
    try:
        resolved = os.path.normpath(os.path.join(CONFIG_DIR, filename))
        if not resolved.startswith(CONFIG_DIR + os.sep) and resolved != CONFIG_DIR:
            return jsonify({'error': 'Access denied'}), 403

        # Get content from request
        data = request.get_json()
        if not data or 'content' not in data:
            return jsonify({'error': 'No content provided'}), 400

        content = data['content']

        # Create backup if file exists
        if os.path.exists(resolved):
            try:
                backup_path = resolved + '.backup'
                shutil.copy2(resolved, backup_path)
                logger.info("Created backup: %s", backup_path)
            except (OSError, IOError) as e:
                logger.warning("Failed to create backup for %s: %s", filename, e)
                # Continue without backup

        # Write new content
        with open(resolved, 'w', encoding='utf-8') as f:
            f.write(content)

        logger.info("Saved file: %s", resolved)

        return jsonify({
            'success': True,
            'filename': filename,
            'size': os.path.getsize(resolved)
        }), 200

    except PermissionError:
        logger.error("Permission denied writing to file %s", filename)
        return jsonify({'error': 'Permission denied'}), 403
    except (OSError, IOError) as e:
        logger.error("Error writing file %s: %s", filename, e)
        return jsonify({'error': 'Failed to write file'}), 500


@app.errorhandler(404)
def not_found(_e):
    """Handle 404 errors by serving index.html (for SPA routing)"""
    return send_file('static/index.html')


if __name__ == '__main__':
    logger.info("Starting Configuration Editor on port %d", PORT)
    logger.info("Config directory: %s", CONFIG_DIR)
    logger.info("Token configured: %s", 'Yes' if TOKEN else 'No')

    app.run(
        host='::',
        port=PORT,
        debug=False
    )
