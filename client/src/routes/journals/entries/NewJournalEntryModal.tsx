import { Fragment, useEffect, useState } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  Group,
  Button,
  Text,
  ScrollArea,
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
        scrollAreaComponent={ScrollArea.Autosize}
        centered
        size="sm"
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
                  | Record<string, unknown>
                  | undefined;
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
          <TextInput
            label="Title"
            placeholder="Title"
            {...form.getInputProps("title")}
          />

          <Textarea
            required
            label="Content"
            placeholder="Write your entry..."
            autosize
            minRows={3}
            {...form.getInputProps("content")}
          />

          <div style={{ marginTop: 12 }}>
            <Text size="sm" style={{ marginBottom: 6 }}>
              Tags
            </Text>
            <TagsPillsCombo
              allTags={availableTags}
              value={selectedTags}
              onChange={setSelectedTags}
              placeholder="Select tags"
            />
          </div>

          <Group justify="right" mt="md">
            <Button type="submit">Add Entry</Button>
          </Group>
        </form>
      </Modal>
    </Fragment>
  );
}
