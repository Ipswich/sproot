import { Fragment, useEffect, useState } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  Group,
  Button,
  Paper,
  Text,
  ScrollArea,
  Stack,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import TagsPillsCombo from "../utils/tags/TagsPillsCombo";
import {
  getJournalEntryTagsAsync,
  addTagToJournalEntryAsync,
  addJournalEntryAsync,
  getJournalsAsync,
  getJournalEntriesAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { SDBJournalEntry } from "@sproot/database/SDBJournalEntry";
import { useMediaQuery } from "@mantine/hooks";

interface NewJournalEntryModalProps {
  modalOpened: boolean;
  closeModal: () => void;
  journalId: number;
  onCreated?: (entry: unknown) => void;
}

export default function NewJournalEntryModal({
  modalOpened,
  closeModal,
  journalId,
  onCreated,
}: NewJournalEntryModalProps) {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const mutation = useMutation({
    mutationFn: async (payload: Partial<SDBJournalEntry>) => {
      return await addJournalEntryAsync(journalId, payload);
    },
  });

  const queryClient = useQueryClient();

  const [availableTags, setAvailableTags] = useState<
    {
      id: number;
      name?: string | null;
      color?: string | null;
    }[]
  >([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const form = useForm({
    initialValues: {
      title: "",
      content: "",
    },
    validate: {
      title: (v: string) =>
        !v || v.length <= 64 ? null : "Title must be 64 characters or fewer",
      content: (v: string) =>
        v && v.trim().length > 0 ? null : "Content is required",
    },
  });

  useEffect(() => {
    if (modalOpened) {
      (async () => {
        try {
          const all = await getJournalEntryTagsAsync();
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
        size="sm"
        padding={isMobile ? "md" : "lg"}
        opened={modalOpened}
        onClose={() => {
          closeModal();
          form.reset();
          setSelectedTags([]);
        }}
        title="Add Entry"
      >
        <form
          onSubmit={form.onSubmit(async (values) => {
            const tagIds = selectedTags.map((s) =>
              Number(String(s).replace(/^tag:/, "")),
            );
            const title =
              values.title && String(values.title).trim().length > 0
                ? String(values.title).trim()
                : undefined;
            const payload: Record<string, unknown> = {
              content: values.content,
            };
            if (tagIds && tagIds.length > 0) payload["tagIds"] = tagIds;
            if (title) payload["title"] = title;
            const created = await mutation.mutateAsync(payload);
            if (created) {
              try {
                // attach tags to the created entry
                const createdObj = created as
                  Record<string, unknown> | undefined;
                const idVal = createdObj ? createdObj["id"] : undefined;
                const createdId =
                  typeof idVal === "number" ? (idVal as number) : undefined;
                if (createdId && tagIds && tagIds.length > 0) {
                  const attachPromises = tagIds.map((tid) =>
                    addTagToJournalEntryAsync(createdId, tid),
                  );
                  await Promise.allSettled(attachPromises);
                }

                // refresh journals and entries caches
                try {
                  await queryClient.fetchQuery({
                    queryKey: ["journals"],
                    queryFn: () => getJournalsAsync(),
                  });
                } catch (e) {
                  // ignore
                }
                try {
                  await queryClient.fetchQuery({
                    queryKey: ["journal-entries", journalId],
                    queryFn: () => getJournalEntriesAsync(journalId),
                  });
                } catch (e) {
                  // ignore
                }
              } catch (err) {
                // ignore
              }
            }
            onCreated?.(created);
            form.reset();
            setSelectedTags([]);
            closeModal();
          })}
        >
          <Stack gap="sm">
            <Paper withBorder radius="lg" p={isMobile ? "sm" : "md"}>
              <Stack gap="xs">
                <Text fw={600}>New entry</Text>
                <Text size="sm" c="dimmed">
                  Capture an entry quickly, then attach any tags that should
                  make it easier to find later.
                </Text>
              </Stack>
            </Paper>
            <Paper withBorder radius="md" p="sm">
              <Stack gap="sm">
                <TextInput
                  label="Title"
                  placeholder="Title"
                  maxLength={64}
                  {...form.getInputProps("title")}
                />

                <Textarea
                  required
                  label="Content"
                  placeholder="Write your entry..."
                  autosize
                  minRows={5}
                  {...form.getInputProps("content")}
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
            <Group justify="flex-end" mt="xs">
              <Button variant="light" type="submit" fullWidth={isMobile}>
                Add Entry
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Fragment>
  );
}
