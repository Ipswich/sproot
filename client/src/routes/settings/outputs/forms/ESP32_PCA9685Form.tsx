import { NumberInput, Select, Stack, Switch, TextInput } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { Fragment, useState } from "react";
import { OutputFormValues } from "../OutputSettings";
import { SDBSubcontroller } from "@sproot/sproot-common/src/database/SDBSubcontroller";

interface ESP32_PCA9685FormProps {
  selectedOutput?: IOutputBase;
  subcontrollers: SDBSubcontroller[];
  form: UseFormReturnType<OutputFormValues>;
}

export default function ESP32_PCA9685Form({
  selectedOutput,
  subcontrollers,
  form,
}: ESP32_PCA9685FormProps) {
  const [isPwm, setIsPwm] = useState(selectedOutput?.isPwm ?? false);

  return (
    <Fragment>
      <Select
        label="Host"
        placeholder="Select Device"
        data={subcontrollers.map((device: SDBSubcontroller) => ({
          value: String(device.id),
          label: device.name,
        }))}
        {...form.getInputProps("subcontrollerId")}
        value={
          form.values.subcontrollerId != null
            ? String(form.values.subcontrollerId)
            : null
        }
        onChange={(val) =>
          form.setFieldValue(
            "subcontrollerId",
            val !== null ? parseInt(val, 10) : undefined,
          )
        }
        required
      />
      <TextInput
        maxLength={64}
        label="Address"
        placeholder="0x40"
        required
        {...form.getInputProps("address")}
      />
      <Fragment>
        <NumberInput
          required
          defaultValue={parseInt(selectedOutput?.pin ?? "0")}
          label="Pin"
          clampBehavior="strict"
          allowDecimal={false}
          min={0}
          max={15}
          {...form.getInputProps("pin")}
        />
        <Stack pt="xs">
          <Switch
            label="Pwm-able"
            defaultChecked={selectedOutput?.isPwm ?? false}
            {...form.getInputProps("isPwm")}
            onChange={() => {
              setIsPwm(!isPwm);
              form.setFieldValue("isPwm", !isPwm);
            }}
          />
          <Switch
            label="Invert PWM"
            defaultChecked={selectedOutput?.isInvertedPwm ?? false}
            {...form.getInputProps("isInvertedPwm")}
            disabled={!isPwm}
          />
        </Stack>
      </Fragment>
    </Fragment>
  );
}
