import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  addDeviceGroupAsync,
  deleteDeviceGroupAsync,
  getDeviceGroupsAsync,
  updateDeviceGroupAsync,
} from "../../../requests/requests_v2";
import { SDBDeviceGroup } from "@sproot/database/SDBDeviceGroup";
import {
  ActionIcon,
  Group,
  Modal,
  ScrollArea,
  Table,
  TextInput,
} from "@mantine/core";
import { IconDeviceFloppy, IconTrash, IconPlus } from "@tabler/icons-react";

interface DeviceGroupsModal {
  modalOpened: boolean;
  closeModal: () => void;
}

export default function DeviceGroupsModal({
  modalOpened,
  closeModal,
}: DeviceGroupsModal) {
  const deviceGroupsQuery = useQuery({
    queryKey: ["device-groups"],
    queryFn: () => getDeviceGroupsAsync(),
    refetchInterval: 60000,
  });

  const addDeviceGroupsMutation = useMutation({
    mutationFn: async (newGroupName: string) => {
      await addDeviceGroupAsync(newGroupName);
    },
    onSettled: () => {
      deviceGroupsQuery.refetch();
    },
  });

  const updateDeviceGroupsMutation = useMutation({
    mutationFn: async (group: SDBDeviceGroup) => {
      await updateDeviceGroupAsync(group);
    },
    onSettled: () => {
      deviceGroupsQuery.refetch();
    },
  });

  const deleteDeviceGroupsMutation = useMutation({
    mutationFn: async (groupId: number) => {
      await deleteDeviceGroupAsync(groupId);
    },
    onSettled: () => {
      deviceGroupsQuery.refetch();
    },
  });

  const [localGroups, setLocalGroups] = useState<SDBDeviceGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState<string>("");

  useEffect(() => {
    setLocalGroups((deviceGroupsQuery.data ?? []).map((g) => ({ ...g })));
  }, [deviceGroupsQuery.data]);

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
      title="Manage Device Groups"
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
          {[...(localGroups ?? [])]
            .sort((a, b) =>
              (a.name || "").localeCompare(b.name || "", undefined, {
                sensitivity: "base",
              }),
            )
            .map((group) => (
              <Table.Tr key={group.id}>
                <Table.Td align="center">
                  <TextInput
                    value={group.name ?? ""}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setLocalGroups((prev) =>
                        prev.map((g) =>
                          g.id === group.id ? { ...g, name: value } : g,
                        ),
                      );
                    }}
                  />
                </Table.Td>
                <Table.Td style={{ width: "10%" }} align="center">
                  <Group justify="center">
                    <ActionIcon
                      onClick={async () => {
                        const updated = localGroups.find(
                          (g) => g.id === group.id,
                        );
                        if (updated) {
                          await updateDeviceGroupsMutation.mutateAsync(updated);
                          await deviceGroupsQuery.refetch();
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
                        await deleteDeviceGroupsMutation.mutateAsync(group.id);
                        await deviceGroupsQuery.refetch();
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
                placeholder="New Device Group"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.currentTarget.value)}
              />
            </Table.Td>
            <Table.Td style={{ width: "10%" }} align="center">
              <Group justify="center">
                <ActionIcon
                  color="green"
                  onClick={async () => {
                    if (!newGroupName.trim()) return;
                    await addDeviceGroupsMutation.mutateAsync(
                      newGroupName.trim(),
                    );
                    setNewGroupName("");
                    await deviceGroupsQuery.refetch();
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
