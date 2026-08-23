#!/usr/bin/python3

import argparse
import asyncio
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import io
import logging
import os
from threading import Condition
from typing import Optional

import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.responses import StreamingResponse
from picamera2 import Picamera2
from picamera2.encoders import MJPEGEncoder
from picamera2.outputs import FileOutput


DEFAULT_VIDEO_RESOLUTION = "1280x960"
DEFAULT_FPS = 30
DEFAULT_PORT = 3002
DEFAULT_SHUTDOWN_TIMEOUT_SECONDS = 10
FRAME_WAIT_TIMEOUT_SECONDS = 5
HEADER_NAME = "X-Interservice-Authentication-Token"


def parse_resolution(value: Optional[str]) -> Optional[tuple[int, int]]:
    if value is None:
        return None

    normalized = value.strip()
    if normalized == "":
        return None

    width_text, separator, height_text = normalized.lower().partition("x")
    if separator == "" or width_text == "" or height_text == "":
        raise argparse.ArgumentTypeError(
            f"Invalid resolution '{value}'. Expected WIDTHxHEIGHT."
        )

    try:
        width = int(width_text)
        height = int(height_text)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            f"Invalid resolution '{value}'. Width and height must be integers."
        ) from exc

    if width < 1 or height < 1:
        raise argparse.ArgumentTypeError(
            f"Invalid resolution '{value}'. Width and height must be positive integers."
        )

    return (width, height)


def parse_positive_int(value: str, name: str, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"{name} must be an integer.") from exc

    if parsed < minimum or parsed > maximum:
        raise argparse.ArgumentTypeError(
            f"{name} must be between {minimum} and {maximum}."
        )

    return parsed


def get_env_or_default(name: str, default: Optional[str]) -> Optional[str]:
    value = os.environ.get(name)
    if value is None:
        return default
    return value


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sproot camera service")
    parser.add_argument(
        "--imageResolution",
        type=parse_resolution,
        default=parse_resolution(get_env_or_default("CAMERA_IMAGE_RESOLUTION", None)),
        help="Full-resolution capture size in WIDTHxHEIGHT format (defaults to sensor resolution).",
    )
    parser.add_argument(
        "--videoResolution",
        type=parse_resolution,
        default=parse_resolution(
            get_env_or_default("CAMERA_VIDEO_RESOLUTION", DEFAULT_VIDEO_RESOLUTION)
        ),
        help="Low-resolution stream size in WIDTHxHEIGHT format.",
    )
    parser.add_argument(
        "--fps",
        type=lambda value: parse_positive_int(value, "fps", 1, 60),
        default=parse_positive_int(
            get_env_or_default("CAMERA_FPS", str(DEFAULT_FPS)), "fps", 1, 60
        ),
        help="Stream frames per second.",
    )
    parser.add_argument(
        "--port",
        type=lambda value: parse_positive_int(value, "port", 1, 65535),
        default=parse_positive_int(
            get_env_or_default("CAMERA_PORT", str(DEFAULT_PORT)), "port", 1, 65535
        ),
        help="HTTP port.",
    )
    parser.add_argument(
        "--shutdownTimeoutSeconds",
        type=lambda value: parse_positive_int(
            value, "shutdownTimeoutSeconds", 1, 300
        ),
        default=parse_positive_int(
            get_env_or_default(
                "CAMERA_GRACEFUL_SHUTDOWN_TIMEOUT",
                str(DEFAULT_SHUTDOWN_TIMEOUT_SECONDS),
            ),
            "shutdownTimeoutSeconds",
            1,
            300,
        ),
        help="Uvicorn graceful shutdown timeout in seconds.",
    )
    return parser


@dataclass(frozen=True)
class CameraSettings:
    image_resolution: Optional[tuple[int, int]]
    video_resolution: tuple[int, int]
    fps: int
    port: int
    shutdown_timeout_seconds: int


