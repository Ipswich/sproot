import { Fragment, useEffect, useState } from "react";
import { Select, Stack } from "@mantine/core";
import { useLoaderData } from "react-router-dom";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import ImageOrVideoDisplay from "./components/ImageOrVideoDisplay";
import TimelapseDetails from "./components/TimelapseDetails";

const CAMERA_STORAGE_KEY = "sproot-live-view-camera-id";

export default function LiveView() {
  const { cameraSettings } = useLoaderData() as {
    cameraSettings: SDBCameraSettings[];
  };
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  useEffect(() => {
    const storedCameraId = window.localStorage.getItem(CAMERA_STORAGE_KEY);
    const defaultCameraId = cameraSettings[0]?.id?.toString() ?? null;
    const nextCameraId = cameraSettings.some(
      (camera) => camera.id.toString() === storedCameraId,
    )
      ? storedCameraId
      : defaultCameraId;
    setSelectedCameraId(nextCameraId);
  }, [cameraSettings]);

  const selectedCamera = cameraSettings.find(
    (camera) => camera.id.toString() === selectedCameraId,
  );

  return (
    <Fragment>
      <Stack>
        <Select
          label="Camera"
          value={selectedCameraId}
          data={cameraSettings.map((camera) => ({
            value: camera.id.toString(),
            label: camera.name,
          }))}
          allowDeselect={false}
          onChange={(value) => {
            if (!value) {
              return;
            }
            setSelectedCameraId(value);
            window.localStorage.setItem(CAMERA_STORAGE_KEY, value);
          }}
        />
        {selectedCamera && (
          <>
            <ImageOrVideoDisplay
              cameraId={selectedCamera.id}
              cameraName={selectedCamera.name}
            />
            <TimelapseDetails camera={selectedCamera} />
          </>
        )}
      </Stack>
    </Fragment>
  );
}
