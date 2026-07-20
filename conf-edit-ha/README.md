# Home Assistant Configuration Editor


A lightweight Home Assistant add-on that provides a simple text editor for configuration files with YAML syntax highlighting, entity autocomplete, and Home Assistant config validation after saving.

## Features

- **Lightweight CodeMirror 6 editor** (~1MB, 10x smaller than Monaco)
- **YAML syntax highlighting** with real-time validation
- **Home Assistant config validation** after save using the same config check API as Developer Tools
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

1. In Home Assistant, go to **Settings → Add-ons → Add-on Store**
2. Click the **three dots menu** (top right) → **Repositories**
3. Add this repository URL: `https://github.com/roman-pinchuk/conf-edit-ha`
4. Find "Configuration Editor" in the add-on store and click **Install**
5. Start the add-on
6. Access via the sidebar panel "Config Editor"

## Configuration

```yaml
theme: auto  # Options: auto, light, dark
indent_style: spaces  # Options: spaces, dotted
indent_opacity: 100  # 0-100; 100 preserves the default guide strength
```

- `theme`: Set to `auto` to follow system theme, or manually select `light`/`dark`
- `indent_style`: Display indentation guides as colored spaces or dotted lines
- `indent_opacity`: Adjust guide visibility from hidden (`0`) to the default strength (`100`)

Restart the add-on after saving configuration options to apply changes.

## Usage

1. Open the add-on from the Home Assistant sidebar
2. Select a YAML file from the file browser
3. Edit the file with syntax highlighting
4. Type to get entity autocomplete suggestions
5. Click "Save" to save changes (creates automatic backup)
6. Review the Home Assistant validation result in the status bar
7. If validation fails, click or tap the status bar to expand the full error details

## Tech Stack

- Backend: Python + Flask
- Frontend: TypeScript + CodeMirror 6 + Vite
- Container: ~50MB total size

## Security

- All file operations are restricted to `/config` directory
- Automatic backups created before each save
- No external dependencies or internet access required

## Support

For issues and feature requests, visit: [GitHub Issues](https://github.com/roman-pinchuk/conf-edit-ha/issues)

## License

This project is licensed under the [MIT License](LICENSE.md).
