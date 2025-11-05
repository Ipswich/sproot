import {
  Modal,
  TextInput,
  NativeSelect,
  Group,
  Button,
  ColorInput,
  ScrollArea,
  ColorPicker,
  NumberInput,
  Select,
} from "@mantine/core";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { Fragment, useState } from "react";
import {
  deleteSensorAsync,
  getSubcontrollerAsync,
  updateSensorAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import EditablesTable from "@sproot/sproot-client/src/routes/common/EditablesTable";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DefaultColors } from "@sproot/sproot-common/src/utility/ChartData";
import { useRevalidator } from "react-router-dom";
import { Models } from "@sproot/sproot-common/src/sensors/Models";
import { SDBSubcontroller } from "@sproot/sproot-common/src/database/SDBSubcontroller";

interface EditTableProps {
  sensors: Record<string, ISensorBase>;
  supportedModels: Record<string, string>;
  setIsStale: (isStale: boolean) => void;
}

export default function EditTable({
  sensors,
  supportedModels,
  setIsStale,
}: EditTableProps) {
  const revalidator = useRevalidator();
  const [selectedSensor, setSelectedSensor] = useState({} as ISensorBase);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateSensorMutation = useMutation({
    mutationFn: async (newSensorValues: ISensorBase) => {
      if (newSensorValues.pin != null) {
        newSensorValues.pin = String(newSensorValues.pin);
      }
      await updateSensorAsync(newSensorValues);
    },
    onSettled: () => {
      revalidator.revalidate();
      setIsStale(true);
    },
  });

  const deleteSensorMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteSensorAsync(id);
    },
    onSettled: () => {
      revalidator.revalidate();
      setIsStale(true);
    },
  });
  const subcontrollersQuery = useQuery({
    queryKey: ["get-subcontrollers"],
    queryFn: () => getSubcontrollerAsync(),
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
  });

  const updateSensorForm = useForm({
    initialValues: {
      id: selectedSensor.id,
      name: selectedSensor.name,
      color: selectedSensor.color,
      model: selectedSensor.model,
      subcontrollerId: selectedSensor.subcontrollerId ?? undefined,
      address: selectedSensor.address,
      pin: selectedSensor.pin ?? null,
    },
    validate: {
      id: (value: number) =>
        value || value != selectedSensor.id
          ? null
          : "ID must match selected sensor",
      name: (value: string) =>
        !value || (value.length > 0 && value.length <= 64)
          ? null
          : "Name must be between 1 and 64 characters",
      color: (value: string) =>
        !value || (value.length > 0 && value.length <= 7)
          ? null
          : "Color must be a valid hex color",
      model: (value: string) =>
        value.length > 0 && value.length <= 64
          ? null
          : "Model must be between 1 and 64 characters",
      subcontrollerId: (value: number | undefined) => {
        if (
          updateSensorForm.values.model === Models.ESP32_ADS1115 ||
          updateSensorForm.values.model ===
            Models.ESP32_CAPACITIVE_MOISTURE_SENSOR ||
          updateSensorForm.values.model === Models.ESP32_BME280 ||
          updateSensorForm.values.model === Models.ESP32_DS18B20
        ) {
          return subcontrollersQuery.data?.recognized.some(
            (dev) => dev.id === parseInt(String(value)),
          )
            ? null
            : "Must be a valid subcontroller";
        } else {
          return null;
        }
      },
      address: (value: string | null) =>
        !value || (value.length > 0 && value.length <= 64)
          ? null
          : "Address must be between 1 and 64 characters",
      pin: (value: string | null) =>
        !value || (value.length > 0 && value.length <= 64) ? null : null,
    },
  });

  const editTableOnClick = function (sensor: ISensorBase) {
    setSelectedSensor(sensor);
    updateSensorForm.setFieldValue("name", sensor.name);
    updateSensorForm.setFieldValue("color", sensor.color);
    updateSensorForm.setFieldValue("model", sensor.model);
    updateSensorForm.setFieldValue(
      "subcontrollerId",
      sensor.subcontrollerId ?? undefined,
    );
    updateSensorForm.setFieldValue("address", sensor.address ?? "");
    updateSensorForm.setFieldValue("id", sensor.id);
    updateSensorForm.setFieldValue("pin", sensor.pin ?? null);
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
          <ColorInput
            readOnly
            label="Color"
            required
            // closeOnColorSwatchClick
            placeholder={selectedSensor.color}
            defaultValue={selectedSensor.color}
            // swatches={[...DefaultColors]}
            {...updateSensorForm.getInputProps("color")}
          />
          <ColorPicker
            size="xs"
            fullWidth
            defaultValue={selectedSensor.color}
            swatches={[...DefaultColors]}
            {...updateSensorForm.getInputProps("color")}
          />
          <NativeSelect
            label="Model"
            data={Object.keys(supportedModels).map((key) => {
              return { value: key, label: supportedModels[key]! };
            })}
            required
            {...updateSensorForm.getInputProps("model")}
          />
          {(updateSensorForm.values.model === Models.ESP32_ADS1115 ||
            updateSensorForm.values.model ===
              Models.ESP32_CAPACITIVE_MOISTURE_SENSOR ||
            updateSensorForm.values.model === Models.ESP32_BME280 ||
            updateSensorForm.values.model === Models.ESP32_DS18B20) && (
            <Select
              label="Host"
              placeholder="Select Device"
              data={
                subcontrollersQuery.data?.recognized.map(
                  (device: SDBSubcontroller) => ({
                    value: String(device.id),
                    label: device.name,
                  }),
                ) ?? []
              }
              {...updateSensorForm.getInputProps("subcontrollerId")}
              value={
                updateSensorForm.values.subcontrollerId != null
                  ? String(updateSensorForm.values.subcontrollerId)
                  : null
              }
              onChange={(val) =>
                updateSensorForm.setFieldValue(
                  "subcontrollerId",
                  val !== null ? parseInt(val, 10) : undefined,
                )
              }
              required
            />
          )}
          <TextInput
            maxLength={64}
            label="Address"
            placeholder={selectedSensor.address ?? ""}
            {...updateSensorForm.getInputProps("address")}
          />
          {(updateSensorForm.values.model === Models.ADS1115 ||
            updateSensorForm.values.model ===
              Models.CAPACITIVE_MOISTURE_SENSOR) && (
            <NumberInput
              label="Pin"
              clampBehavior="strict"
              allowDecimal={false}
              min={0}
              max={3}
              {...updateSensorForm.getInputProps("pin")}
            />
          )}
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
        editables={Object.values(sensors)}
        onEditClick={(item) => {
          editTableOnClick(item as ISensorBase);
        }}
      />
    </Fragment>
  );
}
