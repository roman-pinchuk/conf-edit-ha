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


def validate_file_path(filename):
    """
    Validate that a filename is safe and doesn't attempt path traversal.
    
    Prevents directory traversal attacks by checking for '..' and absolute paths.
    Returns the absolute path if valid, None if invalid.
    """
    if '..' in filename or filename.startswith('/'):
        return None
    
    file_path = Path(CONFIG_DIR) / filename
    
    # Ensure the resolved path is within CONFIG_DIR
    try:
        # Resolve both paths to their absolute forms for comparison
        resolved_path = file_path.resolve()
        config_path = Path(CONFIG_DIR).resolve()
        
        # Check if the file is within the config directory
        if not str(resolved_path).startswith(str(config_path)):
            return None
        
        return file_path
    except (OSError, RuntimeError):
        return None


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

        logger.info(f"Loaded {len(entities)} entities for autocomplete")
        return jsonify(entities), 200

    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching entities: {e}")
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
        logger.error(f"Error fetching services: {e}")
        # Return empty dict when HA is not available
        return jsonify({}), 200


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
        logger.error(f"Permission denied listing files: {e}")
        return jsonify({'error': 'Permission denied'}), 403
    except OSError as e:
        logger.error(f"Error listing files: {e}")
        return jsonify({'error': 'Failed to list files'}), 500


@app.route('/api/files/<path:filename>')
def read_file(filename):
    """Read the content of a specific file"""
    try:
        # Validate file path for security
        file_path = validate_file_path(filename)
        if file_path is None:
            return jsonify({'error': 'Access denied'}), 403

        if not file_path.exists():
            return jsonify({'error': 'File not found'}), 404

        # Read file content
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        return jsonify({
            'filename': filename,
            'content': content,
            'size': file_path.stat().st_size,
            'modified': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
        }), 200

    except FileNotFoundError:
        return jsonify({'error': 'File not found'}), 404
    except PermissionError:
        logger.error(f"Permission denied reading file {filename}")
        return jsonify({'error': 'Permission denied'}), 403
    except UnicodeDecodeError:
        return jsonify({'error': 'File is not a text file'}), 400
    except (OSError, IOError) as e:
        logger.error(f"Error reading file {filename}: {e}")
        return jsonify({'error': 'Failed to read file'}), 500


@app.route('/api/files/<path:filename>', methods=['PUT'])
def write_file(filename):
    """Write content to a specific file (creates backup first)"""
    try:
        # Validate file path for security
        file_path = validate_file_path(filename)
        if file_path is None:
            return jsonify({'error': 'Access denied'}), 403

        # Get content from request
        data = request.get_json()
        if not data or 'content' not in data:
            return jsonify({'error': 'No content provided'}), 400

        content = data['content']

        # Create backup if file exists
        if file_path.exists():
            try:
                backup_path = file_path.with_suffix(file_path.suffix + '.backup')
                shutil.copy2(file_path, backup_path)
                logger.info(f"Created backup: {backup_path}")
            except (OSError, IOError) as e:
                logger.warning(f"Failed to create backup for {filename}: {e}")
                # Continue without backup

        # Write new content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        logger.info(f"Saved file: {file_path}")

        return jsonify({
            'success': True,
            'filename': filename,
            'size': file_path.stat().st_size
        }), 200

    except PermissionError:
        logger.error(f"Permission denied writing to file {filename}")
        return jsonify({'error': 'Permission denied'}), 403
    except (OSError, IOError) as e:
        logger.error(f"Error writing file {filename}: {e}")
        return jsonify({'error': 'Failed to write file'}), 500


@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors by serving index.html (for SPA routing)"""
    return send_file('static/index.html')


if __name__ == '__main__':
    logger.info(f"Starting Configuration Editor on port {PORT}")
    logger.info(f"Config directory: {CONFIG_DIR}")
    logger.info(f"Token configured: {'Yes' if TOKEN else 'No'}")

    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=False
    )
