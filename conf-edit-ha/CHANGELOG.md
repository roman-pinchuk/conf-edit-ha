# Changelog

All notable changes to this project will be documented in this file.

## [1.0.18] - 2026-01-10

### Added
- **Production Server:** Switched from Flask development server to Gunicorn WSGI for improved stability and performance.
- **CI/CD Workflows:** Added automated GitHub Actions for configuration linting and multi-architecture Docker builds (`amd64`, `aarch64`).
- **Modern Icon:** Updated add-on icon and logo to a modern iOS-inspired "liquid glass" aesthetic.
- **Robust Path Detection:** Improved configuration directory discovery to support multiple standards (`/config`, `/homeassistant`).

### Changed
- **Repository Structure:** Restructured repository to official Home Assistant standards (source moved to `conf-edit-ha/` subdirectory).
- **Architecture Support:** Removed support for deprecated architectures (`armhf`, `armv7`, `i386`) to comply with 2025.12+ Home Assistant standards.
- **Mapping:** Updated volume mapping from legacy `config` to the new `homeassistant_config` standard.

### Fixed
- **Permission Denied (403):** Fixed package registry paths to prevent double-nesting and corrected visibility metadata.
- **UI Bugs:** Fixed Save button state issues and improved theme persistence.

### Performance
- **Memory Optimization:** Reduced Gunicorn worker count and enabled `--preload` to drop RAM usage back below 1%.

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
- Multi-architecture support (amd64, armv7, armhf, i386, aarch64)