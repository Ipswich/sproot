import path from "path";
import { IMAGE_DIRECTORY } from "@sproot/common/utility/Constants";

export function getCameraImageDirectory(cameraId: number): string {
  return path.join(IMAGE_DIRECTORY, String(cameraId));
}

export function getCameraLatestImagePath(cameraId: number): string {
  return path.join(getCameraImageDirectory(cameraId), "latest.jpg");
}

export function getCameraTimelapseDirectory(cameraId: number): string {
  return path.join(getCameraImageDirectory(cameraId), "timelapse");
}

export function getCameraArchiveDirectory(cameraId: number): string {
  return path.join(getCameraImageDirectory(cameraId), "archive");
}

export function getCameraArchivePath(cameraId: number): string {
  return path.join(getCameraArchiveDirectory(cameraId), "timelapse.tar");
}