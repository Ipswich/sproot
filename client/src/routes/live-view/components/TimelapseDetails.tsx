import { Button, Card, Group, Progress, Stack, Text } from "@mantine/core";
import {
  getCameraSettingsAsync,
  getTimelapseArchiveAsync,
  getTimelapseArchiveStatusAsync,
  regenerateTimelapseArchiveAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Fragment } from "react/jsx-runtime";

export default function TimelapseDetails() {
  const [statusRefetchInterval, setStatusRefetchInterval] = useState(60000);

  const cameraSettingsQuery = useQuery({
    queryKey: ["camera-settings"],
    queryFn: () => getCameraSettingsAsync(),
    refetchInterval: 60000,
  });

  const timelapseArchiveStatusQuery = useQuery({
    queryKey: ["timelapse-archive-status"],
    queryFn: () => getTimelapseArchiveStatusAsync(),
    refetchInterval: statusRefetchInterval,
  });

  useEffect(() => {
    const data = timelapseArchiveStatusQuery.data;
    if (data) {
      if (data.isGenerating) {
        setStatusRefetchInterval(1000); // 1 second
      } else {
        setStatusRefetchInterval(60000); // 60 seconds
      }
    }
  }, [timelapseArchiveStatusQuery.data]);

  return (
    <Fragment>
      {cameraSettingsQuery.data?.timelapseEnabled && (
        <Card withBorder shadow="sm" radius="md">
          <Card.Section inheritPadding py="sm">
            <Group justify="center">
              <Text fw={500}>Timelapse Archive</Text>
            </Group>
          </Card.Section>
          <Card.Section mx="xs" mb="xs">
            <Stack>
              <Button
                onClick={async () => {
                  try {
                    await getTimelapseArchiveAsync();
                  } catch (error) {
                    console.error(
                      "Failed to download timelapse archive:",
                      error,
                    );
                  }
                }}
              >
                Download
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await regenerateTimelapseArchiveAsync();
                    timelapseArchiveStatusQuery.refetch();
                  } catch (error) {
                    console.error(
                      "Failed to regenerate timelapse archive:",
                      error,
                    );
                  }
                }}
              >
                Regenerate
              </Button>
              {timelapseArchiveStatusQuery.data && (
                <Progress
                  value={(function () {
                    if (timelapseArchiveStatusQuery.data.isGenerating) {
                      return timelapseArchiveStatusQuery.data.archiveProgress;
                    }
                    return 100;
                  })()}
                  color={(function () {
                    switch (timelapseArchiveStatusQuery.data.archiveProgress) {
                      case -1:
                        return "red";
                      case 0:
                        return "blue";
                      case 100:
                        return "blue";
                      default:
                        return "green";
                    }
                  })()}
                  animated={
                    timelapseArchiveStatusQuery.data.archiveProgress < 100 &&
                    timelapseArchiveStatusQuery.data.archiveProgress > 0
                  }
                />
              )}
            </Stack>
          </Card.Section>
        </Card>
      )}
    </Fragment>
  );
}
