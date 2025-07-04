import {
  Modal,
  TextInput,
  Group,
  Button,
  Select,
  ColorInput,
  ScrollArea,
  ColorPicker,
} from "@mantine/core";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { addSensorAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import { useForm } from "@mantine/form";
import { useMutation } from "@tanstack/react-query";
import { DefaultColors } from "@sproot/sproot-common/src/utility/ChartData";
import { Fragment } from "react";
import { useRevalidator } from "react-router-dom";

interface NewSensorModalProps {
  supportedModels: Record<string, string>;
  modalOpened: boolean;
  closeModal: () => void;
  setIsStale: (isStale: boolean) => void;
}

export default function NewSensorModal({
  supportedModels,
  modalOpened,
  closeModal,
  setIsStale,
}: NewSensorModalProps) {
  const revalidator = useRevalidator();
  const addSensorMutation = useMutation({
    mutationFn: async (newSensorValues: ISensorBase) => {
      await addSensorAsync(newSensorValues);
    },
    onSettled: () => {
      revalidator.revalidate();
      setIsStale(true);
    },
  });

  const newSensorForm = useForm({
    initialValues: {
      name: "",
      color: DefaultColors[Math.floor(Math.random() * DefaultColors.length)],
      model: supportedModels[0] ?? "",
      address: "",
    },

    validate: {
      name: (value: string) =>
        !value || (value.length > 0 && value.length <= 64)
          ? null
          : "Name must be between 1 and 64 characters",
      color: (value: string | undefined) =>
        !value || (value.length > 0 && value.length <= 7)
          ? null
          : "Color must be a valid hex color",
      model: (value: string) =>
        value.length > 0 && value.length <= 64
          ? null
          : "Model must be between 1 and 64 characters",
      address: (value: string) =>
        !value || (value.length > 0 && value.length <= 64)
          ? null
          : "Address must be between 1 and 64 characters",
    },
  });

  return (
    <Fragment>
      <meta name="viewport" content="width=device-width, user-scalable=no" />
      <Modal
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        scrollAreaComponent={ScrollArea.Autosize}
        centered
        size=""
        opened={modalOpened}
        onClose={closeModal}
        title="Add New"
      >
        <form
          onSubmit={newSensorForm.onSubmit(async (values) => {
            await addSensorMutation.mutateAsync(values as ISensorBase);
            closeModal();
          })}
        >
          <TextInput
            maxLength={64}
            label="Name"
            placeholder="Thermometer #1"
            {...newSensorForm.getInputProps("name")}
          />
          <ColorInput
            readOnly
            label="Color"
            required
            // closeOnColorSwatchClick
            placeholder={newSensorForm.values.color}
            defaultValue={newSensorForm.values.color}
            // swatches={[...DefaultColors]}
            {...newSensorForm.getInputProps("color")}
          />
          <ColorPicker
            size="xs"
            fullWidth
            defaultValue={newSensorForm.values.color}
            swatches={[...DefaultColors]}
            {...newSensorForm.getInputProps("color")}
          />
          <Select
            label="Model"
            data={Object.keys(supportedModels).map((key) => {
              return { value: key, label: supportedModels[key]! };
            })}
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
            <Button type="submit">Add Sensor</Button>
          </Group>
        </form>
      </Modal>
    </Fragment>
  );
}
