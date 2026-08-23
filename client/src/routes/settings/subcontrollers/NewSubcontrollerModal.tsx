import {
  Button,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { addSubcontrollerAsync } from "../../../requests/requests_v2";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState, useEffect } from "react";
import { useForm } from "@mantine/form";
import { useRevalidator } from "react-router-dom";
import { useMediaQuery } from "@mantine/hooks";

interface NewSubcontrollerModalProps {
  devices: { name: string; hostName: string; address: string | string[] }[];
  modalOpened: boolean;
  closeModal: () => void;
  setIsStale: (isStale: boolean) => void;
}

export interface SubcontrollerFormValues {
  id?: number;
  name: string;
  hostName: string;
}

export default function NewSubcontrollerModal({
  devices,
  modalOpened,
  closeModal,
  setIsStale,
}: NewSubcontrollerModalProps) {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();
  const [isUpdating, setIsUpdating] = useState(false);
  const addSubcontrollerMutation = useMutation({
    mutationFn: async (payload: { name: string; hostName: string }) => {
      return addSubcontrollerAsync(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontrollers"] });
      setIsStale(true);
      revalidator.revalidate();
    },
  });

  const newSubcontrollerForm = useForm({
    initialValues: {
      name: devices[0]?.name || "",
      hostName: devices[0]?.hostName || "",
    } as SubcontrollerFormValues,

    validate: {
      name: (value: string) =>
        !value || (value.length > 0 && value.length <= 64)
          ? null
          : "Name must be between 1 and 64 characters",
      hostName: (value: string) =>
        !value || (value.length > 0 && value.length <= 256)
          ? null
          : "Host Name must be between 1 and 256 characters",
    },
  });

  useEffect(() => {
    // When available devices change (or modal opens), refresh form values so
    // the preselected host/name reflect the latest discovered devices.
    newSubcontrollerForm.setValues({
      name: devices[0]?.name || "",
      hostName: devices[0]?.hostName || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, modalOpened]);
  return (
    <Fragment>
      <Modal
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        fullScreen={isMobile}
        scrollAreaComponent={ScrollArea.Autosize}
        centered
        size="md"
        padding={isMobile ? "md" : "lg"}
        opened={modalOpened}
        onClose={() => {
          closeModal();
          newSubcontrollerForm.setValues({
            name: devices[0]?.name || "",
            hostName: devices[0]?.hostName || "",
          });
        }}
        title="Configure ESP32s"
      >
        <form
          onSubmit={newSubcontrollerForm.onSubmit(async (values) => {
            setIsUpdating(true);
            await addSubcontrollerMutation.mutateAsync({
              name: values.name,
              hostName: values.hostName,
            });
            setIsUpdating(false);
            closeModal();
            newSubcontrollerForm.setValues({
              name: devices[0]?.name || "",
              hostName: devices[0]?.hostName || "",
            });
          })}
        >
          <Stack gap="sm">
            <Paper withBorder radius="lg" p={isMobile ? "sm" : "md"}>
              <Stack gap="xs">
                <Text fw={600}>Connect a subcontroller</Text>
                <Text size="sm" c="dimmed">
                  Choose a discovered ESP32 and give it a friendly name before
                  adding it to the system.
                </Text>
              </Stack>
            </Paper>
            <Paper withBorder radius="md" p="sm">
              <Stack gap="sm">
                <Select
                  label="Host"
                  placeholder="Select device"
                  data={devices.map((device) => ({
                    value: device.hostName,
                    label: `${device.name} (${Array.isArray(device.address) ? device.address.join(", ") : device.address})`,
                  }))}
                  {...newSubcontrollerForm.getInputProps("hostName")}
                  onChange={(value) => {
                    newSubcontrollerForm.setFieldValue("hostName", value ?? "");
                    const device = devices.find(
                      (candidate) => candidate.hostName === value,
                    );
                    if (device?.name) {
                      newSubcontrollerForm.setFieldValue("name", device.name);
                    }
                  }}
                />
                <TextInput
                  maxLength={64}
                  label="Name"
                  placeholder={devices[0]?.name || ""}
                  {...newSubcontrollerForm.getInputProps("name")}
                />
                {devices.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    No unconfigured subcontrollers are currently available.
                  </Text>
                ) : null}
              </Stack>
            </Paper>
            <Group justify="flex-end" mt="xs">
              <Button
                type="submit"
                disabled={isUpdating || devices.length == 0}
                fullWidth={isMobile}
              >
                Add Device
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Fragment>
  );
}
