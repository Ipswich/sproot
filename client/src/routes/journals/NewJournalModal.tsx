import { Fragment, useEffect } from "react";
import {
  Modal,
  TextInput,
  Group,
  Button,
  Textarea,
  ColorInput,
  ScrollArea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation } from "@tanstack/react-query";
import IconSelect from "./utils/IconListImpl";
import { addJournalAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import { SDBJournal } from "@sproot/database/SDBJournal";
import { DefaultColors } from "@sproot/sproot-common/src/utility/ChartData";

interface NewJournalModalProps {
  modalOpened: boolean;
  closeModal: () => void;
  onCreated?: (journal: SDBJournal) => void;
}

export default function NewJournalModal({ modalOpened, closeModal, onCreated }: NewJournalModalProps) {
  const addJournalMutation = useMutation({
    mutationFn: async (values: Partial<SDBJournal>) => {
      return await addJournalAsync(values);
    },
  });

  const form = useForm({
    initialValues: {
      title: "",
      description: "",
      icon: "",
      color: DefaultColors[Math.floor(Math.random() * DefaultColors.length)] ?? DefaultColors[0] ?? "#000000",
      archived: false,
    },
    validate: {
      title: (v: string) => (v && v.length > 0 && v.length <= 128 ? null : "Title is required (1-128 chars)"),
      color: (v: string) => (!v || v.length <= 7 ? null : "Invalid color"),
    },
  });

  useEffect(() => {
    if (modalOpened) {
      const rc = DefaultColors[Math.floor(Math.random() * DefaultColors.length)] ?? DefaultColors[0] ?? "#000000";
      form.setFieldValue("color", rc);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpened]);

  return (
    <Fragment>
      <meta name="viewport" content="width=device-width, user-scalable=no" />
      <Modal
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        scrollAreaComponent={ScrollArea.Autosize}
        centered
        size="xs"
        opened={modalOpened}
        onClose={() => {
          closeModal();
          form.reset();
        }}
        title="Add New"
      >
        <form
          onSubmit={form.onSubmit(async (values) => {
            const created = await addJournalMutation.mutateAsync(values);
            if (created && onCreated) onCreated(created);
            form.reset();
            closeModal();
          })}
        >
          <TextInput required label="Title" placeholder="My Journal" maxLength={128} {...form.getInputProps("title")} />
          <Textarea label="Description" placeholder="Notes about this journal" {...form.getInputProps("description")} />
          <IconSelect
            required
            label="Icon"
            placeholder="Select icon"
            iconSize={18}
            iconColor={form.values.color}
            value={form.values.icon}
            onChange={(val) => form.setFieldValue('icon', val ?? '')}
          />
          <ColorInput required label="Color" swatches={[...DefaultColors]} {...form.getInputProps("color")} />
          <Group justify="right" mt="md">
            <Button type="submit">Add Journal</Button>
          </Group>
        </form>
      </Modal>
    </Fragment>
  );
}
