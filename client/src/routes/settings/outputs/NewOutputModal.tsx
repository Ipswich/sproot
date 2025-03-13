import {
  Modal,
  TextInput,
  Group,
  Button,
  Select,
  ColorInput,
  ScrollArea,
  ColorPicker,
  NumberInput,
} from "@mantine/core";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { addOutputAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import { useForm } from "@mantine/form";
import PCA9685Form from "@sproot/sproot-client/src/routes/settings/outputs/forms/PCA9685Form";
import { FormValues } from "@sproot/sproot-client/src/routes/settings/outputs/OutputSettings";
import { useMutation } from "@tanstack/react-query";
import { DefaultColors } from "@sproot/sproot-common/src/utility/ChartData";
import { Fragment } from "react";

import { useRevalidator } from "react-router-dom";
import TPLinkSmartPlugForm from "./forms/TPLinkSmartPlugForm";

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
  const revalidator = useRevalidator();
  const addOutputMutation = useMutation({
    mutationFn: async (newOutputValues: IOutputBase) => {
      newOutputValues.pin = String(newOutputValues.pin);
      await addOutputAsync(newOutputValues);
    },
    onSettled: () => {
      setIsStale(true);
      revalidator.revalidate();
    },
  });

  const newOutputForm = useForm({
    // Note - `mode: "uncontrolled"` prevents the form from rerendering every time a value in the form changes.
    // If and when we get around to adding other output types (besides PCA9685), we'll probably want to set this
    // and use some individual refs or states to keep track of things.
    // https://mantine.dev/form/uncontrolled/

    // mode: "uncontrolled",
    initialValues: {
      name: "",
      color: DefaultColors[Math.floor(Math.random() * DefaultColors.length)],
      model: supportedModels[0] ?? "",
      address: "",
      pin: "0",
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
      pin: (value) =>
        value != null && value != undefined ? null : "Must have a value",
      isPwm: (value) =>
        value === true || value === false ? null : "Must be true or false",
      isInvertedPwm: (value) =>
        value === true || value === false ? null : "Must be true or false",
      automationTimeout: (value) =>
        value != null && value != undefined && value >= 0 && value <= 999999999
          ? null
          : "Must be between 0 and 999999999",
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
          <ColorInput
            readOnly
            label="Color"
            required
            // closeOnColorSwatchClick
            placeholder={newOutputForm.values.color}
            defaultValue={newOutputForm.values.color}
            // swatches={[...DefaultColors]}
            {...newOutputForm.getInputProps("color")}
          />
          <ColorPicker
            size="xs"
            fullWidth
            defaultValue={newOutputForm.values.color}
            swatches={[...DefaultColors]}
            {...newOutputForm.getInputProps("color")}
          />
          <Select
            label="Model"
            data={supportedModels}
            allowDeselect={false}
            placeholder="Model Name"
            required
            {...newOutputForm.getInputProps("model")}
          />
          <NumberInput
            min={0}
            max={999999999}
            step={1}
            label="Automation Timeout"
            suffix=" seconds"
            placeholder="60 seconds"
            stepHoldDelay={500}
            stepHoldInterval={(t) => Math.max(1000 / t ** 2, 15)}
            required
            {...newOutputForm.getInputProps("automationTimeout")}
          />
          {
            newOutputForm.values.model.toLowerCase() === "pca9685" ? (
              <PCA9685Form form={newOutputForm} />
            ) : newOutputForm.values.model.toLowerCase() === "tplink-smart-plug" ? (
              <TPLinkSmartPlugForm form={newOutputForm} />
            ) : null}
          <Group justify="flex-end" mt="md">
            <Button type="submit">Add Output</Button>
          </Group>
        </form>
      </Modal>
    </Fragment>
  );
}
