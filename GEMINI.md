# GEMINI.md - Context & Instructions

## Project Overview

**Project Name:** Home Assistant Configuration Editor (`conf-edit-ha`)

**Description:**
A lightweight Home Assistant add-on that provides a web-based text editor for configuration files. It features YAML syntax highlighting, entity autocomplete, and a VS Code-style file tree. It is designed to be a smaller, faster alternative to the VS Code add-on for simple editing tasks.

**Core Features:**
*   **Editor:** CodeMirror 6 with YAML support.
*   **Autocomplete:** Entity ID suggestions fetched from Home Assistant.
*   **Security:** File operations restricted to the `/homeassistant_config` directory; auto-backups on save.
*   **Architecture:** Multi-arch support (amd64, aarch64) via Docker and GHCR.
*   **Integration:** Runs via Home Assistant Ingress.

## Tech Stack

*   **Backend:** Python 3.11 + Flask + Gunicorn (Production WSGI)
*   **Frontend:** TypeScript + Vite + CodeMirror 6 (Vanilla TS)
*   **Container:** Alpine Linux based (via Home Assistant base images)
*   **Styling:** CSS Variables (VS Code-like dark/light themes)

## Directory Structure

```text
/
├── repository.yaml        # Repository metadata (required by HA)
├── README.md              # Main documentation with status badges
├── Makefile               # Forwarding makefile for root commands
├── .github/workflows/
│   └── builder.yaml       # Consolidated Lint + Multi-arch Build workflow
└── conf-edit-ha/          # Add-on source directory
    ├── app.py             # Main Flask application
    ├── config.yaml        # Add-on configuration (metadata, options)
    ├── build.yaml         # Multi-arch build configuration (base images, labels)
    ├── Dockerfile         # Docker container definition
    ├── requirements.txt   # Python backend dependencies (includes gunicorn)
    ├── run.sh             # Entrypoint script (starts Gunicorn)
    ├── frontend/          # Frontend source code
    └── static/            # Compiled frontend assets
```

## Build & Run Instructions

### Quick Commands (from Root)

*   **Build & Run:** `make build run`
*   **Build Frontend:** `make build-frontend`
*   **Build Docker:** `make build-docker`
*   **Run Container:** `make run`

### Manual Production Start
The add-on starts via `run.sh`, which executes:
```bash
gunicorn --bind 0.0.0.0:8099 --workers 2 --timeout 120 app:app
```

## Development Conventions

*   **Repository Structure:** Always keep add-on source code in the `conf-edit-ha/` subdirectory. Root is for repository-level metadata.
*   **Security:** File operations are restricted to `homeassistant_config` (mapped to `/config` in the container).
*   **Versioning:** Update `version` in `conf-edit-ha/config.yaml` and tag with `vX.Y.Z` to trigger a build.
*   **CI/CD:** The `Builder` workflow handles both config linting and multi-arch Docker builds.