import { Modal, TextInput, NativeSelect, Group, Button } from "@mantine/core";
import { Fragment, useState } from "react";
import { deleteOutputAsync, updateOutputAsync } from "@sproot/sproot-client/src/requests";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import EditablesTable from "@sproot/sproot-client/src/settings/common/EditablesTable";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import PCA9685Form from "@sproot/sproot-client/src/settings/outputs/forms/PCA9685Form";
import { FormValues } from "@sproot/sproot-client/src/settings/outputs/OutputSettings";

interface EditTableProps {
  outputs: Record<string, IOutputBase>;
  editDisabled: Record<string, boolean>;
  supportedModels: string[];
  setOutputs: (outputs: Record<string, IOutputBase>) => void;
  setEditDisabled: (editDisabled: Record<string, boolean>) => void;
  setIsStale: (isStale: boolean) => void;
}

export default function EditTable({
  outputs,
  editDisabled,
  supportedModels,
  setOutputs,
  setEditDisabled,
  setIsStale,
}: EditTableProps) {
  const [selectedOutput, setSelectedOutput] = useState({} as IOutputBase);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const initialState = {} as Record<string, boolean>;
  Object.keys(outputs).map((key) => (initialState[key] = false));

  const updateOutputForm = useForm({
    initialValues: {
      id: selectedOutput.id,
      name: selectedOutput.name,
      model: selectedOutput.model,
      address: selectedOutput.address,
      pin: selectedOutput.pin,
      isPwm: selectedOutput.isPwm,
      isInvertedPwm: selectedOutput.isInvertedPwm,
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
      isInvertedPwm: (value) =>
        value === true || value === false ? null : "Must be true or false",
      isPwm: (value) =>
        value === true || value === false ? null : "Must be true or false",
    },
  });

  const editTableOnClick = function (
    editDisabled: Record<string, boolean>,
    output: IOutputBase,
  ) {
    setEditDisabled({ ...editDisabled, [output.id]: false });
    setSelectedOutput(output);
    updateOutputForm.setFieldValue("name", output.name!);
    updateOutputForm.setFieldValue("model", output.model);
    updateOutputForm.setFieldValue("address", output.address ?? "");
    updateOutputForm.setFieldValue("id", output.id);
    updateOutputForm.setFieldValue("pin", output.pin);
    updateOutputForm.setFieldValue("isPwm", !!output.isPwm);
    updateOutputForm.setFieldValue("isInvertedPwm", !!output.isInvertedPwm);
    openModal();
  };

  return (
    <Fragment>
      <Modal
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        centered
        size="xs"
        opened={modalOpened}
        onClose={closeModal}
        title="Edit"
      >
        <form
          onSubmit={updateOutputForm.onSubmit(async (values) => {
            setIsUpdating(true);
            await updateOutputAsync(values as IOutputBase);
            const updatedOutputs = {
              ...outputs,
              [values.id!]: {
                ...outputs[values.id!],
                ...values,
              } as IOutputBase,
            };
            setOutputs(updatedOutputs);
            setEditDisabled({ ...editDisabled, [values.id!]: true });
            setIsUpdating(false);
            setSelectedOutput({} as IOutputBase);
            closeModal();
            setTimeout(() => setIsStale(true), 3000);
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
            placeholder={selectedOutput.name ?? ""}
            {...updateOutputForm.getInputProps("name")}
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
                    await deleteOutputAsync(selectedOutput.id);
                    delete outputs[selectedOutput.id];
                    setEditDisabled({
                      ...editDisabled,
                      [selectedOutput.id]: true,
                    });
                    setIsUpdating(false);
                    setSelectedOutput({} as IOutputBase);
                    closeModal();
                    setTimeout(() => setIsStale(true), 3000);
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
        editables={outputs}
        editDisabled={editDisabled}
        onClick={(editDisabled, item) => {
          editTableOnClick(editDisabled, item as IOutputBase);
        }}
      />
    </Fragment>
  );
}
