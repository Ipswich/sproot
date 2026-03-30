import { useEffect, useState } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  Group,
  Button,
  Text,
  ScrollArea,
} from "@mantine/core";
import TagsPillsCombo from "../utils/tags/TagsPillsCombo";
import { SDBJournalEntry } from "@sproot/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/database/SDBJournalEntryTag";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getJournalEntryTagsAsync,
  addTagToJournalEntryAsync,
  updateJournalEntryAsync,
  deleteJournalEntryAsync,
  removeTagFromJournalEntryAsync,
  getJournalEntriesAsync,
  getJournalsAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";

import { computeTagPillDiffs } from "../utils/tags/tagPillHelpers";

export interface EditJournalEntryModalProps {
  modalOpened: boolean;
  closeModal: () => void;
  journalId: number;
  entry: Partial<SDBJournalEntry>;
  tags?: SDBJournalEntryTag[];
  onSaved?: (updated: SDBJournalEntry) => void;
  onDeleted?: (id: number) => void;
}

export default function EditJournalEntryModal({
  modalOpened,
  closeModal,
  journalId,
  entry,
  tags,
  onSaved,
  onDeleted,
}: EditJournalEntryModalProps) {
  const form = useForm({
    initialValues: {
      title: entry.title ?? "",
      content: entry.content ?? "",
    },
    validate: {
      content: (v: string) =>
        v && v.trim().length > 0 ? null : "Content is required",
    },
  });

  useEffect(() => {
    form.setValues({ title: entry.title ?? "", content: entry.content ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  const updateMutation = useMutation({
    mutationFn: async (values: Partial<SDBJournalEntry>) => {
      const toSend: Partial<SDBJournalEntry> = {
        id: entry.id!,
        title: values.title ?? entry.title!,
        content: values.content ?? entry.content!,
      };
      return await updateJournalEntryAsync(toSend);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!entry.id) throw new Error("No entry id");
      return await deleteJournalEntryAsync(entry.id);
    },
  });

  const queryClient = useQueryClient();

  const [availableTags, setAvailableTags] = useState<SDBJournalEntryTag[]>([]);
  const [localTags, setLocalTags] = useState<SDBJournalEntryTag[]>(tags ?? []);
  const [tagAdds, setTagAdds] = useState<number[]>([]);
  const [tagRemoves, setTagRemoves] = useState<number[]>([]);

  useEffect(() => {
    if (modalOpened) {
      setLocalTags(tags ?? []);
      (async () => {
        try {
          const all = await getJournalEntryTagsAsync();
          setAvailableTags(all || []);
        } catch (e) {
          // ignore
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpened]);
  const handlePillsChange = (vals: string[]) => {
    const { newLocalTags, newTagAdds, newTagRemoves } = computeTagPillDiffs(
      vals,
      localTags,
      availableTags,
      tags ?? [],
      tagAdds,
      tagRemoves,
    );
    setLocalTags(newLocalTags);
    setTagAdds(newTagAdds);
    setTagRemoves(newTagRemoves);
  };

  const save = async () => {
    const updated = await updateMutation.mutateAsync(
      form.values as Partial<SDBJournalEntry>,
    );
    try {
      const entryId = entry.id;
      if (entryId) {
        const addPromises = tagAdds.map((tid) =>
          addTagToJournalEntryAsync(entryId, tid),
        );
        const removePromises = tagRemoves.map((tid) =>
          removeTagFromJournalEntryAsync(entryId, tid),
        );
        await Promise.allSettled([...addPromises, ...removePromises]);
      }
      try {
        await queryClient.fetchQuery({
          queryKey: ["journal-entries", journalId],
          queryFn: () => getJournalEntriesAsync(journalId),
        });
      } catch (e) {
        // ignore
      }
      try {
        await queryClient.fetchQuery({
          queryKey: ["journals"],
          queryFn: () => getJournalsAsync(),
        });
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // ignore
    }

    setTagAdds([]);
    setTagRemoves([]);
    onSaved?.(updated as SDBJournalEntry);
    form.reset();
    closeModal();
  };

  const doDelete = async () => {
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    if (!entry.id) return;
    await deleteMutation.mutateAsync();
    try {
      await queryClient.fetchQuery({
        queryKey: ["journal-entries", journalId],
        queryFn: () => getJournalEntriesAsync(journalId),
      });
    } catch (e) {
      // ignore
    }
    if (entry.id) onDeleted?.(entry.id);
    form.reset();
    closeModal();
  };

  return (
    <Modal
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      scrollAreaComponent={ScrollArea.Autosize}
      centered
      size="sm"
      opened={modalOpened}
      onClose={() => {
        closeModal();
        form.reset();
      }}
      title={`Edit Entry`}
    >
      <form
        onSubmit={form.onSubmit(async () => {
          await save();
        })}
      >
        <TextInput
          label="Title"
          maxLength={64}
          {...form.getInputProps("title")}
        />

        <Textarea
          label="Content"
          autosize
          minRows={3}
          {...form.getInputProps("content")}
        />

        <div style={{ marginTop: 12 }}>
          <Text fw={600} style={{ marginBottom: 8 }}>
            Tags
          </Text>
          <div style={{ marginBottom: 8 }}>
            <TagsPillsCombo
              allTags={Array.from(
                new Map(
                  [...availableTags, ...(localTags ?? [])].map((t) => [
                    t.id,
                    t,
                  ]),
                ).values(),
              )}
              value={(localTags ?? []).map((t) => `tag:${t.id}`)}
              onChange={handlePillsChange}
              placeholder="Search tags"
            />
          </div>
        </div>

        <Group justify="space-between" mt="md">
          <Button color="red" onClick={async () => await doDelete()}>
            Delete
          </Button>
          <Button type="submit">Update Entry</Button>
        </Group>
      </form>
    </Modal>
  );
}
