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
import TagsPillsCombo from "./TagsPillsCombo";
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

export interface EditJournalEntryModalProps {
  modalOpened: boolean;
  closeModal: () => void;
  journalId: number;
  entry: SDBJournalEntry;
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
        id: entry.id,
        title: values.title ?? entry.title,
        content: values.content ?? entry.content,
      };
      return await updateJournalEntryAsync(toSend);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
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
    const newIds = vals.map((v) => Number(String(v).replace(/^tag:/, "")));
    const prevIds = localTags.map((t) => t.id);

    const added = newIds.filter((id) => !prevIds.includes(id));
    const removed = prevIds.filter((id) => !newIds.includes(id));

    added.forEach((id) => {
      if (tagRemoves.includes(id)) {
        setTagRemoves((prev) => prev.filter((x) => x !== id));
      } else {
        const existedOnServer = (tags ?? []).some((t) => t.id === id);
        if (!existedOnServer)
          setTagAdds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        const addedTag = availableTags.find((t) => t.id === id);
        if (addedTag)
          setLocalTags((prev) =>
            prev.some((p) => p.id === addedTag.id) ? prev : [...prev, addedTag],
          );
      }
    });

    removed.forEach((id) => {
      if (tagAdds.includes(id)) {
        setTagAdds((prev) => prev.filter((x) => x !== id));
      } else {
        if (!tagRemoves.includes(id)) setTagRemoves((prev) => [...prev, id]);
      }
      setLocalTags((prev) => prev.filter((t) => t.id !== id));
    });
  };

  const save = async () => {
    const updated = await updateMutation.mutateAsync(
      form.values as Partial<SDBJournalEntry>,
    );
    try {
      const addPromises = tagAdds.map((tid) =>
        addTagToJournalEntryAsync(entry.id, tid),
      );
      const removePromises = tagRemoves.map((tid) =>
        removeTagFromJournalEntryAsync(entry.id, tid),
      );
      await Promise.allSettled([...addPromises, ...removePromises]);
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
    await deleteMutation.mutateAsync();
    try {
      await queryClient.fetchQuery({
        queryKey: ["journal-entries", journalId],
        queryFn: () => getJournalEntriesAsync(journalId),
      });
    } catch (e) {
      // ignore
    }
    onDeleted?.(entry.id);
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
        <TextInput label="Title" {...form.getInputProps("title")} />

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
              placeholder="Filter by tags"
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
