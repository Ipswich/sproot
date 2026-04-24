import {
  getLatestImageAsync,
  getLivestreamAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { useQuery } from "@tanstack/react-query";
import { Fragment } from "react/jsx-runtime";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

export default function ImageOrVideoDisplay() {
  const [showStream, setShowStream] = useState(false);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(
    null,
  );
  const latestImageObjectUrlRef = useRef<string | null>(null);

  const imageQuery = useQuery({
    queryKey: ["latest-image"],
    queryFn: () => getLatestImageAsync(),
    refetchInterval: showStream ? false : 60000,
  });

  const streamQuery = useQuery({
    queryKey: ["livestream"],
    queryFn: () => getLivestreamAsync(),
    enabled: showStream,
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
      imageElement?.removeAttribute("src");

      if (latestImageObjectUrlRef.current) {
        URL.revokeObjectURL(latestImageObjectUrlRef.current);
      }
    };
  }, [imageElement]);

  const stopStream = async () => {
    imageElement?.removeAttribute("src");
    setShowStream(false);
    await imageQuery.refetch();
  };

  const displaySource =
    showStream && typeof streamQuery.data === "string"
      ? streamQuery.data
      : typeof imageQuery.data === "string"
        ? imageQuery.data
        : undefined;

  return (
    <Fragment>
      <div style={{ position: "relative" }}>
        <img
          ref={setImageElement}
          src={displaySource}
          alt="Camera stream"
          style={{
            display: "block",
            width: "100%",
            borderRadius: "var(--mantine-radius-sm)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            cursor: "pointer",
          }}
          onClick={async () => {
            if (showStream) {
              await stopStream();
              return;
            }

            setShowStream(true);
          }}
        >
          {showStream ? (
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
          ) : (
            <IconPlayerPlay
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                filter: "drop-shadow(0px 0px 3px rgba(0, 0, 0, 0.7))",
              }}
              color="var(--mantine-color-blue-filled)"
            />
          )}
        </div>
      </div>
    </Fragment>
  );
}
