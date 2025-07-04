import { Navigate, useLoaderData } from "react-router-dom";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { IOutputBase } from "@sproot/outputs/IOutputBase";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";

export default function HomeRouter() {
  const { readingTypes, outputs, cameraSettings } = useLoaderData() as {
    readingTypes: Partial<Record<ReadingType, string>>;
    outputs: Record<string, IOutputBase>;
    cameraSettings: SDBCameraSettings;
  };

  if (cameraSettings?.enabled) {
    return <Navigate to="/live-view" replace />;
  }

  if (Object.keys(readingTypes || {}).length > 0) {
    // Navigate to the first available reading type
    const firstReadingType = Object.keys(readingTypes)[0];
    return <Navigate to={`/sensor-data/${firstReadingType}`} replace />;
  }

  if (Object.keys(outputs || {}).length > 0) {
    return <Navigate to="/output-states" replace />;
  }

  // Final fallback - sensor settings
  return <Navigate to="/settings/sensor" replace />;
}