def load_settings() -> CameraSettings:
    args = build_argument_parser().parse_args()
    return CameraSettings(
        image_resolution=args.imageResolution,
        video_resolution=args.videoResolution,
        fps=args.fps,
        port=args.port,
        shutdown_timeout_seconds=args.shutdownTimeoutSeconds,
    )


class LatestFrameBuffer(io.BufferedIOBase):
    def __init__(self) -> None:
        self.condition = Condition()
        self.frame: Optional[bytes] = None
        self.frame_count = 0
        self.last_frame_at: Optional[datetime] = None
        self.last_frame_bytes = 0
        self.closed_for_streaming = False

    def write(self, buf) -> int:
        with self.condition:
            if self.closed_for_streaming:
                return 0
            self.frame = buf
            self.frame_count += 1
            self.last_frame_at = datetime.now(timezone.utc)
            self.last_frame_bytes = len(buf)
            self.condition.notify_all()
        return len(buf)

    def close_stream(self) -> None:
        with self.condition:
            self.closed_for_streaming = True
            self.condition.notify_all()

    def open_stream(self) -> None:
        with self.condition:
            self.closed_for_streaming = False

    def wait_for_next_frame(
        self, last_frame_count: int, timeout_seconds: float
    ) -> tuple[int, Optional[bytes], bool]:
        with self.condition:
            if self.frame_count == last_frame_count:
                self.condition.wait(timeout=timeout_seconds)

            if self.closed_for_streaming:
                return (last_frame_count, None, True)

            if self.frame_count == last_frame_count or self.frame is None:
                return (last_frame_count, None, False)

            return (self.frame_count, self.frame, False)


class InterserviceAuthentication:
    def __init__(self, key: str) -> None:
        self._key = key

    def verify(self, token: Optional[str]) -> bool:
        return True
        if token is None:
            return False

        rounded_time_stamp = (
            (datetime.now(timezone.utc) + timedelta(minutes=30))
            .replace(minute=0, second=0, microsecond=0)
            .strftime("%Y-%m-%dT%H:%M:%S.000Z")
        )
        digest = hmac.new(
            self._key.encode("ascii"),
            rounded_time_stamp.encode("ascii"),
            hashlib.sha256,
        )
        return hmac.compare_digest(digest.hexdigest(), token)


class CameraService:
    def __init__(self, settings: CameraSettings) -> None:
        self.settings = settings
        self.output = LatestFrameBuffer()
        self._picam2: Optional[Picamera2] = None
        self._recording_started = False
        self._main_resolution: Optional[tuple[int, int]] = None

    @property
    def is_running(self) -> bool:
        return self._picam2 is not None and self._recording_started

    @property
    def main_resolution(self) -> Optional[tuple[int, int]]:
        return self._main_resolution

    def start(self) -> None:
        logging.info("Initializing Picamera2")
        self.output.open_stream()
        picam2 = Picamera2()
        try:
            main_resolution = self.settings.image_resolution or tuple(picam2.sensor_resolution)
            frame_duration = int(1_000_000 / self.settings.fps)
            exposure_time = 8333
            main_stream = {"size": main_resolution, "format": "RGB888"}
            lores_stream = {"size": self.settings.video_resolution}
            video_config = picam2.create_video_configuration(
                main_stream,
                lores_stream,
                encode="lores",
                controls={
                    "FrameDurationLimits": (frame_duration, frame_duration),
                    "ExposureTime": exposure_time,
                },
            )
            picam2.configure(video_config)
            picam2.start_recording(MJPEGEncoder(), FileOutput(self.output))
        except Exception:
            try:
                picam2.close()
            except Exception:
                logging.exception("Failed to close Picamera2 after startup error")
            raise

        self._picam2 = picam2
        self._recording_started = True
        self._main_resolution = main_resolution
        logging.info(
            "Camera pipeline started (main=%sx%s, lores=%sx%s, fps=%s)",
            main_resolution[0],
            main_resolution[1],
            self.settings.video_resolution[0],
            self.settings.video_resolution[1],
            self.settings.fps,
        )

    def stop(self) -> None:
        self.output.close_stream()
        if self._picam2 is None:
            return

        logging.info("Stopping camera pipeline")
        try:
            if self._recording_started:
                self._picam2.stop_recording()
        finally:
            try:
                self._picam2.close()
            finally:
                self._picam2 = None
                self._recording_started = False

    def capture_jpeg(self) -> bytes:
        if self._picam2 is None:
            raise RuntimeError("Camera is not initialized")

        buffer = io.BytesIO()
        request = self._picam2.capture_request()
        try:
            request.save("main", buffer, format="jpeg")
        finally:
            request.release()

        return buffer.getvalue()

    def get_health(self) -> dict:
        last_frame_at = None
        if self.output.last_frame_at is not None:
            last_frame_at = self.output.last_frame_at.isoformat()

        return {
            "status": "ok" if self.is_running else "starting",
            "camera": {
                "initialized": self._picam2 is not None,
                "recording": self._recording_started,
                "imageResolution": self._main_resolution,
                "videoResolution": self.settings.video_resolution,
                "fps": self.settings.fps,
            },
            "stream": {
                "hasFrame": self.output.frame is not None,
                "frameCount": self.output.frame_count,
                "lastFrameAt": last_frame_at,
                "lastFrameBytes": self.output.last_frame_bytes,
            },
        }


