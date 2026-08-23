import { Select, Stack, Switch } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { IOutputBase } from "@sproot/common/outputs/IOutputBase";
import { Fragment, useEffect, useState } from "react";
import { OutputFormValues } from "../OutputSettings";
import { useQuery } from "@tanstack/react-query";
import { getAvailableDevicesAsync } from "../../../../requests/requests_v2";

interface PCA9685FormProps {
  selectedOutput?: IOutputBase;
  form: UseFormReturnType<OutputFormValues>;
}

export default function PCA9685Form({
  selectedOutput,
  form,
}: PCA9685FormProps) {
  const [isPwm, setIsPwm] = useState(selectedOutput?.isPwm ?? false);
  const filterUsed = selectedOutput === undefined;
  const getDevices = useQuery({
    queryKey: ["pca9685-output-devices", filterUsed],
    queryFn: () => getAvailableDevicesAsync("PCA9685", undefined, filterUsed),
  });
  const devices = getDevices.data ?? [];
  const selectedDevice =
    devices.find((device) => device.address === form.values.address) ??
    devices[0];
  const pinOptions = (selectedDevice?.pins ?? []).map((pin) => ({
    label: pin,
    value: pin,
  }));

  useEffect(() => {
    if (devices.length === 0) {
      return;
    }

    if (!selectedDevice) {
      form.setFieldValue("address", devices[0]?.address ?? "");
      form.setFieldValue("pin", devices[0]?.pins?.[0] ?? "");
      return;
    }

    if (!(selectedDevice.pins ?? []).includes(form.values.pin)) {
      form.setFieldValue("pin", selectedDevice.pins?.[0] ?? "");
    }
  }, [devices, selectedDevice, form, form.values.pin]);

  return (
    <Fragment>
      <Select
        label="Address"
        data={devices.map((device) => ({
          label: device.address,
          value: device.address,
        }))}
        required
        {...form.getInputProps("address")}
        value={form.values.address || null}
        onChange={(value) => {
          form.setFieldValue("address", value ?? "");
          const device = devices.find(
            (candidate) => candidate.address === value,
          );
          form.setFieldValue("pin", device?.pins?.[0] ?? "");
        }}
      />
      <Select
        required
        label="Pin"
        data={pinOptions}
        {...form.getInputProps("pin")}
        value={form.values.pin || null}
        onChange={(value) => form.setFieldValue("pin", value ?? "")}
      />
      <Stack pt="xs">
        <Switch
          label="Pwm-able"
          defaultChecked={selectedOutput?.isPwm ?? false}
          withThumbIndicator={false}
          {...form.getInputProps("isPwm")}
          onChange={() => {
            setIsPwm(!isPwm);
            form.setFieldValue("isPwm", !isPwm);
          }}
        />
        <Switch
          label="Invert PWM"
          defaultChecked={selectedOutput?.isInvertedPwm ?? false}
          withThumbIndicator={false}
          {...form.getInputProps("isInvertedPwm")}
          disabled={!isPwm}
        />
      </Stack>
    </Fragment>
  );
}
