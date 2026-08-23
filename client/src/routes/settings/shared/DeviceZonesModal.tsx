import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  addDeviceZoneAsync,
  deleteDeviceZoneAsync,
  getDeviceZonesAsync,
  updateDeviceZoneAsync,
} from "../../../requests/requests_v2";
import { SDBDeviceZone } from "@sproot/database/SDBDeviceZone";
import {
  ActionIcon,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconDeviceFloppy, IconPlus } from "@tabler/icons-react";
import ConfirmDeleteButton from "../../../components/ConfirmDeleteButton";
import { useMediaQuery } from "@mantine/hooks";

interface DeviceZonesModal {
  modalOpened: boolean;
  closeModal: () => void;
}

export default function DeviceZonesModal({
  modalOpened,
  closeModal,
}: DeviceZonesModal) {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const deviceZonesQuery = useQuery({
    queryKey: ["device-zones"],
    queryFn: () => getDeviceZonesAsync(),
    refetchInterval: 60000,
  });

  const addDeviceZonesMutation = useMutation({
    mutationFn: async (newZoneName: string) => {
      await addDeviceZoneAsync(newZoneName);
    },
    onSettled: () => {
      deviceZonesQuery.refetch();
    },
  });

  const updateDeviceZonesMutation = useMutation({
    mutationFn: async (zone: SDBDeviceZone) => {
      await updateDeviceZoneAsync(zone);
    },
    onSettled: () => {
      deviceZonesQuery.refetch();
    },
  });

  const deleteDeviceZonesMutation = useMutation({
    mutationFn: async (zoneId: number) => {
      await deleteDeviceZoneAsync(zoneId);
    },
    onSettled: () => {
      deviceZonesQuery.refetch();
    },
  });

  const [localZones, setLocalZones] = useState<SDBDeviceZone[]>([]);
  const [newZoneName, setNewZoneName] = useState<string>("");

  useEffect(() => {
    setLocalZones((deviceZonesQuery.data ?? []).map((g) => ({ ...g })));
  }, [deviceZonesQuery.data]);
  return (
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
      }}
      title="Manage Device Zones"
    >
      <Stack gap="md">
        <Paper withBorder radius="lg" p={isMobile ? "md" : "lg"}>
          <Stack gap="xs">
            <Text fw={600}>Device zones</Text>
            <Text size="sm" c="dimmed">
              Organize sensors and outputs into location-based groups for
              cleaner filtering and layout.
            </Text>
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <Text fw={600} size="sm">
              Add zone
            </Text>
            <Group align="flex-end" wrap="nowrap">
              <TextInput
                style={{ flex: 1 }}
                placeholder="Example: Seedling Shelf"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.currentTarget.value)}
              />
              <ActionIcon
                variant="light"
                radius="xl"
                size="lg"
                disabled={!newZoneName.trim()}
                onClick={async () => {
                  if (!newZoneName.trim()) return;
                  await addDeviceZonesMutation.mutateAsync(newZoneName.trim());
                  setNewZoneName("");
                  await deviceZonesQuery.refetch();
                }}
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Group>
          </Stack>
        </Paper>

        <ScrollArea style={{ maxHeight: isMobile ? undefined : 420 }}>
          <Stack gap="sm">
            {[...(localZones ?? [])]
              .sort((a, b) =>
                (a.name || "").localeCompare(b.name || "", undefined, {
                  sensitivity: "base",
                }),
              )
              .map((zone) => (
                <Paper key={zone.id} withBorder radius="md" p="sm">
                  <Group align="flex-end" wrap="nowrap">
                    <TextInput
                      style={{ flex: 1 }}
                      value={zone.name ?? ""}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setLocalZones((prev) =>
                          prev.map((g) =>
                            g.id === zone.id ? { ...g, name: value } : g,
                          ),
                        );
                      }}
                    />
                    <Group gap="xs" wrap="nowrap">
                      <ActionIcon
                        variant="light"
                        radius="xl"
                        size="lg"
                        onClick={async () => {
                          const updated = localZones.find(
                            (g) => g.id === zone.id,
                          );
                          if (updated) {
                            await updateDeviceZonesMutation.mutateAsync(
                              updated,
                            );
                            await deviceZonesQuery.refetch();
                          }
                        }}
                      >
                        <IconDeviceFloppy size={18} />
                      </ActionIcon>
                      <ConfirmDeleteButton
                        kind="icon"
                        loading={deleteDeviceZonesMutation.isPending}
                        actionIconProps={{
                          variant: "light",
                          radius: "xl",
                          size: "lg",
                        }}
                        onConfirm={async () => {
                          await deleteDeviceZonesMutation.mutateAsync(zone.id);
                          await deviceZonesQuery.refetch();
                        }}
                      />
                    </Group>
                  </Group>
                </Paper>
              ))}
          </Stack>
        </ScrollArea>
      </Stack>
    </Modal>
  );
}
