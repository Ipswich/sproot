import { useEffect, useState } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  Group,
  Button,
  ColorInput,
  ActionIcon,
  Text,
  ScrollArea,
} from "@mantine/core";
import TagsPillsCombo from "./TagsPillsCombo";
import IconSelect from "./utils/IconListImpl";
import { SDBJournal } from "@sproot/database/SDBJournal";
import { SDBJournalTag } from "@sproot/database/SDBJournalTag";
import {
  updateJournalAsync,
  deleteJournalAsync,
  getJournalTagsAsync,
  getJournalsAsync,
  addTagToJournalAsync,
  removeTagFromJournalAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { IconArchive, IconInbox } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DefaultColors } from "@sproot/sproot-common/src/utility/ChartData";

export interface EditJournalModalProps {
  modalOpened: boolean;
  closeModal: () => void;
  journal: SDBJournal;
  onSaved?: (updated: SDBJournal) => void;
  onDeleted?: (id: number) => void;
  tags?: SDBJournalTag[];
}

export default function EditJournalModal({
  modalOpened,
  closeModal,
  journal,
  onSaved,
  onDeleted,
  tags,
}: EditJournalModalProps) {
  type JournalForm = {
    title: string;
    description: string;
    icon: string;
    color: string | null;
    archived: boolean;
  };

  const form = useForm<JournalForm>({
    initialValues: {
      title: journal.title ?? "",
      description: journal.description ?? "",
      icon: journal.icon ?? "NullIcon",
      color: journal.color ?? null,
      archived: !!journal.archived,
    },
    validate: {
      title: (v: string) =>
        v && v.length > 0 && v.length <= 128
          ? null
          : "Title is required (1-128 chars)",
      color: (v: string | null) =>
        !v || (typeof v === "string" && v.length <= 7) ? null : "Invalid color",
    },
  });

  useEffect(() => {
    form.setValues({
      title: journal.title ?? "",
      description: journal.description ?? "",
      icon: journal.icon ?? "NullIcon",
      color: journal.color ?? null,
      archived: !!journal.archived,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journal]);

  const updateMutation = useMutation({
    mutationFn: async (values: JournalForm) => {
      const toSend: Partial<SDBJournal> & { id: number } = {
        id: journal.id,
        title: values.title.trim(),
        description: values.description.trim(),
        icon: values.icon,
        color: values.color,
        archived: values.archived,
      };
      // API expects a full SDBJournal type for typing reasons; cast here as server accepts partial PATCH
      return await updateJournalAsync(toSend as unknown as SDBJournal);
    },
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  const [availableTags, setAvailableTags] = useState<SDBJournalTag[]>([]);
  const [localTags, setLocalTags] = useState<SDBJournalTag[]>(tags ?? []);
  const [tagAdds, setTagAdds] = useState<number[]>([]);
  const [tagRemoves, setTagRemoves] = useState<number[]>([]);

  useEffect(() => {
    if (modalOpened) {
      setLocalTags(tags ?? []);
      (async () => {
        try {
          const all = await getJournalTagsAsync();
          setAvailableTags(all || []);
        } catch (e) {
          // ignore
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpened]);

  // Stage tag add/remove operations handled by Pills combo change handler.

  // When the PillsCombo selection changes, compute diffs and stage add/removes
  const handlePillsChange = (vals: string[]) => {
    const newIds = vals.map((v) => Number(String(v).replace(/^tag:/, "")));
    const prevIds = localTags.map((t) => t.id);

    const added = newIds.filter((id) => !prevIds.includes(id));
    const removed = prevIds.filter((id) => !newIds.includes(id));

    // process additions
    added.forEach((id) => {
      // if it was staged for removal, undo that
      if (tagRemoves.includes(id)) {
        setTagRemoves((prev) => prev.filter((x) => x !== id));
      } else {
        // only stage add if it wasn't originally present on server
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

    // process removals
    removed.forEach((id) => {
      // if it was staged to be added, unstage it
      if (tagAdds.includes(id)) {
        setTagAdds((prev) => prev.filter((x) => x !== id));
      } else {
        if (!tagRemoves.includes(id)) setTagRemoves((prev) => [...prev, id]);
      }
      setLocalTags((prev) => prev.filter((t) => t.id !== id));
    });
  };

  const save = async () => {
    setIsUpdating(true);
    const updated = await updateMutation.mutateAsync(
      form.values as unknown as JournalForm,
    );
    // after journal update, apply staged tag changes
    try {
      const addPromises = tagAdds.map((tid) =>
        addTagToJournalAsync(journal.id, tid),
      );
      const removePromises = tagRemoves.map((tid) =>
        removeTagFromJournalAsync(journal.id, tid),
      );
      await Promise.allSettled([...addPromises, ...removePromises]);
      // ensure journals list is refreshed so parent and cards show latest tags
      try {
        // fetch fresh journals data and update the cache before closing/modal notify
        await queryClient.fetchQuery({
          queryKey: ["journals"],
          queryFn: () => getJournalsAsync(),
        });
      } catch (err) {
        // ignore
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Error applying tag changes", e);
    }
    setIsUpdating(false);
    // reset staged changes
    setTagAdds([]);
    setTagRemoves([]);
    // Notify parent that something changed so list can refetch tags/journals.
    // Some APIs return no body for PATCH; pass a fallback (merged journal values).
    const fallback: SDBJournal = {
      ...journal,
      title: form.values.title,
      description: form.values.description,
      icon: form.values.icon,
      color: form.values.color ?? journal.color,
      archived: form.values.archived,
    } as SDBJournal;
    onSaved?.(updated ?? fallback);
    form.reset();
    closeModal();
  };

  const doDelete = async () => {
    if (!window.confirm("Delete this journal? This cannot be undone.")) return;
    setIsUpdating(true);
    await deleteJournalAsync(journal.id);
    setIsUpdating(false);
    onDeleted?.(journal.id);
    form.reset();
    closeModal();
  };

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
        form.reset();
      }}
      title={`Edit`}
    >
      <form
        onSubmit={form.onSubmit(async () => {
          await save();
        })}
      >
        <TextInput
          required
          label="Title"
          {...form.getInputProps("title")}
          disabled={journal.archived && form.values.archived}
        />
        <Textarea
          label="Description"
          {...form.getInputProps("description")}
          minRows={3}
          disabled={journal.archived && form.values.archived}
        />
        <IconSelect
          required
          label="Icon"
          iconColor={
            form.values.color ??
            DefaultColors[Math.floor(Math.random() * DefaultColors.length)]!
          }
          value={form.values.icon}
          onChange={(v) => form.setFieldValue("icon", String(v ?? "NullIcon"))}
          disabled={journal.archived && form.values.archived}
        />
        <ColorInput
          required
          label="Color"
          swatches={[...DefaultColors]}
          {...form.getInputProps("color")}
          disabled={journal.archived && form.values.archived}
        />

        <div style={{ marginTop: 12 }}>
          <Text fw={600} style={{ marginBottom: 8 }}>
            Tags
          </Text>
          <div style={{ marginBottom: 8 }}>
            <TagsPillsCombo
              allTags={
                // ensure availableTags includes any currently selected localTags
                Array.from(
                  new Map(
                    [...availableTags, ...(localTags ?? [])].map((t) => [
                      t.id,
                      t,
                    ]),
                  ).values(),
                )
              }
              value={(localTags ?? []).map((t) => `tag:${t.id}`)}
              onChange={handlePillsChange}
              placeholder="Filter tags"
            />
          </div>
        </div>

        <Group py="md" justify="space-between" align="center">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ActionIcon
              variant={form.values.archived ? "filled" : "outline"}
              color={form.values.archived ? "gray" : "teal"}
              onClick={() =>
                form.setFieldValue("archived", !form.values.archived)
              }
              title={form.values.archived ? "Unarchive" : "Archive"}
            >
              {form.values.archived ? (
                <IconArchive size={16} />
              ) : (
                <IconInbox size={16} />
              )}
            </ActionIcon>
            <div>
              <Text fw={600}>
                {form.values.archived ? "Archived" : "Active"}
              </Text>
              <Text size="xs" color="dimmed">
                {form.values.archived
                  ? journal.archivedAt
                    ? (() => {
                        try {
                          return `Archived ${new Date(journal.archivedAt).toLocaleString()}`;
                        } catch {
                          return "Archived";
                        }
                      })()
                    : "Will be archived on save"
                  : journal.archived
                    ? "Will be unarchived on save"
                    : "Currently active"}
              </Text>
            </div>
          </div>
        </Group>
        {journal.archived && form.values.archived ? (
          <Text size="sm" color="red">
            This journal is archived — unarchive it to make changes.
          </Text>
        ) : null}

        <Group justify="space-between" mt="md">
          <Button
            disabled={isUpdating}
            color="red"
            onClick={async () => {
              await doDelete();
            }}
          >
            Delete
          </Button>
          <Button
            type="submit"
            disabled={isUpdating || (journal.archived && form.values.archived)}
          >
            Update Journal
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
