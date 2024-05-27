import { Modal, TextInput, Group, Button, Select } from "@mantine/core";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { addOutputAsync } from "@sproot/sproot-client/src/requests";
import { useForm } from "@mantine/form";
import { useState } from "react";
import PCA9685Form from "@sproot/sproot-client/src/settings/outputs/forms/PCA9685Form";
import { FormValues } from "@sproot/sproot-client/src/settings/outputs/OutputSettings";

interface NewOutputModalProps {
  outputs: Record<string, IOutputBase>;
  editDisabled: Record<string, boolean>;
  supportedModels: string[];
  modalOpened: boolean;
  closeModal: () => void;
  setOutputs: (outputs: Record<string, IOutputBase>) => void;
  setEditDisabled: (editDisabled: Record<string, boolean>) => void;
  setIsStale: (isStale: boolean) => void;
}

export default function NewOutputModal({
  outputs,
  editDisabled,
  supportedModels,
  modalOpened,
  closeModal,
  setOutputs,
  setEditDisabled,
  setIsStale,
}: NewOutputModalProps) {
  const [addingOutput, setIsAdding] = useState(false);
  const newOutputForm = useForm({
    initialValues: {
      name: "",
      model: supportedModels[0] ?? "",
      address: "",
      pin: 0,
      isPwm: false,
      isInvertedPwm: false,
    } as FormValues,

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
      size="xs"
      opened={modalOpened}
      onClose={closeModal}
      title="Add New"
    >
      <form
        onSubmit={newOutputForm.onSubmit(async (values) => {
          setIsAdding(true);
          const uuid = String(Date.now());

          setOutputs({
            ...outputs,
            [String(uuid)]: {
              ...outputs[uuid],
              ...values,
              id: Number(uuid),
            } as IOutputBase,
          });
          setEditDisabled({ ...editDisabled, [uuid]: true });
          await addOutputAsync(values as IOutputBase);
          setIsAdding(false);
          closeModal();

          setTimeout(() => setIsStale(true), 3000);
        })}
      >
        <TextInput
          maxLength={64}
          label="Name"
          placeholder="Output #1"
          {...newOutputForm.getInputProps("name")}
        />
        <Select
          label="Model"
          data={supportedModels}
          allowDeselect={false}
          placeholder="Model Name"
          required
          {...newOutputForm.getInputProps("model")}
        />
        <TextInput
          maxLength={64}
          label="Address"
          placeholder="0x40"
          {...newOutputForm.getInputProps("address")}
        />
        {newOutputForm.values.model.toLowerCase() === "pca9685" ? (
          <PCA9685Form form={newOutputForm} />
        ) : null}
        <Group justify="flex-end" mt="md">
          <Button type="submit" disabled={addingOutput}>
            Add Output
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
