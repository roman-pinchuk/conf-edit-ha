# Home Assistant Configuration Editor

[![GitHub Release](https://img.shields.io/github/v/release/roman-pinchuk/conf-edit-ha?style=flat-square)](https://github.com/roman-pinchuk/conf-edit-ha/releases)
[![Builder](https://github.com/roman-pinchuk/conf-edit-ha/actions/workflows/builder.yaml/badge.svg)](https://github.com/roman-pinchuk/conf-edit-ha/actions/workflows/builder.yaml)
[![License](https://img.shields.io/github/license/roman-pinchuk/conf-edit-ha?style=flat-square)](https://github.com/roman-pinchuk/conf-edit-ha/blob/main/LICENSE)
[![Home Assistant Ingress](https://img.shields.io/badge/Home%20Assistant-Ingress-blue?style=flat-square)](https://www.home-assistant.io/docs/addons/ingress/)
![Supports amd64](https://img.shields.io/badge/amd64-yes-green?style=flat-square)
![Supports aarch64](https://img.shields.io/badge/aarch64-yes-green?style=flat-square)
![Supports armv7](https://img.shields.io/badge/armv7-yes-green?style=flat-square)

![Untitled 2](https://github.com/user-attachments/assets/8039c587-de94-4ae9-a3ac-b5f99cab165a)
<img width="230" height="439" alt="image" src="https://github.com/user-attachments/assets/afb6e303-3b9c-4acb-98a0-c1ce32f1b63c" /><img width="230" height="439" alt="image" src="https://github.com/user-attachments/assets/3e048558-9d0e-400b-97d2-98cfbd926baa" />

A lightweight Home Assistant add-on that provides a simple text editor for configuration files with YAML syntax highlighting and entity autocomplete.

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

### Quick Install

Click the button below to add this repository to your Home Assistant:

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Froman-pinchuk%2Fconf-edit-ha)

### Manual Installation

1. In Home Assistant, go to **Settings → Add-ons → Add-on Store**
2. Click the **three dots menu** (top right) → **Repositories**
3. Add this repository URL: `https://github.com/roman-pinchuk/conf-edit-ha`
4. Find "Configuration Editor" in the add-on store and click **Install**
5. Start the add-on
6. Access via the sidebar panel "Config Editor"

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

For issues and feature requests, visit: [GitHub Issues](https://github.com/roman-pinchuk/conf-edit-ha/issues)
