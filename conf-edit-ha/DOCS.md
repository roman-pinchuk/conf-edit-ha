# Configuration Editor

A lightweight text editor for editing Home Assistant configuration files directly from the UI.

## Features

- **YAML Syntax Highlighting**: Easy-to-read color-coded YAML
- **Entity Autocomplete**: Type to get suggestions for entity IDs from your Home Assistant instance
- **Theme Support**: Automatically follows your system theme (light/dark) or manually override
- **Auto-Backup**: Every save creates a backup file (`.backup` extension)
- **File Browser**: Easy navigation of YAML files in your `/config` directory

## How to Use

1. **Access the Editor**: Click on "Config Editor" in your Home Assistant sidebar
2. **Select a File**: Choose a YAML file from the file list on the left
3. **Edit**: Make your changes with full syntax highlighting
4. **Autocomplete**: Start typing and press `Ctrl+Space` to trigger entity suggestions
5. **Save**: Click the "Save" button or press `Ctrl+S` (backup created automatically)

## Configuration Options

### Theme
- **auto** (default): Follows your system/browser theme preference
- **light**: Always use light theme
- **dark**: Always use dark theme

## Tips

- The editor automatically creates a backup (`.backup` extension) before saving
- Use `Ctrl+Space` or just start typing to trigger autocomplete
- Autocomplete searches all entity IDs for matches as you type
- The editor supports all standard text editing shortcuts

## Keyboard Shortcuts

- `Ctrl+S` / `Cmd+S`: Save file
- `Ctrl+Space`: Trigger autocomplete
- `Ctrl+Z` / `Cmd+Z`: Undo
- `Ctrl+Shift+Z` / `Cmd+Shift+Z`: Redo
- `Ctrl+F` / `Cmd+F`: Find
- `Ctrl+H` / `Cmd+H`: Find and replace

## Security

All file operations are restricted to the `/config` directory for security. The add-on cannot access files outside this directory.

## Troubleshooting

**Autocomplete not working?**
- Make sure your Home Assistant instance has entities configured
- Try refreshing the page
- Click the "Refresh Entities" button in the toolbar

**Theme not switching?**
- Check your browser's theme setting (for auto mode)
- Try manually selecting light or dark in the add-on configuration

**Can't save files?**
- Ensure the add-on has proper permissions (configured automatically)
- Check Home Assistant logs for errors
