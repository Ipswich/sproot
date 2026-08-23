import { Fragment, useEffect, useState } from "react";
import {
  Modal,
  TextInput,
  Group,
  Button,
  Textarea,
  Text,
  ColorInput,
  Paper,
  ScrollArea,
  Stack,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import IconSelect from "./utils/IconListImpl";
import {
  addJournalAsync,
  getJournalTagsAsync,
  addTagToJournalAsync,
  getJournalsAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { SDBJournal } from "@sproot/database/SDBJournal";
import { DefaultColors } from "@sproot/common/utility/Constants";
import TagsPillsCombo from "./utils/tags/TagsPillsCombo";
import { useMediaQuery } from "@mantine/hooks";

interface NewJournalModalProps {
  modalOpened: boolean;
  closeModal: () => void;
  onCreated?: (journal: SDBJournal) => void;
}

export default function NewJournalModal({
  modalOpened,
  closeModal,
  onCreated,
}: NewJournalModalProps) {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const addJournalMutation = useMutation({
    mutationFn: async (values: Partial<SDBJournal>) => {
      return await addJournalAsync(values);
    },
  });

  const queryClient = useQueryClient();

  const [availableTags, setAvailableTags] = useState<
    { id: number; name?: string | null; color?: string | null }[]
  >([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const form = useForm({
    initialValues: {
      title: "",
      description: "",
      icon: "",
      color:
        DefaultColors[Math.floor(Math.random() * DefaultColors.length)] ??
        DefaultColors[0] ??
        "#000000",
      archived: false,
    },
    validate: {
      title: (v: string) =>
        v && v.length > 0 && v.length <= 64
          ? null
          : "Title is required (1-64 chars)",
      color: (v: string) => (!v || v.length <= 7 ? null : "Invalid color"),
    },
  });

  useEffect(() => {
    if (modalOpened) {
      const rc =
        DefaultColors[Math.floor(Math.random() * DefaultColors.length)] ??
        DefaultColors[0] ??
        "#000000";
      form.setFieldValue("color", rc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpened]);

  useEffect(() => {
    if (modalOpened) {
      (async () => {
        try {
          const all = await getJournalTagsAsync();
          setAvailableTags(all || []);
          setSelectedTags([]);
        } catch (e) {
          // ignore
        }
      })();
    }
  }, [modalOpened]);

  return (
    <Fragment>
      <Modal
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        fullScreen={isMobile}
        scrollAreaComponent={ScrollArea.Autosize}
        centered
        size="lg"
        padding={isMobile ? "md" : "lg"}
        opened={modalOpened}
        onClose={() => {
          closeModal();
          form.reset();
        }}
        title="Add Journal"
      >
        <form
          onSubmit={form.onSubmit(async (values) => {
            const created = await addJournalMutation.mutateAsync(values);
            if (created) {
              try {
                const tagIds = selectedTags.map((s) =>
                  Number(String(s).replace(/^tag:/, "")),
                );
                const addPromises = tagIds.map((tid) =>
                  addTagToJournalAsync(created.id, tid),
                );
                await Promise.allSettled(addPromises);
                // ensure journals list is fresh before notifying parent
                try {
                  await queryClient.fetchQuery({
                    queryKey: ["journals"],
                    queryFn: () => getJournalsAsync(),
                  });
                } catch (err) {
                  // ignore
                }
              } catch (e) {
                // eslint-disable-next-line no-console
                console.error("Error applying tags after creation", e);
              }
            }
            if (created && onCreated) onCreated(created);
            form.reset();
            setSelectedTags([]);
            closeModal();
          })}
        >
          <Stack gap="sm">
            <Paper withBorder radius="lg" p={isMobile ? "sm" : "md"}>
              <Stack gap="xs">
                <Text fw={600}>New journal</Text>
                <Text size="sm" c="dimmed">
                  Create a new journal with its own icon, color, and optional
                  tags for faster organization.
                </Text>
              </Stack>
            </Paper>
            <Paper withBorder radius="md" p="sm">
              <Stack gap="sm">
                <TextInput
                  required
                  label="Title"
                  placeholder="My Journal"
                  maxLength={64}
                  {...form.getInputProps("title")}
                />
                <Textarea
                  label="Description"
                  placeholder="Notes about this journal"
                  minRows={6}
                  {...form.getInputProps("description")}
                />
              </Stack>
            </Paper>
            <Paper withBorder radius="md" p="sm">
              <Stack gap="sm">
                <Text fw={600} size="sm">
                  Appearance
                </Text>
                <IconSelect
                  required
                  label="Icon"
                  placeholder="Select icon"
                  iconSize={18}
                  iconColor={form.values.color}
                  value={form.values.icon}
                  onChange={(val) => form.setFieldValue("icon", val ?? "")}
                />
                <ColorInput
                  required
                  label="Color"
                  swatches={[...DefaultColors]}
                  {...form.getInputProps("color")}
                />
              </Stack>
            </Paper>
            <Paper withBorder radius="md" p="sm">
              <Stack gap="sm">
                <Text fw={600} size="sm">
                  Tags
                </Text>
                <TagsPillsCombo
                  allTags={availableTags}
                  value={selectedTags}
                  onChange={setSelectedTags}
                  placeholder="Select tags"
                />
              </Stack>
            </Paper>
            <Group variant="light" justify="flex-end" mt="xs">
              <Button variant="light" type="submit" fullWidth={isMobile}>
                Add Journal
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Fragment>
  );
}
