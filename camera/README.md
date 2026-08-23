# Sproot Camera Service

Standalone HTTP camera service for Picamera2/libcamera hardware.

## Endpoints

- `GET /stream.mjpg`
- `GET /capture`
- `GET /health`

All endpoints require the `X-Interservice-Authentication-Token` header.

## Configuration

- `INTERSERVICE_AUTHENTICATION_KEY`
- `CAMERA_IMAGE_RESOLUTION` in `WIDTHxHEIGHT` format, optional
- `CAMERA_VIDEO_RESOLUTION` in `WIDTHxHEIGHT` format
- `CAMERA_FPS`
- `CAMERA_PORT`
- `CAMERA_GRACEFUL_SHUTDOWN_TIMEOUT`

## Local Run

```bash
INTERSERVICE_AUTHENTICATION_KEY=CHANGE_ME python3 camera/server.py
```