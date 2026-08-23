import { Box, Center, Text } from "@mantine/core";
import {
  getLatestImageAsync,
  getLivestreamAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { useQuery } from "@tanstack/react-query";
import { Fragment } from "react/jsx-runtime";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

export default function ImageOrVideoDisplay({
  camera,
}: {
  camera: SDBCameraSettings;
}) {
  const hasCaptureUrl = camera.captureUrl.trim() !== "";
  const hasStreamUrl = camera.streamUrl.trim() !== "";
  const [showStream, setShowStream] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const latestImageObjectUrlRef = useRef<string | null>(null);

  const imageQuery = useQuery({
    queryKey: ["latest-image", camera.id],
    queryFn: () => getLatestImageAsync(camera.id),
    refetchInterval: showStream ? false : 60000,
    enabled: hasCaptureUrl,
  });

  const streamQuery = useQuery({
    queryKey: ["livestream", camera.id],
    queryFn: () => getLivestreamAsync(camera.id),
    enabled: showStream && hasStreamUrl,
  });

  useEffect(() => {
    if (
      typeof imageQuery.data !== "string" ||
      !imageQuery.data.startsWith("blob:")
    ) {
      return;
    }

    const previousObjectUrl = latestImageObjectUrlRef.current;
    latestImageObjectUrlRef.current = imageQuery.data;

    if (previousObjectUrl && previousObjectUrl !== imageQuery.data) {
      URL.revokeObjectURL(previousObjectUrl);
    }
  }, [imageQuery.data]);

  useEffect(() => {
    return () => {
      imgRef.current?.removeAttribute("src");

      if (latestImageObjectUrlRef.current) {
        URL.revokeObjectURL(latestImageObjectUrlRef.current);
      }
    };
  }, []);

  const stopStream = async () => {
    imgRef.current?.removeAttribute("src");
    setShowStream(false);
    if (hasCaptureUrl) {
      await imageQuery.refetch();
    }
  };

  const displaySource =
    showStream && hasStreamUrl && typeof streamQuery.data === "string"
      ? streamQuery.data
      : hasCaptureUrl && typeof imageQuery.data === "string"
        ? imageQuery.data
        : undefined;
  const shouldShowPlaceholder = displaySource === undefined;
  const canToggleStream = hasStreamUrl;
  const placeholderLabel = hasStreamUrl
    ? `Start ${camera.name} live stream`
    : "Waiting for latest capture";

  return (
    <Fragment>
      <Box style={{ position: "relative" }}>
        {shouldShowPlaceholder ? (
          <Center
            style={{
              display: "flex",
              width: "100%",
              minHeight: 320,
              background: "#111",
              borderRadius: "var(--mantine-radius-sm)",
            }}
          >
            <Text c="dimmed">{placeholderLabel}</Text>
          </Center>
        ) : (
          <img
            ref={imgRef}
            src={displaySource}
            alt={`${camera.name} stream`}
            style={{
              display: "block",
              width: "100%",
              minHeight: 320,
              objectFit: "cover",
              background: "#111",
              borderRadius: "var(--mantine-radius-sm)",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            cursor: canToggleStream ? "pointer" : "default",
          }}
          onClick={async () => {
            if (!canToggleStream) {
              return;
            }

            if (showStream) {
              await stopStream();
              return;
            }

            setShowStream(true);
          }}
        >
          {canToggleStream && showStream ? (
            <IconPlayerPause
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                filter: "drop-shadow(0px 0px 3px rgba(0, 0, 0, 0.7))",
                color: "blue",
              }}
              color="var(--mantine-color-blue-filled)"
            />
          ) : canToggleStream ? (
            <IconPlayerPlay
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                filter: "drop-shadow(0px 0px 3px rgba(0, 0, 0, 0.7))",
              }}
              color="var(--mantine-color-blue-filled)"
            />
          ) : null}
        </div>
      </Box>
    </Fragment>
  );
}
