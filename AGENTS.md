# AGENTS.md - Development Guide for AI Agents

This guide helps agentic coding agents understand the codebase structure, build processes, and coding conventions.

## Quick Start Commands

### Build & Run
```bash
# Full build and run
make build run

# Or step by step
make build-frontend    # Build TypeScript frontend
make build-docker      # Build Docker image
make run              # Start container at localhost:8099

# Development
make dev-frontend     # Run Vite dev server (hot reload)
make restart          # Rebuild and restart container
make clean            # Remove all build artifacts
```

### Testing
```bash
# Run full test suite (builds and runs container with test config)
make test

# View logs from running container
make logs

# Stop container
make stop
```

## Project Structure

```
conf-edit-ha/
├── conf-edit-ha/              # Backend (Python/Flask)
│   ├── app.py                 # Main Flask application
│   ├── requirements.txt        # Python dependencies
│   ├── config.yaml            # Home Assistant add-on config
│   ├── frontend/              # Frontend source (TypeScript/Vite)
│   │   ├── src/
│   │   │   ├── main.ts        # App entry point & UI logic
│   │   │   ├── api.ts         # API client & interfaces
│   │   │   ├── editor.ts      # CodeMirror 6 setup
│   │   │   ├── autocomplete.ts # Entity autocomplete logic
│   │   │   └── theme.ts       # Theme management
│   │   ├── package.json       # npm dependencies
│   │   ├── tsconfig.json      # TypeScript config
│   │   └── index.html         # Entry HTML
│   └── static/                # Built frontend (generated)
├── Makefile                   # Build commands (top-level)
└── .git/                      # Git repository
```

## Build & Test Commands

### Frontend
```bash
cd conf-edit-ha/frontend
npm install              # Install dependencies
npm run build           # Build with TypeScript + Vite
npm run dev             # Dev server with hot reload
npm run preview         # Preview production build
```

### Backend
- No dedicated test runner; Flask app runs in Docker
- Entry point: `conf-edit-ha/app.py`
- Dependencies: `Flask==3.0.0`, `PyYAML==6.0.1`, `requests==2.31.0`

### Docker
```bash
make build-docker       # Build Docker image
make run               # Run container (port 8099, test-config volume)
docker logs -f conf-edit-test  # View container logs
docker stop conf-edit-test     # Stop container
```

### Multi-Arch Builds
```bash
make build-multiarch   # Build for linux/amd64, linux/arm64, linux/arm/v7
```

## Code Style Guidelines

### TypeScript/Frontend

**Imports & Organization:**
- Use ES6 module syntax: `import { X } from './file'`
- Group imports: standard library → dependencies → local modules
- Export types/interfaces at module level
- Use `type` keyword for type-only imports when applicable
```typescript
import { type FileInfo } from './api';
```

**Types & Interfaces:**
- Define all API response types as `interface` in `api.ts`
- Use strict types; tsconfig has `strict: true`
- No `any` types unless absolutely necessary
- Document interfaces with JSDoc:
```typescript
/** Represents a file in the tree structure */
export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  children?: FileInfo[];
}
```

**Formatting & Structure:**
- 2-space indentation (enforced by tsconfig target ES2020)
- camelCase for functions, variables, methods
- PascalCase for classes and interfaces
- UPPER_SNAKE_CASE for constants
- JSDoc comments on all exported functions and complex logic
```typescript
/**
 * Fetch all entities from Home Assistant
 */
export async function fetchEntities(): Promise<Entity[]> {
```

**Naming Conventions:**
- `*El` suffix for DOM element variables: `fileListEl`, `saveBtnEl`
- `*Btn` for buttons: `saveBtnEl`, `refreshBtnEl`
- `current*` for state variables: `currentFile`, `currentTheme`
- `is*` for boolean flags: `isModified`, `isLoadingFile`

**Error Handling:**
- Use try/catch for async operations
- Throw descriptive errors with context
- Log errors to console for debugging
```typescript
try {
  const data = await readFile(filename);
} catch (error) {
  console.error(`Failed to read file: ${error}`);
  showError('File read failed');
}
```

**Comments & Documentation:**
- Document complex logic and non-obvious code
- Use block comments (`/** */`) for functions
- Use inline comments for "why" not "what"
- Keep comments up-to-date with code changes

### Python/Backend

**Code Style:**
- PEP 8 compliant
- 4-space indentation
- snake_case for functions and variables
- UPPER_SNAKE_CASE for constants/config
- Type hints in docstrings (no modern type annotations)

**Imports:**
- Standard library first, then dependencies
- Organize logically (os, path, then requests, flask)

**Error Handling:**
- Always validate file paths (prevent directory traversal)
```python
if '..' in filename or filename.startswith('/'):
    return jsonify({'error': 'Access denied'}), 403
```
- Use try/except with specific exceptions
- Return JSON error responses with status codes
- Log errors with print() for container visibility

**Function Documentation:**
```python
def build_file_tree(root_path, current_path=None):
    """Recursively build a tree structure of files and directories"""
    # Implementation...
```

**API Endpoints:**
- Return `(jsonify(data), status_code)` tuples
- Consistent error format: `{'error': 'message'}`
- Success responses use appropriate status codes (200, 201, 400, 404, 403, 500)

## Configuration & Environment

### Flask App (app.py)
- `HA_URL`: Home Assistant supervisor endpoint (`http://supervisor/core/api`)
- `TOKEN`: Home Assistant supervisor token (from environment)
- `PORT`: 8099 (fixed for Home Assistant ingress)
- `CONFIG_DIR`: Directory for YAML files (fallback: `/config` → `/homeassistant`)

### Docker
- Base image: Home Assistant Alpine Python 3.11
- Mount point: `/config` → test config directory
- Port: 8099
- Frontend built to `static/` before Docker build

## Key Dependencies

**Frontend:**
- `codemirror` v6: Lightweight code editor
- `@codemirror/lang-yaml`: YAML syntax highlighting
- `@codemirror/autocomplete`: Entity autocomplete
- `vite`: Build tool
- `typescript`: Type checking

**Backend:**
- `Flask==3.0.0`: Web framework
- `PyYAML==6.0.1`: YAML parsing
- `requests==2.31.0`: HTTP client for HA API
- `gunicorn==21.2.0`: WSGI server (in production)

## Common Tasks for Agents

**Adding a new API endpoint:**
1. Add route in `app.py` with proper error handling
2. Add TypeScript interface in `api.ts`
3. Add fetch function in `api.ts`
4. Call from `main.ts` or appropriate module

**Fixing a bug:**
1. Identify which layer: frontend (TypeScript), backend (Python), or both
2. Check Makefile for relevant build/test commands
3. Make changes respecting code style above
4. Test with `make test` or `make dev-frontend`

**Adding dependencies:**
- TypeScript: `npm install package-name` in `frontend/`
- Python: Add to `requirements.txt` and rebuild Docker image

## Notes for Agents

- **No external testing frameworks**: Use `make test` which runs container
- **File operations**: Always validate paths in Python (security first)
- **Async/await**: Properly used in TypeScript for API calls
- **State management**: Uses localStorage for UI state persistence
- **Build output**: Frontend builds to `static/` directory
- **Hot reload**: Use `make dev-frontend` during active development
