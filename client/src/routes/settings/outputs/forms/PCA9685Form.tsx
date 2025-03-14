import { NumberInput, Stack, Switch } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { Fragment, useState } from "react";
import { FormValues } from "../OutputSettings";

interface PCA9685FormProps {
  selectedOutput?: IOutputBase;
  form: UseFormReturnType<FormValues>;
}

export default function PCA9685Form({
  selectedOutput,
  form,
}: PCA9685FormProps) {
  const [isPwm, setIsPwm] = useState(selectedOutput?.isPwm ?? false);

  return (
    <Stack py="md">
      {import.meta.env["VITE_PRECONFIGURED"] != "true" ? (
        <Fragment>
          <NumberInput
            required
            defaultValue={parseInt(selectedOutput?.pin ?? 0)}
            label="Pin"
            clampBehavior="strict"
            allowDecimal={false}
            min={0}
            max={15}
            {...form.getInputProps("pin")}
          />
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
        </Fragment>
      ) : (selectedOutput?.isPwm ?? false) ? (
        <Switch
          label="Invert PWM"
          defaultChecked={selectedOutput?.isInvertedPwm ?? false}
          {...form.getInputProps("isInvertedPwm")}
          disabled={!isPwm}
        />
      ) : null}
    </Stack>
  );
}
