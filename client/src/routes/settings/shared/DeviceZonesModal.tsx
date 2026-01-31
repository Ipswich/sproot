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
  ScrollArea,
  Table,
  TextInput,
} from "@mantine/core";
import { IconDeviceFloppy, IconTrash, IconPlus } from "@tabler/icons-react";

interface DeviceZonesModal {
  modalOpened: boolean;
  closeModal: () => void;
}

export default function DeviceZonesModal({
  modalOpened,
  closeModal,
}: DeviceZonesModal) {
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
      scrollAreaComponent={ScrollArea.Autosize}
      centered
      size="xs"
      opened={modalOpened}
      onClose={() => {
        closeModal();
      }}
      title="Manage Device Zones"
    >
      <Table
        highlightOnHover
        style={{
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ textAlign: "center" }}>Name</Table.Th>
            <Table.Th style={{ textAlign: "center" }}>Save</Table.Th>
            <Table.Th style={{ textAlign: "center" }}>Delete</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {[...(localZones ?? [])]
            .sort((a, b) =>
              (a.name || "").localeCompare(b.name || "", undefined, {
                sensitivity: "base",
              }),
            )
            .map((zone) => (
              <Table.Tr key={zone.id}>
                <Table.Td align="center">
                  <TextInput
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
                </Table.Td>
                <Table.Td style={{ width: "10%" }} align="center">
                  <Group justify="center">
                    <ActionIcon
                      onClick={async () => {
                        const updated = localZones.find(
                          (g) => g.id === zone.id,
                        );
                        if (updated) {
                          await updateDeviceZonesMutation.mutateAsync(updated);
                          await deviceZonesQuery.refetch();
                        }
                      }}
                    >
                      <IconDeviceFloppy />
                    </ActionIcon>
                  </Group>
                </Table.Td>
                <Table.Td style={{ width: "10%" }} align="center">
                  <Group justify="center">
                    <ActionIcon
                      color="grey"
                      onClick={async () => {
                        await deleteDeviceZonesMutation.mutateAsync(zone.id);
                        await deviceZonesQuery.refetch();
                      }}
                    >
                      <IconTrash />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          <Table.Tr key={"new"}>
            <Table.Td align="center">
              <TextInput
                placeholder="New Device Zone"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.currentTarget.value)}
              />
            </Table.Td>
            <Table.Td style={{ width: "10%" }} align="center">
              <Group justify="center">
                <ActionIcon
                  color="green"
                  onClick={async () => {
                    if (!newZoneName.trim()) return;
                    await addDeviceZonesMutation.mutateAsync(
                      newZoneName.trim(),
                    );
                    setNewZoneName("");
                    await deviceZonesQuery.refetch();
                  }}
                >
                  <IconPlus />
                </ActionIcon>
              </Group>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </Modal>
  );
}
