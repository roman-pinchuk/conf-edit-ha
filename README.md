# Home Assistant Configuration Editor

A lightweight Home Assistant add-on that provides a simple text editor for configuration files with YAML syntax highlighting and entity autocomplete.

**[🚀 Try Live Demo](https://roman-pinchuk.github.io/conf-edit-ha/)**

## Features

- **Lightweight CodeMirror 6 editor** (~1MB, 10x smaller than Monaco)
- **YAML syntax highlighting** with real-time validation
- **Entity autocomplete** (substring matching from live HA API)
- **VS Code-style file tree** with expand/collapse and indentation guides
- **Rainbow indentation** for YAML structure visualization
- **Dark/light theme** with automatic system preference detection
- **State persistence** - remembers last opened file
- **Tree browser** with folder navigation
- **Auto-backup** on every save (creates `.backup` files)
- **Multi-architecture support** (amd64, aarch64, armv7, armhf, i386)
- **Ingress support** - runs securely within Home Assistant

## Installation

1. Add this repository to your Home Assistant add-on store
2. Install the "Configuration Editor" add-on
3. Start the add-on
4. Access via the sidebar panel "Config Editor"

## Configuration

```yaml
theme: auto  # Options: auto, light, dark
```

- `theme`: Set to `auto` to follow system theme, or manually select `light`/`dark`

## Usage

1. Open the add-on from the Home Assistant sidebar
2. Select a YAML file from the file browser
3. Edit the file with syntax highlighting
4. Type to get entity autocomplete suggestions
5. Click "Save" to save changes (creates automatic backup)

## Tech Stack

- Backend: Python + Flask
- Frontend: TypeScript + CodeMirror 6 + Vite
- Container: ~50MB total size

## Security

- All file operations are restricted to `/config` directory
- Automatic backups created before each save
- No external dependencies or internet access required

## Development

### Quick Start

```bash
# Build everything and run
make build run

# Or step by step:
make build-frontend  # Build frontend
make build-docker    # Build Docker image
make run            # Start container

# View logs
make logs

# Restart after changes
make restart
```

### Building for Multiple Architectures

The add-on automatically builds for all supported architectures when published to Home Assistant. For local multi-arch testing:

```bash
make build-multiarch
```

See [BUILD.md](BUILD.md) for detailed build instructions.

### Project Structure

```
conf-edit-ha/
├── app.py              # Flask backend
├── frontend/           # TypeScript + Vite frontend
│   ├── src/
│   │   ├── main.ts     # App entry point
│   │   ├── editor.ts   # CodeMirror setup
│   │   ├── api.ts      # API client
│   │   └── theme.ts    # Theme management
│   └── styles.css      # VS Code-style CSS
├── static/             # Built frontend (generated)
├── config.yaml         # Add-on configuration
├── build.yaml          # Multi-arch build config
└── Dockerfile          # Container definition
```

## Support

For issues and feature requests, visit: [GitHub Issues](https://github.com/yourusername/conf-edit-ha/issues)
