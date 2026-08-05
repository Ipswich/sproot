import { Select } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ISensorBase } from "@sproot/common/sensors/ISensorBase";
import { Models } from "@sproot/common/sensors/Models";
import { useEffect } from "react";
import { getAvailableSensorDevicesAsync } from "../../../../requests/requests_v2";

interface AvailableSensorDeviceFieldsProps {
  selectedSensor?: ISensorBase;
  form: any;
}

const PIN_MODELS = new Set<string>([
  Models.ADS1115,
  Models.CAPACITIVE_MOISTURE_SENSOR,
  Models.ESP32_ADS1115,
  Models.ESP32_CAPACITIVE_MOISTURE_SENSOR,
]);

export default function AvailableSensorDeviceFields({
  selectedSensor,
  form,
}: AvailableSensorDeviceFieldsProps) {
  const filterUsed = selectedSensor === undefined;
  const getDevices = useQuery({
    queryKey: [
      "available-sensor-devices",
      form.values.model,
      form.values.subcontrollerId,
      filterUsed,
    ],
    queryFn: () =>
      getAvailableSensorDevicesAsync(
        form.values.model,
        undefined,
        filterUsed,
        form.values.subcontrollerId ?? undefined,
      ),
    enabled: Boolean(form.values.model),
  });

  const devices = getDevices.data ?? [];
  const selectedDevice =
    devices.find((device) => device.address === form.values.address) ??
    devices[0];
  const pinOptions = (selectedDevice?.pins ?? []).map((pin) => ({
    label: pin,
    value: pin,
  }));
  const showsPinSelect = PIN_MODELS.has(form.values.model);

  useEffect(() => {
    if (devices.length === 0) {
      return;
    }

    if (!selectedDevice) {
      form.setFieldValue("address", devices[0]?.address ?? null);
      form.setFieldValue("pin", devices[0]?.pins?.[0] ?? null);
      return;
    }

    if (!showsPinSelect) {
      if (form.values.pin !== null) {
        form.setFieldValue("pin", null);
      }
      return;
    }

    if (!(selectedDevice.pins ?? []).includes(form.values.pin ?? "")) {
      form.setFieldValue("pin", selectedDevice.pins?.[0] ?? null);
    }
  }, [devices, selectedDevice, showsPinSelect, form, form.values.pin]);

  return (
    <>
      <Select
        label="Address"
        data={devices.map((device) => ({
          label: device.address,
          value: device.address,
        }))}
        required
        {...form.getInputProps("address")}
        value={form.values.address}
        onChange={(value) => {
          form.setFieldValue("address", value);
          const device = devices.find(
            (candidate) => candidate.address === value,
          );
          form.setFieldValue(
            "pin",
            showsPinSelect ? (device?.pins?.[0] ?? null) : null,
          );
        }}
      />
      {showsPinSelect && (
        <Select
          label="Pin"
          data={pinOptions}
          required
          {...form.getInputProps("pin")}
          value={form.values.pin}
          onChange={(value) => form.setFieldValue("pin", value)}
        />
      )}
    </>
  );
}
