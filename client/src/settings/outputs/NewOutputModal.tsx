import {
  Modal,
  TextInput,
  Group,
  Button,
  Select,
  ColorInput,
} from "@mantine/core";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { addOutputAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import { useForm } from "@mantine/form";
import PCA9685Form from "@sproot/sproot-client/src/settings/outputs/forms/PCA9685Form";
import { FormValues } from "@sproot/sproot-client/src/settings/outputs/OutputSettings";
import { useMutation } from "@tanstack/react-query";
import { DefaultColors } from "@sproot/sproot-common/src/utility/ChartData";

interface NewOutputModalProps {
  supportedModels: string[];
  modalOpened: boolean;
  closeModal: () => void;
  setIsStale: (isStale: boolean) => void;
}

export default function NewOutputModal({
  supportedModels,
  modalOpened,
  closeModal,
  setIsStale,
}: NewOutputModalProps) {
  const addOutputMutation = useMutation({
    mutationFn: async (newOutputValues: IOutputBase) => {
      await addOutputAsync(newOutputValues);
    },
    onSettled: () => {
      setIsStale(true);
    },
  });

  const newOutputForm = useForm({
    initialValues: {
      name: "",
      color: DefaultColors[Math.floor(Math.random() * DefaultColors.length)],
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
      color: (value) =>
        !value || (value.length > 0 && value.length <= 7)
          ? null
          : "Color must be a valid hex color",
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
          await addOutputMutation.mutateAsync(values as IOutputBase);
          closeModal();
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
        <ColorInput
          label="Color"
          required
          closeOnColorSwatchClick
          placeholder={newOutputForm.values.color}
          defaultValue={newOutputForm.values.color}
          swatches={[...DefaultColors]}
          {...newOutputForm.getInputProps("color")}
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
          <Button type="submit">Add Output</Button>
        </Group>
      </form>
    </Modal>
  );
}
