import {
  ControlMode,
  IOutputBase,
} from "@sproot/sproot-common/src/outputs/OutputBase";
import {
  setOutputControlModeAsync,
  setOutputManualStateAsync,
} from "../requests";
import { Fragment, useState } from "react";
import { Box, Group, Paper, Slider, Switch, Title } from "@mantine/core";

interface OutputCardProps {
  output: IOutputBase;
  updateOutputsAsync: () => Promise<void>;
}

export default function OutputCard({
  output,
  updateOutputsAsync,
}: OutputCardProps) {
  const [controlMode, setControlMode] = useState(output.controlMode);
  return (
    <Fragment>
      <Paper shadow="xs" radius="md" withBorder p="xl">
        <Title order={3}>{output.name}</Title>
        <Title order={4}>Control Mode: {capitalize(output.controlMode)}</Title>
        <Group>
          <Switch
            size="md"
            checked={controlMode === ControlMode.manual ? true : false}
            onChange={async (event) => {
              setControlMode(
                event.target.checked
                  ? ControlMode.manual
                  : ControlMode.schedule,
              );
              await setOutputControlModeAsync(
                output.id,
                event.target.checked ? "manual" : "schedule",
              );
            }}
          />
          {output.isPwm == true ? (
            <Box maw={240} m={10} style={{ width: "100%" }}>
              <Slider
                disabled={controlMode !== ControlMode.manual}
                onChangeEnd={async (value) => {
                  console.table(output);
                  console.log(value);
                  await setOutputManualStateAsync(output.id, value);
                  await updateOutputsAsync();
                }}
                size="xl"
                color="blue"
                marks={[
                  { value: 20, label: "20%" },
                  { value: 50, label: "50%" },
                  { value: 80, label: "80%" },
                ]}
              />
            </Box>
          ) : (
            <Switch
              size="md"
              disabled={controlMode !== ControlMode.manual}
              checked={output.manualState.value === 100}
              onChange={async (event) => {
                console.table(output);
                console.log(event.target.checked ? 100 : 0);
                await setOutputManualStateAsync(
                  output.id,
                  event.target.checked ? 100 : 0,
                );
                await updateOutputsAsync();
              }}
            />
          )}
        </Group>
      </Paper>
    </Fragment>
  );
}

const capitalize = function (word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
};
