#!/usr/bin/python3

import argparse
import asyncio
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import os
import io
import logging
from threading import Condition
from typing import Optional

import uvicorn
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException, Response, Depends
from fastapi.responses import StreamingResponse

from picamera2 import Picamera2
from picamera2.encoders import MJPEGEncoder
from picamera2.outputs import FileOutput

# Parse command line arguments
picam2 = Picamera2()
parser = argparse.ArgumentParser(description="Picamera2 MJPEG streaming with FastAPI")
parser.add_argument(
    "--imageResolution",
    type=str,
    help="Image resolution in WIDTHxHEIGHT format (default: camera max)",
    default=f"{picam2.sensor_resolution[0]}x{picam2.sensor_resolution[1]}"
)
parser.add_argument(
    "--videoResolution",
    type=str,
    help="Video resolution in WIDTHxHEIGHT format (default: 1280x960)",
    default="1280x960"
)
parser.add_argument(
    "--fps",
    type=int,
    help="Frame rate to record at. (default: 30)",
    default=30
)


# Parse arguments
args = parser.parse_args()
image_resolution = tuple(map(int, args.imageResolution.split("x")))
video_resolution = tuple(map(int, args.videoResolution.split("x")))
fps = min(max(args.fps, 1), 60)  # Ensure fps is between 1 and 60


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup code
    picam2.start_recording(MJPEGEncoder(), FileOutput(output))
    yield
    # Shutdown code
    picam2.stop_recording()


app = FastAPI(title="Pi Camera Server", lifespan=lifespan)


class StreamingOutput(io.BufferedIOBase):
    def __init__(self):
        self.frame = None
        self.condition = Condition()

    def write(self, buf):
        with self.condition:
            self.frame = buf
            self.condition.notify_all()


class InterserviceAuthentication:
    def verify(self, token: Optional[str] = None) -> bool:
        if token is None:
            return False

        key = os.environ.get("INTERSERVICE_AUTHENTICATION_KEY", "")
        rounded_time_stamp = (
            (datetime.now(timezone.utc) + timedelta(minutes=30))
            .replace(minute=0, second=0, microsecond=0)
            .strftime("%Y-%m-%dT%H:%M:%S.000Z")
        )
        h = hmac.new(
            key.encode("ascii"),
            (rounded_time_stamp).encode("ascii"),
            hashlib.sha256,
        )
        return h.hexdigest() == token


# Initialize camera and output
frame_duration = int(1_000_000 / fps)
interservice_auth = InterserviceAuthentication()
main_stream = {"size": image_resolution, "format": "RGB888"}
lores_stream = {"size": video_resolution}
video_config = picam2.create_video_configuration(
    main_stream,
    lores_stream,
    encode="lores",
    controls={"FrameDurationLimits": (frame_duration, frame_duration)})
picam2.configure(video_config)
output = StreamingOutput()


async def verify_auth(
    x_interservice_authentication_token: Optional[str] = Header(None),
) -> bool:
    if not interservice_auth.verify(x_interservice_authentication_token):
        raise HTTPException(
            status_code=401, detail="Invalid Interservice Authentication Token"
        )
    return True


@app.get("/capture")
async def capture(authenticated: bool = Depends(verify_auth)):
    try:
        buffer = io.BytesIO()
        request = picam2.capture_request()
        try:
            request.save("main", buffer, format="jpeg")
        finally:
            # Always release the request
            request.release()
        
        buffer.seek(0)
        content = buffer.read()
        # Explicitly close and dereference the buffer
        buffer.close()
        buffer = None
        
        return Response(content=content, media_type="image/jpeg")
    except Exception as e:
        logging.error(f"Error in capture endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Capture failed: {str(e)}")


async def generate_mjpeg_stream():
    try:
        while True:
            try:
                with output.condition:
                    # Add timeout to prevent deadlocks
                    if not output.condition.wait(timeout=5):
                        # If timeout occurs, send an empty frame or continue
                        continue
                    
                    if output.frame is None:
                        continue
                    
                    frame = output.frame
                
                yield b"--FRAME\r\n"
                yield b"Content-Type: image/jpeg\r\n"
                yield f"Content-Length: {len(frame)}\r\n\r\n".encode()
                yield frame
                yield b"\r\n"
                await asyncio.sleep(0)
            except Exception as e:
                logging.error(f"Error in stream generation: {str(e)}")
                # Add small delay to avoid CPU spinning on errors
                await asyncio.sleep(0.1)
    except Exception as e:
        logging.warning(f"Streaming client disconnected: {str(e)}")


@app.get("/stream.mjpg")
async def stream(authenticated: bool = Depends(verify_auth)):
    return StreamingResponse(
        generate_mjpeg_stream(), media_type="multipart/x-mixed-replace; boundary=FRAME"
    )


if __name__ == "__main__":
    config = uvicorn.Config(app, host="0.0.0.0", port=3002, timeout_graceful_shutdown=1)
    uvicorn.Server(config).run()