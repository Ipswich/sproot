import { NumberInput, Stack, Switch, TextInput } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { Fragment, useState } from "react";
import { OutputFormValues } from "../OutputSettings";

interface PCA9685FormProps {
  selectedOutput?: IOutputBase;
  form: UseFormReturnType<OutputFormValues>;
}

export default function PCA9685Form({
  selectedOutput,
  form,
}: PCA9685FormProps) {
  const [isPwm, setIsPwm] = useState(selectedOutput?.isPwm ?? false);

  return (
    <Fragment>
      <TextInput
        maxLength={64}
        label="Address"
        placeholder="0x40"
        required
        {...form.getInputProps("address")}
      />
      {import.meta.env["VITE_PRECONFIGURED"] != "true" ? (
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
      ) : (selectedOutput?.isPwm ?? false) ? (
        <Switch
          label="Invert PWM"
          defaultChecked={selectedOutput?.isInvertedPwm ?? false}
          {...form.getInputProps("isInvertedPwm")}
          disabled={!isPwm}
        />
      ) : null}
    </Fragment>
  );
}
