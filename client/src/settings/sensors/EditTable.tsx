import { Modal, TextInput, NativeSelect, Group, Button } from "@mantine/core";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/SensorBase";
import { Fragment, useState } from "react";
import { deleteSensorAsync, updateSensorAsync } from "@sproot/sproot-client/src/requests";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import EditablesTable from "@sproot/sproot-client/src/settings/common/EditablesTable";

interface EditTableProps {
  sensors: Record<string, ISensorBase>;
  editDisabled: Record<string, boolean>;
  supportedModels: string[];
  setSensors: (sensors: Record<string, ISensorBase>) => void;
  setEditDisabled: (editDisabled: Record<string, boolean>) => void;
  setIsStale: (isStale: boolean) => void;
}

export default function EditTable({
  sensors,
  editDisabled,
  supportedModels,
  setSensors,
  setEditDisabled,
  setIsStale,
}: EditTableProps) {
  const [selectedSensor, setSelectedSensor] = useState({} as ISensorBase);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const initialState = {} as Record<string, boolean>;
  Object.keys(sensors).map((key) => (initialState[key] = false));

  const updateSensorForm = useForm({
    initialValues: {
      id: selectedSensor.id,
      name: selectedSensor.name,
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

  const editTableOnClick = function (
    editDisabled: Record<string, boolean>,
    sensor: ISensorBase,
  ) {
    setEditDisabled({ ...editDisabled, [sensor.id]: false });
    setSelectedSensor(sensor);
    updateSensorForm.setFieldValue("name", sensor.name);
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
            await updateSensorAsync(values as ISensorBase);
            const updatedSensors = {
              ...sensors,
              [values.id]: { ...sensors[values.id], ...values } as ISensorBase,
            };
            setSensors(updatedSensors);
            setEditDisabled({ ...editDisabled, [values.id]: true });
            setIsUpdating(false);
            setSelectedSensor({} as ISensorBase);
            closeModal();
            setTimeout(() => setIsStale(true), 3000);
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
                await deleteSensorAsync(selectedSensor.id);
                delete sensors[selectedSensor.id];
                setEditDisabled({ ...editDisabled, [selectedSensor.id]: true });
                setIsUpdating(false);
                setSelectedSensor({} as ISensorBase);
                closeModal();
                setTimeout(() => setIsStale(true), 3000);
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
        editDisabled={editDisabled}
        onClick={(editDisabled, item) => {
          editTableOnClick(editDisabled, item as ISensorBase);
        }}
      />
    </Fragment>
  );
}
