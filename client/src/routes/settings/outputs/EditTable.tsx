import {
  Modal,
  TextInput,
  NativeSelect,
  Group,
  Button,
  ColorInput,
  ColorPicker,
  ScrollArea,
  NumberInput,
} from "@mantine/core";
import { Fragment, useState } from "react";
import {
  deleteOutputAsync,
  updateOutputAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import EditablesTable from "@sproot/sproot-client/src/routes/common/EditablesTable";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import PCA9685Form from "@sproot/sproot-client/src/routes/settings/outputs/forms/PCA9685Form";
import { FormValues } from "@sproot/sproot-client/src/routes/settings/outputs/OutputSettings";
import { DefaultColors } from "@sproot/sproot-common/src/utility/ChartData";
import { useMutation } from "@tanstack/react-query";

interface EditTableProps {
  outputs: Record<string, IOutputBase>;
  supportedModels: string[];
  setIsStale: (isStale: boolean) => void;
}

export default function EditTable({
  outputs,
  supportedModels,
  setIsStale,
}: EditTableProps) {
  const [selectedOutput, setSelectedOutput] = useState({} as IOutputBase);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateOutputMutation = useMutation({
    mutationFn: async (newOutputValues: IOutputBase) => {
      await updateOutputAsync(newOutputValues);
    },
    onSettled: () => {
      setIsStale(true);
    },
  });

  const deleteOutputMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteOutputAsync(id);
    },
    onSettled: () => {
      setIsStale(true);
    },
  });

  const updateOutputForm = useForm({
    initialValues: {
      id: selectedOutput.id,
      name: selectedOutput.name,
      color: selectedOutput.color,
      model: selectedOutput.model,
      address: selectedOutput.address,
      pin: selectedOutput.pin,
      isPwm: selectedOutput.isPwm,
      isInvertedPwm: selectedOutput.isInvertedPwm,
      automationTimeout: selectedOutput.automationTimeout,
    } as FormValues,

    validate: {
      id: (value) =>
        value || value != selectedOutput.id
          ? null
          : "ID must match selected output",
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
        value != null && value != undefined && value >= 0
          ? null
          : "Pin must be a number",
      isPwm: (value) =>
        value === true || value === false ? null : "Must be true or false",
      isInvertedPwm: (value) =>
        value === true || value === false ? null : "Must be true or false",
      automationTimeout: (value) =>
        value != null && value != undefined && value >= 0 && value <= 9999999999
          ? null
          : "Must be between 0 and 99999999",
    },
  });

  const editTableOnClick = function (output: IOutputBase) {
    setSelectedOutput(output);
    updateOutputForm.setFieldValue("name", output.name ?? "");
    updateOutputForm.setFieldValue("color", output.color);
    updateOutputForm.setFieldValue("model", output.model);
    updateOutputForm.setFieldValue("address", output.address);
    updateOutputForm.setFieldValue("id", output.id);
    updateOutputForm.setFieldValue("pin", output.pin);
    updateOutputForm.setFieldValue("isPwm", output.isPwm);
    updateOutputForm.setFieldValue("isInvertedPwm", output.isInvertedPwm);
    updateOutputForm.setFieldValue(
      "automationTimeout",
      output.automationTimeout,
    );
    openModal();
  };

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
        title="Edit"
      >
        <form
          onSubmit={updateOutputForm.onSubmit(async (values) => {
            setIsUpdating(true);
            await updateOutputMutation.mutateAsync(values as IOutputBase);
            setIsUpdating(false);
            setSelectedOutput({} as IOutputBase);
            closeModal();
          })}
        >
          <TextInput
            type="hidden"
            required
            {...updateOutputForm.getInputProps("id")}
          />
          <TextInput
            maxLength={64}
            label="Name"
            placeholder={selectedOutput.name || ""}
            {...updateOutputForm.getInputProps("name")}
          />
          <ColorInput
            readOnly
            label="Color"
            required
            // closeOnColorSwatchClick
            defaultValue={selectedOutput.color}
            placeholder={selectedOutput.color}
            // swatches={[...DefaultColors]}
            {...updateOutputForm.getInputProps("color")}
          />
          <ColorPicker
            size="xs"
            fullWidth
            defaultValue={selectedOutput.color}
            swatches={[...DefaultColors]}
            {...updateOutputForm.getInputProps("color")}
          />
          {import.meta.env["VITE_PRECONFIGURED"] != "true" ? (
            <Fragment>
              <NativeSelect
                label="Model"
                data={supportedModels}
                required
                {...updateOutputForm.getInputProps("model")}
              />
              <TextInput
                maxLength={64}
                label="Address"
                placeholder={selectedOutput.address ?? ""}
                {...updateOutputForm.getInputProps("address")}
              />
              <NumberInput
                maxLength={10}
                min={0}
                max={999999999}
                step={1}
                label="Automation Timeout"
                suffix=" seconds"
                required
                {...updateOutputForm.getInputProps("automationTimeout")}
              />
              {selectedOutput.model?.toLowerCase() === "pca9685" ? (
                <PCA9685Form
                  selectedOutput={selectedOutput}
                  form={updateOutputForm}
                />
              ) : null}

              <Group justify="space-between" mt="md">
                <Button
                  disabled={isUpdating}
                  color="red"
                  onClick={async () => {
                    setIsUpdating(true);
                    await deleteOutputMutation.mutateAsync(selectedOutput.id);
                    delete outputs[selectedOutput.id];
                    setIsUpdating(false);
                    setSelectedOutput({} as IOutputBase);
                    closeModal();
                  }}
                >
                  Delete
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  Update Output
                </Button>
              </Group>
            </Fragment>
          ) : (
            <Fragment>
              {selectedOutput.model?.toLowerCase() === "pca9685" ? (
                <PCA9685Form
                  selectedOutput={selectedOutput}
                  form={updateOutputForm}
                />
              ) : null}
              <Group justify="flex-end" mt="md">
                <Button type="submit" disabled={isUpdating}>
                  Update Output
                </Button>
              </Group>
            </Fragment>
          )}
        </form>
      </Modal>
      <EditablesTable
        editables={Object.values(outputs)}
        onEditClick={(item) => {
          editTableOnClick(item as IOutputBase);
        }}
      />
    </Fragment>
  );
}
