import { Modal, TextInput, ScrollArea, Button, Group } from "@mantine/core";
import { Fragment, useState } from "react";
import {
  deleteSubcontrollerAsync,
  updateSubcontrollerAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import EditablesTable from "@sproot/sproot-client/src/routes/common/EditablesTable";
import { ISubcontroller } from "@sproot/sproot-common/src/system/ISubcontroller";
import { useMutation } from "@tanstack/react-query";
import { useRevalidator } from "react-router-dom";
import { SubcontrollerFormValues } from "./NewSubcontrollerModal";

interface EditTableProps {
  subcontrollers: ISubcontroller[];
  setIsStale: (isStale: boolean) => void;
}

export default function EditTable({
  subcontrollers: subcontrollers,
  setIsStale,
}: EditTableProps) {
  const revalidator = useRevalidator();
  const [selectedDevice, setSelectedDevice] = useState({} as ISubcontroller);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateSubcontrollerMutation = useMutation({
    mutationFn: async (newSubcontrollerValues: {
      id: number;
      name: string;
      hostName: string;
    }) => {
      await updateSubcontrollerAsync(newSubcontrollerValues);
    },
    onSettled: () => {
      revalidator.revalidate();
      setIsStale(true);
    },
  });

  const deleteSubcontrollerMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteSubcontrollerAsync(id);
    },
    onSettled: () => {
      revalidator.revalidate();
      setIsStale(true);
    },
  });

  const updateDeviceForm = useForm({
    initialValues: {
      id: selectedDevice.id,
      name: selectedDevice.name,
      hostName: selectedDevice.hostName,
    } as SubcontrollerFormValues,

    validate: {
      id: (value: number | undefined) =>
        value || value != selectedDevice.id
          ? null
          : "ID must match selected subcontroller",
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

  const editTableOnClick = function (device: ISubcontroller) {
    setSelectedDevice(device);
    updateDeviceForm.setFieldValue("name", device.name ?? "");
    updateDeviceForm.setFieldValue("id", device.id);
    openModal();
  };

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
          updateDeviceForm.reset();
          closeModal();
        }}
        title="Edit"
      >
        <form
          onSubmit={updateDeviceForm.onSubmit(async (values) => {
            setIsUpdating(true);
            await updateSubcontrollerMutation.mutateAsync({
              id: values.id!,
              name: values.name,
              hostName: selectedDevice.hostName,
            });
            setIsUpdating(false);
            setSelectedDevice({} as ISubcontroller);
            updateDeviceForm.reset();
            closeModal();
          })}
        >
          <TextInput
            type="hidden"
            required
            {...updateDeviceForm.getInputProps("id")}
          />
          <TextInput
            maxLength={64}
            label="Name"
            placeholder={selectedDevice.name || ""}
            {...updateDeviceForm.getInputProps("name")}
          />
          <Group justify="space-between" mt="md">
            <Button
              disabled={isUpdating}
              color="red"
              onClick={async () => {
                setIsUpdating(true);
                await deleteSubcontrollerMutation.mutateAsync(
                  selectedDevice.id,
                );
                delete subcontrollers[selectedDevice.id];
                setIsUpdating(false);
                setSelectedDevice({} as ISubcontroller);
                updateDeviceForm.reset();
                closeModal();
              }}
            >
              Delete
            </Button>
            <Button type="submit" disabled={isUpdating}>
              Update Device
            </Button>
          </Group>
        </form>
      </Modal>
      {
        <EditablesTable
          editables={subcontrollers}
          onEditClick={(item) => {
            editTableOnClick(item as ISubcontroller);
          }}
        />
      }
    </Fragment>
  );
}
