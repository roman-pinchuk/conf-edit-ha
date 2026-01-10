# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-01-09

### Added
- Initial release of Configuration Editor add-on
- Lightweight CodeMirror 6 text editor with YAML syntax highlighting
- Entity autocomplete with substring matching (fetches from live HA instance)
- Dark/light theme support with automatic system theme detection
- File browser for `/config` directory YAML files
- Auto-backup functionality (creates `.backup` files before saving)
- Flask backend with REST API for file operations and entity discovery
- Keyboard shortcuts: Ctrl+S (save), Ctrl+Space (autocomplete)
- Real-time entity list refresh
- Status bar with file size and operation feedback
- Ingress support for seamless HA UI integration
- Multi-architecture support (amd64, armv7, armhf, aarch64, i386)

### Technical Details
- Frontend bundle size: ~1-2MB (minified)
- Container size: ~50MB
- Python 3.11 + Flask backend
- TypeScript + Vite + CodeMirror 6 frontend
- No external dependencies or internet access required

### Security
- All file operations restricted to `/config` directory
- Path traversal protection
- Automatic backups prevent accidental data loss
- No exposure of supervisor tokens to frontend
