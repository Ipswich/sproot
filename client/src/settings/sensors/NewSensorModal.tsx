import { Modal, TextInput, Group, Button, Select } from "@mantine/core";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { addSensorAsync } from "@sproot/sproot-client/src/requests";
import { useForm } from "@mantine/form";
import { useState } from "react";

interface NewSensorModalProps {
  sensors: Record<string, ISensorBase>;
  editDisabled: Record<string, boolean>;
  supportedModels: string[];
  modalOpened: boolean;
  closeModal: () => void;
  setSensors: (sensors: Record<string, ISensorBase>) => void;
  setEditDisabled: (editDisabled: Record<string, boolean>) => void;
  setIsStale: (isStale: boolean) => void;
}

export default function NewSensorModal({
  sensors,
  editDisabled,
  supportedModels,
  modalOpened,
  closeModal,
  setSensors,
  setEditDisabled,
  setIsStale,
}: NewSensorModalProps) {
  const [addingSensor, setIsAdding] = useState(false);

  const newSensorForm = useForm({
    initialValues: {
      name: "",
      model: supportedModels[0] ?? "",
      address: "",
    },

    validate: {
      name: (value) =>
        !value || (value.length > 0 && value.length <= 64)
          ? null
          : "Name must be between 1 and 64 characters",
      model: (value) =>
        value.length > 0 && value.length <= 64
          ? null
          : "Model must be between 1 and 64 characters",
      address: (value) =>
        !value || (value.length > 0 && value.length <= 64)
          ? null
          : "Address must be between 1 and 64 characters",
    },
  });

  return (
    <Modal
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
      centered
      size=""
      opened={modalOpened}
      onClose={closeModal}
      title="Add New"
    >
      <form
        onSubmit={newSensorForm.onSubmit(async (values) => {
          setIsAdding(true);
          const uuid = String(Date.now());

          setSensors({
            ...sensors,
            [String(uuid)]: {
              ...sensors[uuid],
              ...values,
              id: Number(uuid),
            } as ISensorBase,
          });
          setEditDisabled({ ...editDisabled, [uuid]: true });
          await addSensorAsync(values as ISensorBase);
          setIsAdding(false);
          closeModal();

          setTimeout(() => setIsStale(true), 3000);
        })}
      >
        <TextInput
          maxLength={64}
          label="Name"
          placeholder="Thermometer #1"
          {...newSensorForm.getInputProps("name")}
        />
        <Select
          label="Model"
          data={supportedModels}
          allowDeselect={false}
          placeholder="Model Name"
          required
          {...newSensorForm.getInputProps("model")}
        />
        <TextInput
          maxLength={64}
          label="Address"
          placeholder="0x76"
          {...newSensorForm.getInputProps("address")}
        />
        <Group justify="flex-end" mt="md">
          <Button type="submit" disabled={addingSensor}>
            Add Sensor
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
