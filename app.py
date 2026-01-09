#!/usr/bin/env python3
"""
Lightweight Configuration Editor for Home Assistant
Flask backend with API endpoints for file operations and HA entity discovery
"""

from flask import Flask, jsonify, request, send_from_directory, send_file
import requests
import os
import shutil
from pathlib import Path
from datetime import datetime

app = Flask(__name__, static_folder='static', static_url_path='')

# Configuration
HA_URL = 'http://supervisor/core/api'
TOKEN = os.getenv('SUPERVISOR_TOKEN', '')
CONFIG_DIR = '/config'
PORT = 8099

# Ensure we have the token
if not TOKEN:
    print("WARNING: SUPERVISOR_TOKEN not found in environment")


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
            print("ERROR: SUPERVISOR_TOKEN is not set - cannot fetch entities")
            return jsonify([]), 200

        headers = {'Authorization': f'Bearer {TOKEN}'}
        print(f"Fetching entities from {HA_URL}/states")
        response = requests.get(f'{HA_URL}/states', headers=headers, timeout=10)
        print(f"Response status: {response.status_code}")
        response.raise_for_status()

        states = response.json()
        print(f"Successfully fetched {len(states)} entities from Home Assistant")

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

        return jsonify(entities), 200

    except requests.exceptions.RequestException as e:
        print(f"ERROR fetching entities: {type(e).__name__}: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status: {e.response.status_code}")
            print(f"Response body: {e.response.text[:200]}")
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
        print(f"Error fetching services: {e}")
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

    except Exception as e:
        print(f"Error listing files: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/files/<path:filename>')
def read_file(filename):
    """Read the content of a specific file"""
    try:
        # Security: prevent path traversal with '..'
        if '..' in filename or filename.startswith('/'):
            return jsonify({'error': 'Access denied'}), 403

        file_path = Path(CONFIG_DIR) / filename

        # Ensure the file is within CONFIG_DIR
        if not str(file_path.resolve()).startswith(CONFIG_DIR):
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

    except UnicodeDecodeError:
        return jsonify({'error': 'File is not a text file'}), 400
    except Exception as e:
        print(f"Error reading file {filename}: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/files/<path:filename>', methods=['PUT'])
def write_file(filename):
    """Write content to a specific file (creates backup first)"""
    try:
        # Security: prevent path traversal with '..'
        if '..' in filename or filename.startswith('/'):
            return jsonify({'error': 'Access denied'}), 403

        file_path = Path(CONFIG_DIR) / filename

        # Ensure the file is within CONFIG_DIR
        if not str(file_path.resolve()).startswith(CONFIG_DIR):
            return jsonify({'error': 'Access denied'}), 403

        # Get content from request
        data = request.get_json()
        if not data or 'content' not in data:
            return jsonify({'error': 'No content provided'}), 400

        content = data['content']

        # Create backup if file exists
        if file_path.exists():
            backup_path = file_path.with_suffix(file_path.suffix + '.backup')
            shutil.copy2(file_path, backup_path)
            print(f"Created backup: {backup_path}")

        # Write new content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"Saved file: {file_path}")

        return jsonify({
            'success': True,
            'filename': filename,
            'size': file_path.stat().st_size
        }), 200

    except Exception as e:
        print(f"Error writing file {filename}: {e}")
        return jsonify({'error': str(e)}), 500


@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors by serving index.html (for SPA routing)"""
    return send_file('static/index.html')


if __name__ == '__main__':
    print(f"Starting Configuration Editor on port {PORT}")
    print(f"Config directory: {CONFIG_DIR}")
    print(f"Token configured: {'Yes' if TOKEN else 'No'}")

    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=False
    )
