# Changelog

All notable changes to the Configuration Editor project are documented in this file.

## [1.1.1] - 2026-01-23

### Fixed
- **iOS Theme Switching**: Fixed theme not updating when switching system theme in Home Assistant iOS app
  - Added visibility change listener to detect theme switches when app returns to foreground
  - Added periodic theme check (every 5 seconds) for iOS Safari/WebView compatibility
  - iOS WebView may not reliably trigger media query change events
  - Theme now updates within 5 seconds or immediately when app becomes visible
- Improved theme detection logging with `[Theme]` prefixed console messages

### Technical Details
- Added `checkAndApplyTheme()` helper function for iOS compatibility
- Only performs periodic checks when in 'auto' mode to minimize overhead
- Prevents unnecessary DOM updates by comparing theme state before applying changes

---

## [1.1.0] - 2026-01-23

### Added
- **Mobile Editor Toolbar** - New responsive toolbar for mobile/tablet devices (≤768px viewport)
  - Undo button (↺) - Undo changes with Ctrl+Z
  - Redo button (↻) - Redo changes with Ctrl+Shift+Z
  - Indent button (→|) - Increase indentation with Tab
  - Dedent button (|←) - Decrease indentation with Shift+Tab
- Icon-only 32px buttons with minimal VS Code-inspired design
- Smart button state detection based on CodeMirror undo/redo history
- Full keyboard accessibility with Tab navigation and keyboard shortcuts
- Proper ARIA labels for screen reader support
- Touch-friendly targets meeting WCAG AA accessibility standards
- Responsive design with breakpoints for tablets (768px) and small phones (480px)

### Fixed
- **Critical**: Fixed button click detection - removed CSS `pointer-events: none` that was blocking clicks
- **Fixed**: Undo/Redo state detection now uses CodeMirror's `undoDepth`/`redoDepth` API instead of unreliable history object
- **Fixed**: Replaced HTML `disabled` attribute with CSS-based opacity styling (browsers prevent clicks on disabled buttons!)
- **Fixed**: Added null checks for toolbar button DOM element retrieval to prevent runtime errors
- **Fixed**: Button width inconsistency - all buttons now have consistent 32px width

### Changed
- Toolbar buttons now use CSS opacity (0.4 for disabled, 1.0 for enabled) instead of HTML `disabled` attribute
- Simplified icon design from complex bracket patterns to clean arrow-bracket notation
- Removed fancy glassmorphism effects (gradients, blur, shadows) for better performance and minimal design
- Switched to VS Code minimalist aesthetic for toolbar styling
- Button styling now uses transparent background with subtle hover effects

### Technical Details
- Uses CodeMirror 6 `undoDepth()` and `redoDepth()` for accurate history state
- CSS-based disabled state management instead of HTML attributes
- Keyboard shortcuts fully functional: Ctrl+Z, Ctrl+Shift+Z, Tab, Shift+Tab
- All buttons have tooltips with keyboard hints
- Responsive CSS media queries at 768px and 480px breakpoints

### Browser Compatibility
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ Touch and keyboard input fully supported

### Accessibility
- WCAG AA compliant
- Proper ARIA labels on all buttons
- Keyboard navigation with Tab/Shift+Tab
- Screen reader support
- Visible focus indicators
- Sufficient color contrast

---

## [1.0.25] - 2026-01-22

### Added
- Initial public release
- YAML file editor with syntax highlighting
- Entity autocomplete from Home Assistant
- CodeMirror 6 integration
- Rainbow bracket and indentation guides
- YAML linting with error detection
- Light/dark theme support
- Responsive design
- Save file functionality
- File browser sidebar
- Mobile menu toggle

### Features
- Keyboard shortcuts (Ctrl+S to save, Ctrl+Z/Ctrl+Y for undo/redo via keyboard)
- File tree navigation
- Entity autocomplete
- YAML syntax validation
- Status bar with file info
- localStorage persistence

---

## Commit History (v1.0.25...v1.1.0)

### Featured Commits
- `ee99820` - feat: add mobile editor toolbar with undo/redo and indent controls
- `8c43326` - fix: enable undo/redo button clicks by removing HTML disabled attribute
- `e81ef1d` - fix: add null checks for mobile toolbar buttons
- `84a65fb` - refactor: simplify icons to cleaner arrow-bracket style
- `7f038b3` - refactor: update indent/dedent icons to modern bracket style
- `b7e012c` - refactor: simplify toolbar to icon-only design
- `3f8af16` - refactor: redesign mobile toolbar with VS Code minimalist style
- `194f0d3` - Fix mobile toolbar button width inconsistency and improve label handling
- `6e46415` - style: redesign mobile toolbar with modern fancy styling
- `45f806b` - feat: add mobile editor toolbar with undo/redo and indentation buttons

---

## Version Numbering

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

Format: `MAJOR.MINOR.PATCH` (e.g., `1.1.0`)

---

## How to Upgrade

### Home Assistant Users
1. Go to Settings → Add-ons
2. Find "Configuration Editor"
3. Click the three-dot menu → "Check for updates"
4. Click "Update" if available

### Docker Users
```bash
docker pull ghcr.io/roman-pinchuk/conf-edit-ha:latest
docker stop conf-edit-ha
docker rm conf-edit-ha
docker run -d --name conf-edit-ha -p 8099:8099 ghcr.io/roman-pinchuk/conf-edit-ha:latest
```

---

## Known Issues
None at this time.

## Future Roadmap
- Additional toolbar buttons (search, format, etc.)
- Customizable keyboard shortcuts
- Settings panel for user preferences
- Export/import configurations
- Advanced YAML validation

---

## Contributing
Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/roman-pinchuk/conf-edit-ha/issues).

## License
See LICENSE file for details.
