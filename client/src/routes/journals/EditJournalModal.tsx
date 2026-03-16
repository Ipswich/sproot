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
import IconSelect from "./utils/IconListImpl";
import { SDBJournal } from "@sproot/database/SDBJournal";
import {
  updateJournalAsync,
  deleteJournalAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { IconArchive, IconInbox } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { useMutation } from "@tanstack/react-query";
import { DefaultColors } from "@sproot/sproot-common/src/utility/ChartData";

export interface EditJournalModalProps {
  modalOpened: boolean;
  closeModal: () => void;
  journal: SDBJournal;
  onSaved?: (updated: SDBJournal) => void;
  onDeleted?: (id: number) => void;
}

export default function EditJournalModal({
  modalOpened,
  closeModal,
  journal,
  onSaved,
  onDeleted,
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

  const save = async () => {
    setIsUpdating(true);
    const updated = await updateMutation.mutateAsync(
      form.values as unknown as JournalForm,
    );
    setIsUpdating(false);
    if (updated) {
      onSaved?.(updated);
      form.reset();
      closeModal();
    }
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
