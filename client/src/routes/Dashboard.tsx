import { Fragment, useState } from "react";
import {
  getLatestImageAsync,
  getLivestreamAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { useQuery } from "@tanstack/react-query";
import { Image } from "@mantine/core";
import { IconPlayerPlay, IconPlayerPause } from "@tabler/icons-react";

export default function Dashboard() {
  const [showStream, setShowStream] = useState(false);

  const imageQuery = useQuery({
    queryKey: ["latest-image"],
    queryFn: () => getLatestImageAsync(),
    refetchInterval: 60000,
  });

  const streamQuery = useQuery({
    queryKey: ["livestream"],
    queryFn: () => getLivestreamAsync(),
  });

  return (
    <Fragment>
      <div style={{ position: "relative" }}>
        <Image src={showStream ? streamQuery.data : imageQuery.data} />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            cursor: "pointer",
          }}
          onClick={() => setShowStream(!showStream)}
        >
          {showStream ? (
            <IconPlayerPause
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                filter: "drop-shadow(0px 0px 3px rgba(0, 0, 0, 0.7))",
              }}
              color="white"
            />
          ) : (
            <IconPlayerPlay
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                filter: "drop-shadow(0px 0px 3px rgba(0, 0, 0, 0.7))",
              }}
              color="white"
            />
          )}
        </div>
      </div>
    </Fragment>
  );
}
