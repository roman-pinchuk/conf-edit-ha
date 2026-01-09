# Building Configuration Editor

## Multi-Architecture Support

This add-on supports multiple architectures:
- `amd64` - Intel/AMD 64-bit (most PCs and servers)
- `aarch64` - ARM 64-bit (Raspberry Pi 4, newer ARM devices)
- `armv7` - ARM 32-bit (Raspberry Pi 3, older ARM devices)
- `armhf` - ARM hard-float (older ARM devices)
- `i386` - Intel 32-bit (legacy x86 systems)

## Building for Home Assistant

When published to the Home Assistant add-on repository, the build system will automatically build for all architectures using the `build.yaml` configuration.

## Local Development Build

For local testing, you can build for your current architecture:

```bash
# Build frontend
cd frontend && npm run build && cd ..

# Build Docker image
docker build -t conf-edit-ha .

# Run locally
docker run -d --name conf-edit-test -p 8099:8099 -v "$(pwd)/test-config:/config" conf-edit-ha
```

**Note:** On Apple Silicon Macs, you'll see a platform warning. This is expected and doesn't affect functionality. The image runs under Rosetta emulation.

## Multi-Arch Local Build (Optional)

To test building for multiple architectures locally:

```bash
# Create a buildx builder
docker buildx create --name ha-builder --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  --build-arg BUILD_FROM=ghcr.io/home-assistant/amd64-base-python:3.11-alpine3.18 \
  -t conf-edit-ha:latest \
  .
```

## Home Assistant Builder Integration

The `build.yaml` file configures the official Home Assistant builder:

```yaml
build_from:
  aarch64: "ghcr.io/home-assistant/aarch64-base-python:3.11-alpine3.18"
  amd64: "ghcr.io/home-assistant/amd64-base-python:3.11-alpine3.18"
  armhf: "ghcr.io/home-assistant/armhf-base-python:3.11-alpine3.18"
  armv7: "ghcr.io/home-assistant/armv7-base-python:3.11-alpine3.18"
  i386: "ghcr.io/home-assistant/i386-base-python:3.11-alpine3.18"
```

The builder automatically injects the correct base image via the `BUILD_FROM` argument during builds.

## Frontend Build

The frontend must be built before creating the Docker image:

```bash
cd frontend
npm install
npm run build
cd ..
```

This creates the `static/` directory with the compiled frontend assets.

## Release Process

1. Update version in `config.yaml`
2. Build frontend: `cd frontend && npm run build && cd ..`
3. Commit changes
4. Create git tag: `git tag -a v1.0.0 -m "Release v1.0.0"`
5. Push tag: `git push origin v1.0.0`
6. Home Assistant builder will automatically build all architectures

## Troubleshooting

### Platform Mismatch Warning

```
WARNING: The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8)
```

This is expected on Apple Silicon Macs. The image will run correctly under emulation.

### Build Failures

- Ensure frontend is built before Docker build
- Check that `static/` directory exists and contains assets
- Verify Python dependencies in `requirements.txt` are compatible with Alpine Linux
