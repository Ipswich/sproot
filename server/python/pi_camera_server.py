#!/usr/bin/python3

import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import os
from http import server
import io
import logging
import socketserver
from threading import Condition

from picamera2 import Picamera2
from picamera2.encoders import MJPEGEncoder
from picamera2.outputs import FileOutput

# Parse command line arguments
parser = argparse.ArgumentParser(
    description="Picamera2 MJPEG streaming demo with options"
)
parser.add_argument(
    "--resolution",
    type=str,
    help="Video resolution in WIDTHxHEIGHT format (default: 640x480)",
    default="640x480",
)
parser.add_argument(
    "--fps", type=int, help="Frame rate to record at. (default: 30)", default=30
)
args = parser.parse_args()

# Parse resolution
resolution = tuple(map(int, args.resolution.split("x")))
fps = args.fps
if fps > 60:
    fps = 60
if fps < 1:
    fps = 1


class StreamingOutput(io.BufferedIOBase):
    def __init__(self):
        self.frame = None
        self.condition = Condition()

    def write(self, buf):
        with self.condition:
            self.frame = buf
            self.condition.notify_all()


class StreamingHandler(server.BaseHTTPRequestHandler):
    def do_GET(self):
        if (
            interservice_authentication.verify(
                self.headers.get("X-Interservice-Authentication-Token")
            )
            is False
        ):
            self.send_response(401)
            self.end_headers()
            return

        if self.path == "/capture":
            self.send_response(200)
            self.send_header("Content-Type", "image/jpeg")
            self.end_headers()
            buffer = io.BytesIO()
            picam2.switch_mode_and_capture_file(
                still_configuration,
                buffer,
                format="jpeg"
            )
            buffer.seek(0)
            self.wfile.write(buffer.read())
        elif self.path == "/stream.mjpg":
            self.send_response(200)
            self.send_header("Age", 0)
            self.send_header("Cache-Control", "no-cache, private")
            self.send_header("Pragma", "no-cache")
            self.send_header(
                "Content-Type", "multipart/x-mixed-replace; boundary=FRAME"
            )
            self.end_headers()
            try:
                while True:
                    with output.condition:
                        output.condition.wait()
                        frame = output.frame
                    self.wfile.write(b"--FRAME\r\n")
                    self.send_header("Content-Type", "image/jpeg")
                    self.send_header("Content-Length", len(frame))
                    self.end_headers()
                    self.wfile.write(frame)
                    self.wfile.write(b"\r\n")
            except Exception as e:
                logging.warning(
                    "Removed streaming client %s: %s", self.client_address, str(e)
                )
        else:
            self.send_error(404)
            self.end_headers()


class StreamingServer(socketserver.ThreadingMixIn, server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True


class InterserviceAuthentication:
    def verify(self, token):
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


if __name__ == "__main__":
    frame_duration = int(1_000_000 / fps)

    picam2 = Picamera2()
    interservice_authentication = InterserviceAuthentication()
    still_configuration = picam2.create_still_configuration(
        main={"size": picam2.sensor_resolution, "format": "RGB888"}
    )
    video_configuration = picam2.create_video_configuration(
        main={"size": resolution, "format": "RGB888"},
        controls={"FrameDurationLimits": (frame_duration, frame_duration)},
    )

    picam2.configure(video_configuration)
    output = StreamingOutput()
    picam2.start_recording(MJPEGEncoder(), FileOutput(output))
    try:
        address = ("", 3002)
        server = StreamingServer(address, StreamingHandler)
        server.serve_forever()
    finally:
        picam2.stop_recording()
