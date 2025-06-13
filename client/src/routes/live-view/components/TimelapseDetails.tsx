import {
  Button,
  Card,
  Group,
  Modal,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
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
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

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
              <Text fw={500}>Timelapse</Text>
            </Group>
          </Card.Section>
          <Card.Section mx="xs" mb="xs">
            <Stack>
              <Button onClick={() => setConfirmModalOpen(true)}>
                Download
              </Button>

              <Modal
                opened={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                withCloseButton={false}
                centered
              >
                <Stack>
                  <Group justify="center" mt="sm">
                    <Text>Download Archive?</Text>
                  </Group>
                  <Group justify="space-between" mt="sm">
                    <Button
                      color={"red"}
                      onClick={() => setConfirmModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        setConfirmModalOpen(false);
                        try {
                          const response = await getTimelapseArchiveAsync();
                          if (!(response instanceof Blob)) {
                            console.error(
                              "No response received from the server",
                            );
                            return;
                          }
                          const url = window.URL.createObjectURL(
                            new Blob([response]),
                          );
                          const link = document.createElement("a");
                          link.href = url;
                          link.setAttribute(
                            "download",
                            "timelapse-archive.tar",
                          );
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error(
                            "Failed to download timelapse archive:",
                            error,
                          );
                        }
                      }}
                    >
                      Confirm
                    </Button>
                  </Group>
                </Stack>
              </Modal>
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
                    if (
                      timelapseArchiveStatusQuery.data.archiveProgress === -1
                    ) {
                      return "red";
                    }
                    if (
                      timelapseArchiveStatusQuery.data.archiveProgress === 100
                    ) {
                      return "blue";
                    }
                    return "green";
                  })()}
                  animated={
                    timelapseArchiveStatusQuery.data?.archiveProgress < 100 ||
                    false
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
