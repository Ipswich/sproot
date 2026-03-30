import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ActionIcon,
  Group,
  Modal,
  ScrollArea,
  Table,
  TextInput,
  ColorInput,
} from "@mantine/core";
import { IconDeviceFloppy, IconTrash, IconPlus } from "@tabler/icons-react";
import { DefaultColors } from "@sproot/sproot-common/src/utility/ChartData";

type TagLike = { id: number; name?: string | null; color?: string | null };

interface ManageTagsModalProps<T extends TagLike> {
  modalOpened: boolean;
  closeModal: () => void;
  title?: string;
  queryKey: string[];
  fetchFn: () => Promise<T[]>;
  addFn: (name: string, color?: string | null) => Promise<T | undefined>;
  updateFn?: (tag: T) => Promise<T | undefined>;
  deleteFn: (id: number) => Promise<void>;
}

export default function ManageTagsModal<T extends TagLike>({
  modalOpened,
  closeModal,
  title = "Manage Tags",
  queryKey,
  fetchFn,
  addFn,
  updateFn,
  deleteFn,
}: ManageTagsModalProps<T>) {
  const tagsQuery = useQuery({
    queryKey,
    queryFn: fetchFn,
    refetchInterval: 60000,
    enabled: modalOpened,
  });

  const addTagMutation = useMutation({
    mutationFn: async (params: { name: string; color?: string | null }) => {
      return await addFn(params.name, params.color ?? null);
    },
    onSettled: () => tagsQuery.refetch(),
  });

  const updateTagMutation = useMutation({
    mutationFn: async (tag: T) => {
      if (!updateFn) return;
      return await updateFn(tag);
    },
    onSettled: () => tagsQuery.refetch(),
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: number) => {
      return await deleteFn(id);
    },
    onSettled: () => tagsQuery.refetch(),
  });

  const [localTags, setLocalTags] = useState<T[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const initialRandomColor =
    DefaultColors[Math.floor(Math.random() * DefaultColors.length)] ??
    DefaultColors[0] ??
    "#000000";
  const [newTagColor, setNewTagColor] = useState<string | null>(
    initialRandomColor,
  );

  useEffect(() => {
    if (modalOpened) {
      const rc =
        DefaultColors[Math.floor(Math.random() * DefaultColors.length)] ??
        DefaultColors[0] ??
        "#000000";
      setNewTagColor(rc);
      setNewTagName("");
    }
  }, [modalOpened]);

  useEffect(() => {
    setLocalTags(((tagsQuery.data ?? []) as T[]).map((t) => ({ ...t })));
  }, [tagsQuery.data]);

  return (
    <Modal
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      centered
      size="xs"
      opened={modalOpened}
      onClose={() => {
        closeModal();
      }}
      title={title}
    >
      <ScrollArea
        style={{ height: "50vh" }}
        viewportProps={{ style: { maxHeight: "50vh" } }}
      >
        <Table
          highlightOnHover
          style={{ marginLeft: "auto", marginRight: "auto" }}
        >
          <Table.Thead
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              background: "white",
            }}
          >
            <Table.Tr>
              <Table.Th style={{ textAlign: "center" }}>Name & Color</Table.Th>
              {updateFn ? (
                <Table.Th style={{ textAlign: "center", width: "10%" }}>
                  Save
                </Table.Th>
              ) : null}
              <Table.Th style={{ textAlign: "center", width: "10%" }}>
                Delete
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {[...(localTags ?? [])]
              .sort((a, b) =>
                (a.name || "").localeCompare(b.name || "", undefined, {
                  sensitivity: "base",
                }),
              )
              .map((tag) => (
                <Table.Tr key={tag.id}>
                  <Table.Td align="center">
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <TextInput
                        required
                        value={tag.name ?? ""}
                        style={{ width: "100%" }}
                        styles={{ input: { fontSize: 16 } }}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setLocalTags((prev) =>
                            prev.map((g) =>
                              g.id === tag.id ? { ...g, name: value } : g,
                            ),
                          );
                        }}
                      />
                      <ColorInput
                        required
                        swatches={[...DefaultColors]}
                        value={tag.color ?? ""}
                        format="hex"
                        popoverProps={{ withinPortal: true }}
                        styles={{ input: { fontSize: 16 } }}
                        onChange={(value) => {
                          const color = value || null;
                          setLocalTags((prev) =>
                            prev.map((g) =>
                              g.id === tag.id ? { ...g, color } : g,
                            ),
                          );
                        }}
                      />
                    </div>
                  </Table.Td>
                  {updateFn ? (
                    <Table.Td style={{ width: "10%" }} align="center">
                      <Group justify="center">
                        <ActionIcon
                          onClick={async () => {
                            const updated = localTags.find(
                              (g) => g.id === tag.id,
                            );
                            if (updated) {
                              await updateTagMutation.mutateAsync(updated);
                              await tagsQuery.refetch();
                            }
                          }}
                        >
                          <IconDeviceFloppy />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  ) : null}
                  <Table.Td style={{ width: "10%" }} align="center">
                    <Group justify="center">
                      <ActionIcon
                        color="grey"
                        onClick={async () => {
                          await deleteTagMutation.mutateAsync(tag.id);
                          await tagsQuery.refetch();
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
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <TextInput
                    placeholder="New Tag"
                    style={{ width: "100%" }}
                    styles={{ input: { fontSize: 16 } }}
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.currentTarget.value)}
                  />
                  <ColorInput
                    placeholder="#RRGGBB"
                    swatches={[...DefaultColors]}
                    value={newTagColor ?? ""}
                    format="hex"
                    popoverProps={{ withinPortal: true }}
                    styles={{ input: { fontSize: 16 } }}
                    onChange={(v) => setNewTagColor(v || null)}
                  />
                </div>
              </Table.Td>
              {updateFn ? (
                <Table.Td style={{ width: "10%" }} align="center">
                  <Group justify="center">
                    <ActionIcon
                      color="green"
                      onClick={async () => {
                        if (!newTagName.trim()) return;
                        await addTagMutation.mutateAsync({
                          name: newTagName.trim(),
                          color: newTagColor,
                        });
                        setNewTagName("");
                        setNewTagColor(
                          DefaultColors[
                            Math.floor(Math.random() * DefaultColors.length)
                          ] ??
                            DefaultColors[0] ??
                            "#000000",
                        );
                        await tagsQuery.refetch();
                      }}
                    >
                      <IconPlus />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              ) : (
                <Table.Td style={{ width: "10%" }} align="center">
                  <Group justify="center">
                    <ActionIcon
                      color="green"
                      onClick={async () => {
                        if (!newTagName.trim()) return;
                        await addTagMutation.mutateAsync({
                          name: newTagName.trim(),
                          color: newTagColor,
                        });
                        setNewTagName("");
                        setNewTagColor(
                          DefaultColors[
                            Math.floor(Math.random() * DefaultColors.length)
                          ] ??
                            DefaultColors[0] ??
                            "#000000",
                        );
                        await tagsQuery.refetch();
                      }}
                    >
                      <IconPlus />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              )}
              <Table.Td style={{ width: "10%" }} align="center">
                {/* empty cell to align with Delete column */}
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Modal>
  );
}
