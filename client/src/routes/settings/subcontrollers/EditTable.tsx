import {
  Button,
  Modal,
  TextInput,
  ScrollArea,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { Fragment, useState } from "react";
import {
  deleteSubcontrollerAsync,
  updateSubcontrollerAsync,
  getSubcontrollerConnectionStatusAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import EditablesTable from "@sproot/sproot-client/src/routes/common/EditablesTable";
import { ISubcontroller } from "@sproot/common/system/ISubcontroller";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRevalidator } from "react-router-dom";
import { SubcontrollerFormValues } from "./NewSubcontrollerModal";
import {
  IconAntennaBars5,
  IconAntennaBarsOff,
  IconLoader,
} from "@tabler/icons-react";
import UpdateFirmwareContainer from "./UpdateFirmwareContainer";
import ConfirmDeleteButton from "../../../components/ConfirmDeleteButton";
import { useMediaQuery } from "@mantine/hooks";

interface EditTableProps {
  subcontrollers: ISubcontroller[];
  setIsStale: (isStale: boolean) => void;
  sortBy?: "name" | "id";
  sortDir?: "asc" | "desc";
}

function SubcontrollerConnectionIndicator({
  deviceId,
}: {
  deviceId: number | undefined;
}) {
  const connectionStatusQuery = useQuery<{
    online: boolean;
    version?: string;
  }>({
    queryKey: ["subcontroller-connection-status", deviceId],
    queryFn: async () => {
      if (typeof deviceId === "undefined" || deviceId === null) {
        return { online: false };
      }
      return await getSubcontrollerConnectionStatusAsync(deviceId);
    },
  });

  const isConnected =
    connectionStatusQuery.data?.online === true &&
    !connectionStatusQuery.isError;

  if (connectionStatusQuery.isLoading) {
    return (
      <IconLoader
        size="28px"
        className="animate-spin"
        color="var(--mantine-color-gray-filled)"
      />
    );
  }

  return isConnected ? (
    <IconAntennaBars5 size="28px" color="var(--mantine-color-green-filled)" />
  ) : (
    <IconAntennaBarsOff size="28px" color="var(--mantine-color-red-filled)" />
  );
}

export default function EditTable({
  subcontrollers: subcontrollers,
  setIsStale,
  sortBy,
  sortDir,
}: EditTableProps) {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const revalidator = useRevalidator();
  const [selectedDevice, setSelectedDevice] = useState({} as ISubcontroller);
  const [shouldResetAfterClose, setShouldResetAfterClose] = useState(false);
  const [
    newSubcontrollerModalOpened,
    { open: newSubcontrollerOpenModal, close: newSubcontrollerCloseModal },
  ] = useDisclosure(false);
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
    setShouldResetAfterClose(false);
    setSelectedDevice(device);
    updateDeviceForm.setFieldValue("name", device.name ?? "");
    updateDeviceForm.setFieldValue("id", device.id);
    newSubcontrollerOpenModal();
  };

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
        opened={newSubcontrollerModalOpened}
        onExitTransitionEnd={() => {
          if (!shouldResetAfterClose) return;
          setSelectedDevice({} as ISubcontroller);
          updateDeviceForm.reset();
          setShouldResetAfterClose(false);
        }}
        onClose={() => {
          setShouldResetAfterClose(true);
          newSubcontrollerCloseModal();
        }}
        title="Edit Subcontroller"
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
            setShouldResetAfterClose(true);
            newSubcontrollerCloseModal();
          })}
        >
          <TextInput
            type="hidden"
            required
            {...updateDeviceForm.getInputProps("id")}
          />
          <Stack gap="md">
            <Paper withBorder radius="lg" p={isMobile ? "md" : "lg"}>
              <Stack gap="xs">
                <Text fw={600}>
                  {selectedDevice.name ?? "Subcontroller details"}
                </Text>
                <Text size="sm" c="dimmed">
                  Rename this device and manage firmware updates from the same
                  place.
                </Text>
              </Stack>
            </Paper>
            <Paper withBorder radius="md" p="md">
              <Stack gap="md">
                <TextInput
                  maxLength={64}
                  label="Name"
                  placeholder={selectedDevice.name || ""}
                  {...updateDeviceForm.getInputProps("name")}
                />
              </Stack>
            </Paper>

            <UpdateFirmwareContainer id={selectedDevice.id} />

            <Group justify="space-between" mt="xs" wrap="wrap">
              <ConfirmDeleteButton
                disabled={isUpdating}
                buttonProps={{ variant: "light", fullWidth: isMobile }}
                onConfirm={async () => {
                  setIsUpdating(true);
                  await deleteSubcontrollerMutation.mutateAsync(
                    selectedDevice.id,
                  );
                  delete subcontrollers[selectedDevice.id];
                  setIsUpdating(false);
                  setShouldResetAfterClose(true);
                  newSubcontrollerCloseModal();
                }}
              />
              <Button type="submit" disabled={isUpdating} fullWidth={isMobile}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      {
        <Fragment>
          <EditablesTable
            editables={subcontrollers}
            onEditClick={(item) => {
              editTableOnClick(item as ISubcontroller);
            }}
            sortBy={sortBy}
            sortDir={sortDir}
            showSortControl={false}
            tableLeftComponent={{
              label: "",
              Component: (editable: unknown) => {
                const device = editable as ISubcontroller;
                return (
                  <SubcontrollerConnectionIndicator deviceId={device.id} />
                );
              },
            }}
          />
        </Fragment>
      }
    </Fragment>
  );
}
