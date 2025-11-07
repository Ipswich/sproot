import {
  Button,
  Group,
  Modal,
  ScrollArea,
  Select,
  TextInput,
} from "@mantine/core";
import { addSubcontrollerAsync } from "../../../requests/requests_v2";
import { useMutation } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { useForm } from "@mantine/form";
import { useRevalidator } from "react-router-dom";

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
  const revalidator = useRevalidator();
  const [isUpdating, setIsUpdating] = useState(false);
  const addSubcontrollerMutation = useMutation({
    mutationFn: async (payload: { name: string; hostName: string }) => {
      return addSubcontrollerAsync(payload);
    },
    onSuccess: async () => {
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
  return (
    <Fragment>
      <meta name="viewport" content="width=device-width, user-scalable=no" />
      <Modal
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        scrollAreaComponent={ScrollArea.Autosize}
        centered
        size="xs"
        opened={modalOpened}
        onClose={() => {
          closeModal();
          newSubcontrollerForm.reset();
        }}
        title="Configure ESP32s"
      >
        <form
          onSubmit={newSubcontrollerForm.onSubmit(async (values) => {
            await addSubcontrollerMutation.mutateAsync({
              name: values.name,
              hostName: values.hostName,
            });
          })}
        >
          <Select
            label="Host"
            placeholder="Select Device"
            data={devices.map((device) => ({
              value: device.hostName,
              label: `${device.name} (${Array.isArray(device.address) ? device.address.join(", ") : device.address})`,
            }))}
            {...newSubcontrollerForm.getInputProps("hostName")}
          />
          <TextInput
            maxLength={64}
            label="Name"
            placeholder={devices[0]?.name || ""}
            {...newSubcontrollerForm.getInputProps("name")}
          />
        </form>
        <Group justify="center" mt="md">
          <Button
            type="submit"
            disabled={isUpdating || devices.length == 0}
            onClick={async () => {
              newSubcontrollerForm.onSubmit(async (values) => {
                setIsUpdating(true);
                await addSubcontrollerMutation.mutateAsync({
                  name: values.name,
                  hostName: values.hostName,
                });
                setIsUpdating(false);
                closeModal();
                newSubcontrollerForm.reset();
              })();
            }}
          >
            Add Device
          </Button>
        </Group>
      </Modal>
    </Fragment>
  );
}
