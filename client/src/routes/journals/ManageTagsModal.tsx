import { Fragment, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ActionIcon,
  Group,
  Modal,
  ColorInput,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconDeviceFloppy, IconPlus } from "@tabler/icons-react";
import { DefaultColors } from "@sproot/common/utility/Constants";
import ConfirmDeleteButton from "../../components/ConfirmDeleteButton";
import { useMediaQuery } from "@mantine/hooks";

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
  const isMobile = useMediaQuery("(max-width: 48em)");
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
    <Fragment>
      <Modal
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        fullScreen={isMobile}
        centered
        size="md"
        padding={isMobile ? "md" : "lg"}
        opened={modalOpened}
        onClose={() => {
          closeModal();
        }}
        title={title}
      >
        <ScrollArea style={{ height: isMobile ? "100%" : "70vh" }}>
          <Stack gap="md">
            <Paper withBorder radius="lg" p={isMobile ? "md" : "lg"}>
              <Stack gap="xs">
                <Text fw={600}>{title}</Text>
                <Text size="sm" c="dimmed">
                  Create, rename, recolor, and remove tags without leaving the
                  current workflow.
                </Text>
              </Stack>
            </Paper>

            <Paper withBorder radius="md" p="md">
              <Stack gap="sm">
                <Text fw={600} size="sm">
                  Add tag
                </Text>
                <TextInput
                  placeholder="New tag"
                  styles={{ input: { fontSize: 16 } }}
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.currentTarget.value)}
                />
                <Group align="flex-end" wrap="nowrap">
                  <ColorInput
                    style={{ flex: 1 }}
                    placeholder="#RRGGBB"
                    swatches={[...DefaultColors]}
                    value={newTagColor ?? ""}
                    format="hex"
                    popoverProps={{ withinPortal: true }}
                    styles={{ input: { fontSize: 16 } }}
                    onChange={(v) => setNewTagColor(v || null)}
                  />
                  <ActionIcon
                    variant="light"
                    radius="xl"
                    size="lg"
                    disabled={!newTagName.trim()}
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
                    <IconPlus size={18} />
                  </ActionIcon>
                </Group>
              </Stack>
            </Paper>

            <Stack gap="sm">
              {[...(localTags ?? [])]
                .sort((a, b) =>
                  (a.name || "").localeCompare(b.name || "", undefined, {
                    sensitivity: "base",
                  }),
                )
                .map((tag) => (
                  <Paper key={tag.id} withBorder radius="md" p="sm">
                    <Stack gap="sm">
                      <TextInput
                        required
                        value={tag.name ?? ""}
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
                      <Group
                        align="flex-end"
                        justify="space-between"
                        wrap="nowrap"
                      >
                        <ColorInput
                          required
                          style={{ flex: 1 }}
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
                        <Group gap="xs" wrap="nowrap">
                          {updateFn ? (
                            <ActionIcon
                              variant="light"
                              radius="xl"
                              size="lg"
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
                              <IconDeviceFloppy size={18} />
                            </ActionIcon>
                          ) : null}
                          <ConfirmDeleteButton
                            kind="icon"
                            loading={deleteTagMutation.isPending}
                            actionIconProps={{
                              variant: "light",
                              radius: "xl",
                              size: "lg",
                            }}
                            onConfirm={async () => {
                              await deleteTagMutation.mutateAsync(tag.id);
                              await tagsQuery.refetch();
                            }}
                          />
                        </Group>
                      </Group>
                    </Stack>
                  </Paper>
                ))}
            </Stack>
          </Stack>
        </ScrollArea>
      </Modal>
    </Fragment>
  );
}
