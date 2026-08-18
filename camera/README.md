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
- `CAMERA_STALL_TIMEOUT_SECONDS`
- `CAMERA_WATCHDOG_INTERVAL_SECONDS`
- `CAMERA_MAX_RECOVERY_FAILURES`

## Health and Recovery

The service tracks when the MJPEG encoder last produced a frame. If the camera stops producing
frames for longer than `CAMERA_STALL_TIMEOUT_SECONDS`, a watchdog fully recreates the Picamera2
pipeline while preserving the existing dual-stream layout:

- main stream for `/capture`
- lores stream for `/stream.mjpg`

`GET /health` reports `starting`, `healthy`, `recovering`, or `failed`, plus the last frame time
and recovery counters. If recovery fails `CAMERA_MAX_RECOVERY_FAILURES` times in a row, the
process terminates so a container supervisor such as Docker can restart it.

## Package Policy

The container image intentionally uses the Raspberry Pi distribution camera packages such as
`python3-picamera2` instead of mixing independently installed Picamera2/libcamera versions from
`pip`. Keep the base image updated so camera stack fixes from Raspberry Pi and Debian are picked up.

## Local Run

```bash
cd camera
source ../.camera-venv/bin/activate
INTERSERVICE_AUTHENTICATION_KEY=CHANGE_ME python3 server.py
```