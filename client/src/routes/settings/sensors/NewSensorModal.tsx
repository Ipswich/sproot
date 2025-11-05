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
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import {
  addSensorAsync,
  getSubcontrollerAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { useForm } from "@mantine/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DefaultColors } from "@sproot/sproot-common/src/utility/ChartData";
import { Fragment } from "react";
import { useRevalidator } from "react-router-dom";
import { Models } from "@sproot/sproot-common/src/sensors/Models";
import { SDBSubcontroller } from "@sproot/sproot-common/src/database/SDBSubcontroller";

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
      if (newSensorValues.pin != null) {
        newSensorValues.pin = String(newSensorValues.pin);
      }

      if (
        newSensorValues.model === Models.ADS1115 ||
        newSensorValues.model === Models.CAPACITIVE_MOISTURE_SENSOR ||
        newSensorValues.model === Models.BME280 ||
        newSensorValues.model === Models.DS18B20
      ) {
        newSensorValues.subcontrollerId = null;
      }

      await addSensorAsync(newSensorValues);
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

  const newSensorForm = useForm({
    initialValues: {
      name: "",
      color: DefaultColors[Math.floor(Math.random() * DefaultColors.length)],
      subcontrollerId: subcontrollersQuery.data?.recognized?.[0]?.id,
      model: supportedModels[0] ?? "",
      address: "",
      pin: null,
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
      subcontrollerId: (value: number | undefined) => {
        console.log(value);
        if (
          newSensorForm.values.model === Models.ESP32_ADS1115 ||
          newSensorForm.values.model ===
            Models.ESP32_CAPACITIVE_MOISTURE_SENSOR ||
          newSensorForm.values.model === Models.ESP32_BME280 ||
          newSensorForm.values.model === Models.ESP32_DS18B20
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
      address: (value: string) =>
        !value || (value.length > 0 && value.length <= 64)
          ? null
          : "Address must be between 1 and 64 characters",
      pin: (value: string | null) =>
        !value || (value.length > 0 && value.length <= 64) ? null : null,
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
          {(newSensorForm.values.model === Models.ESP32_ADS1115 ||
            newSensorForm.values.model ===
              Models.ESP32_CAPACITIVE_MOISTURE_SENSOR ||
            newSensorForm.values.model === Models.ESP32_BME280 ||
            newSensorForm.values.model === Models.ESP32_DS18B20) && (
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
              {...newSensorForm.getInputProps("subcontrollerId")}
              value={
                newSensorForm.values.subcontrollerId != null
                  ? String(newSensorForm.values.subcontrollerId)
                  : null
              }
              onChange={(val) =>
                newSensorForm.setFieldValue(
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
            placeholder="0x76"
            {...newSensorForm.getInputProps("address")}
          />
          {(newSensorForm.values.model === Models.ADS1115 ||
            newSensorForm.values.model === Models.CAPACITIVE_MOISTURE_SENSOR ||
            newSensorForm.values.model === Models.ESP32_ADS1115 ||
            newSensorForm.values.model ===
              Models.ESP32_CAPACITIVE_MOISTURE_SENSOR) && (
            <NumberInput
              defaultValue={0}
              label="Pin"
              clampBehavior="strict"
              allowDecimal={false}
              min={0}
              max={3}
              {...newSensorForm.getInputProps("pin")}
            />
          )}
          <Group justify="flex-end" mt="md">
            <Button type="submit">Add Sensor</Button>
          </Group>
        </form>
      </Modal>
    </Fragment>
  );
}
