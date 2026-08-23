import {
  Modal,
  TextInput,
  Group,
  Button,
  Select,
  ColorInput,
  Paper,
  ScrollArea,
  ColorPicker,
  Stack,
  Text,
} from "@mantine/core";
import { ISensorBase } from "@sproot/common/sensors/ISensorBase";
import {
  addSensorAsync,
  getDeviceZonesAsync,
  getSubcontrollerAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { useForm } from "@mantine/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DefaultColors } from "@sproot/common/utility/Constants";
import { Fragment } from "react";
import { useRevalidator } from "react-router-dom";
import { Models } from "@sproot/common/sensors/Models";
import { SDBSubcontroller } from "@sproot/common/database/SDBSubcontroller";
import AvailableSensorDeviceFields from "./forms/AvailableSensorDeviceFields";
import { useMediaQuery } from "@mantine/hooks";

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
  const isMobile = useMediaQuery("(max-width: 48em)");
  const revalidator = useRevalidator();
  const addSensorMutation = useMutation({
    mutationFn: async (newSensorValues: ISensorBase) => {
      if (
        newSensorValues.model === Models.BME280 ||
        newSensorValues.model === Models.ESP32_BME280 ||
        newSensorValues.model === Models.DS18B20 ||
        newSensorValues.model === Models.ESP32_DS18B20
      ) {
        newSensorValues.pin = null;
      }

      // If not an ESP32 subcontroller model, clear subcontrollerId
      if (
        newSensorValues.model === Models.ADS1115 ||
        newSensorValues.model === Models.CAPACITIVE_MOISTURE_SENSOR ||
        newSensorValues.model === Models.BME280 ||
        newSensorValues.model === Models.DS18B20
      ) {
        newSensorValues.subcontrollerId = null;
      }

      if (newSensorValues.pin != null) {
        newSensorValues.pin = String(newSensorValues.pin);
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

  const groupQuery = useQuery({
    queryKey: ["device-zones"],
    queryFn: () => getDeviceZonesAsync(),
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
      deviceZoneId: null,
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
      deviceZoneId: (value: number | null) =>
        value == undefined || value > 0
          ? null
          : "Group must be a positive integer",
    },
  });

  return (
    <Fragment>
      <Modal
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        fullScreen={isMobile}
        scrollAreaComponent={ScrollArea.Autosize}
        centered
        size="lg"
        padding={isMobile ? "md" : "lg"}
        opened={modalOpened}
        onClose={() => {
          closeModal();
          newSensorForm.reset();
        }}
        title="Add Sensor"
      >
        <form
          onSubmit={newSensorForm.onSubmit(async (values) => {
            await addSensorMutation.mutateAsync(values as ISensorBase);
            closeModal();
            newSensorForm.reset();
          })}
        >
          <Stack gap="sm">
            <Paper withBorder radius="lg" p={isMobile ? "sm" : "md"}>
              <Stack gap="xs">
                <Text fw={600}>New sensor</Text>
                <Text size="sm" c="dimmed">
                  Add a sensor, choose its model and zone, then map it to an
                  available hardware target.
                </Text>
              </Stack>
            </Paper>
            <Paper withBorder radius="md" p="sm">
              <Stack gap="sm">
                <TextInput
                  maxLength={64}
                  label="Name"
                  placeholder="Thermometer #1"
                  {...newSensorForm.getInputProps("name")}
                />
                <Select
                  label="Model"
                  data={Object.keys(supportedModels).map((key) => {
                    return { value: key, label: supportedModels[key]! };
                  })}
                  allowDeselect={false}
                  placeholder="Model name"
                  required
                  {...newSensorForm.getInputProps("model")}
                />
                <Select
                  label="Zone"
                  placeholder="Default"
                  data={Object.keys(groupQuery.data ?? {}).map((key) => {
                    const group = groupQuery.data?.[parseInt(key)];
                    return {
                      value: String(group?.id) ?? "",
                      label: group?.name ?? "",
                    };
                  })}
                  searchable
                  clearable
                  allowDeselect={true}
                  {...newSensorForm.getInputProps("deviceZoneId")}
                />
                {(newSensorForm.values.model === Models.ESP32_ADS1115 ||
                  newSensorForm.values.model ===
                    Models.ESP32_CAPACITIVE_MOISTURE_SENSOR ||
                  newSensorForm.values.model === Models.ESP32_BME280 ||
                  newSensorForm.values.model === Models.ESP32_DS18B20) && (
                  <Select
                    label="Host"
                    placeholder="Select device"
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
                <AvailableSensorDeviceFields form={newSensorForm} />
              </Stack>
            </Paper>
            <Paper withBorder radius="md" p="sm">
              <Stack gap="sm">
                <Text fw={600} size="sm">
                  Appearance
                </Text>
                <ColorInput
                  readOnly
                  label="Color"
                  required
                  placeholder={newSensorForm.values.color}
                  defaultValue={newSensorForm.values.color}
                  {...newSensorForm.getInputProps("color")}
                />
                <ColorPicker
                  size="xs"
                  fullWidth
                  defaultValue={newSensorForm.values.color}
                  swatches={[...DefaultColors]}
                  {...newSensorForm.getInputProps("color")}
                />
              </Stack>
            </Paper>
            <Group justify="flex-end" mt="xs">
              <Button type="submit" fullWidth={isMobile}>
                Add Sensor
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Fragment>
  );
}
