import {
  Modal,
  TextInput,
  NativeSelect,
  Group,
  Button,
  ColorInput,
} from "@mantine/core";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { Fragment, useState } from "react";
import {
  deleteSensorAsync,
  updateSensorAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import EditablesTable from "@sproot/sproot-client/src/settings/common/EditablesTable";
import { useMutation } from "@tanstack/react-query";
import { DefaultColors } from "@sproot/sproot-common/src/utility/ChartData";

interface EditTableProps {
  sensors: Record<string, ISensorBase>;
  supportedModels: string[];
  setIsStale: (isStale: boolean) => void;
}

export default function EditTable({
  sensors,
  supportedModels,
  setIsStale,
}: EditTableProps) {
  const [selectedSensor, setSelectedSensor] = useState({} as ISensorBase);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateSensorMutation = useMutation({
    mutationFn: async (newSensorValues: ISensorBase) => {
      await updateSensorAsync(newSensorValues);
    },
    onSettled: () => {
      setIsStale(true);
    },
  });

  const deleteSensorMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteSensorAsync(id);
    },
    onSettled: () => {
      setIsStale(true);
    },
  });

  const updateSensorForm = useForm({
    initialValues: {
      id: selectedSensor.id,
      name: selectedSensor.name,
      color: selectedSensor.color,
      model: selectedSensor.model,
      address: selectedSensor.address,
    },
    validate: {
      id: (value) =>
        value || value != selectedSensor.id
          ? null
          : "ID must match selected sensor",
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

  const editTableOnClick = function (sensor: ISensorBase) {
    setSelectedSensor(sensor);
    updateSensorForm.setFieldValue("name", sensor.name);
    updateSensorForm.setFieldValue("color", sensor.color);
    updateSensorForm.setFieldValue("model", sensor.model);
    updateSensorForm.setFieldValue("address", sensor.address ?? "");
    updateSensorForm.setFieldValue("id", sensor.id);
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
          onSubmit={updateSensorForm.onSubmit(async (values) => {
            setIsUpdating(true);
            await updateSensorMutation.mutateAsync(values as ISensorBase);
            setIsUpdating(false);
            setSelectedSensor({} as ISensorBase);
            closeModal();
          })}
        >
          <TextInput
            type="hidden"
            required
            {...updateSensorForm.getInputProps("id")}
          />
          <TextInput
            maxLength={64}
            label="Name"
            placeholder={selectedSensor.name}
            {...updateSensorForm.getInputProps("name")}
          />
          <NativeSelect
            label="Model"
            data={supportedModels}
            required
            {...updateSensorForm.getInputProps("model")}
          />
          <ColorInput
            label="Color"
            required
            closeOnColorSwatchClick
            placeholder={updateSensorForm.values.color}
            defaultValue={updateSensorForm.values.color}
            swatches={[...DefaultColors]}
            {...updateSensorForm.getInputProps("color")}
          />
          <TextInput
            maxLength={64}
            label="Address"
            placeholder={selectedSensor.address ?? ""}
            {...updateSensorForm.getInputProps("address")}
          />
          <Group justify="space-between" mt="md">
            <Button
              disabled={isUpdating}
              color="red"
              onClick={async () => {
                setIsUpdating(true);
                await deleteSensorMutation.mutateAsync(selectedSensor.id);
                delete sensors[selectedSensor.id];
                setIsUpdating(false);
                setSelectedSensor({} as ISensorBase);
                closeModal();
              }}
            >
              Delete
            </Button>
            <Button type="submit" disabled={isUpdating}>
              Update Sensor
            </Button>
          </Group>
        </form>
      </Modal>
      <EditablesTable
        editables={sensors}
        onClick={(item) => {
          editTableOnClick(item as ISensorBase);
        }}
      />
    </Fragment>
  );
}