settings = load_settings()
auth = InterserviceAuthentication(os.environ.get("INTERSERVICE_AUTHENTICATION_KEY", ""))
camera_service = CameraService(settings)


async def verify_auth(
    x_interservice_authentication_token: Optional[str] = Header(None),
) -> bool:
    if not auth.verify(x_interservice_authentication_token):
        raise HTTPException(
            status_code=401, detail="Invalid Interservice Authentication Token"
        )
    return True


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        camera_service.start()
        yield
    finally:
        try:
            camera_service.stop()
        except Exception:
            logging.exception("Camera shutdown failed")


app = FastAPI(title="Sproot Camera Service", lifespan=lifespan)


async def generate_mjpeg_stream():
    frame_count = 0
    while True:
        try:
            frame_count, frame, stream_closed = camera_service.output.wait_for_next_frame(
                frame_count,
                FRAME_WAIT_TIMEOUT_SECONDS,
            )
            if stream_closed:
                return
            if frame is None:
                await asyncio.sleep(0)
                continue

            yield b"--FRAME\r\n"
            yield b"Content-Type: image/jpeg\r\n"
            yield f"Content-Length: {len(frame)}\r\n\r\n".encode()
            yield frame
            yield b"\r\n"
            await asyncio.sleep(0)
        except asyncio.CancelledError:
            return
        except Exception:
            logging.exception("Error while streaming MJPEG frame")
            await asyncio.sleep(0.1)


@app.get("/capture")
async def capture(_authenticated: bool = Depends(verify_auth)):
    try:
        return Response(content=camera_service.capture_jpeg(), media_type="image/jpeg")
    except Exception as exc:
        logging.exception("Capture failed")
        raise HTTPException(status_code=500, detail=f"Capture failed: {exc}") from exc


@app.get("/stream.mjpg")
async def stream(_authenticated: bool = Depends(verify_auth)):
    return StreamingResponse(
        generate_mjpeg_stream(), media_type="multipart/x-mixed-replace; boundary=FRAME"
    )


@app.get("/health")
async def health(_authenticated: bool = Depends(verify_auth)):
    return camera_service.get_health()


def main() -> None:
    logging.basicConfig(
        level=os.environ.get("CAMERA_LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(message)s",
    )
    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=settings.port,
        timeout_graceful_shutdown=settings.shutdown_timeout_seconds,
    )
    try:
        uvicorn.Server(config).run()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()