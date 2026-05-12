import { Paper, Text, Group, Button, Alert, Stack } from "@mantine/core";
import {
  getSubcontrollerConnectionStatusAsync,
  getFirmwareManifestAsync,
  triggerSubcontrollerFirmwareUpdateAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";

export default function UpdateFirmwareContainer(props: { id: number }) {
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const firmwareManifestQuery = useQuery({
    queryKey: ["firmware-manifest"],
    queryFn: async () => {
      return await getFirmwareManifestAsync();
    },
  });

  const connectionStatusQuery = useQuery<{ online: boolean; version?: string }>(
    {
      queryKey: ["subcontroller-connection-status", props.id],
      queryFn: async () => {
        return await getSubcontrollerConnectionStatusAsync(props.id);
      },
    },
  );

  const updateFirmwareMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await triggerSubcontrollerFirmwareUpdateAsync(id);
      return result;
    },
  });
  return (
    <Fragment>
      <Paper
        px="md"
        py="sm"
        withBorder
        shadow="md"
        radius="md"
        opacity="80%"
        w={"100%"}
      >
        <Stack>
          <Group justify="center">
            <Text fw={500}>
              {" "}
              Firmware Version:{" "}
              {connectionStatusQuery.data?.version ?? "Unknown"}
            </Text>
          </Group>
          <Group justify="center">
            <Button
              disabled={
                isButtonDisabled ||
                connectionStatusQuery.data == undefined ||
                !connectionStatusQuery.data.online ||
                firmwareManifestQuery.data == undefined ||
                connectionStatusQuery.data.version ===
                  firmwareManifestQuery.data.version
              }
              loading={updateFirmwareMutation.isPending}
              onClick={async () => {
                setIsButtonDisabled(true);
                await updateFirmwareMutation.mutateAsync(props.id);
                setIsButtonDisabled(false);
              }}
            >
              Update Firmware ({firmwareManifestQuery.data?.version})
            </Button>
          </Group>
        </Stack>

        {updateFirmwareMutation.isSuccess &&
          updateFirmwareMutation.data &&
          (() => {
            const response = updateFirmwareMutation.data as {
              status: number;
              message: string;
            };
            const ok = response.status >= 200 && response.status < 300;
            const alertColor = ok ? "teal" : "yellow";
            return (
              <Alert color={alertColor} mt="md">
                <Fragment>{response.message}</Fragment>
              </Alert>
            );
          })()}
      </Paper>
    </Fragment>
  );
}
