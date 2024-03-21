import {
  ControlMode,
  IOutputBase,
} from "@sproot/sproot-common/src/outputs/IOutputBase";
import {
  setOutputControlModeAsync,
  setOutputManualStateAsync,
} from "@sproot/sproot-client/src/requests";
import { Fragment, useState } from "react";
import {
  Group,
  Paper,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  rem,
} from "@mantine/core";
import { StatsRing } from "./StatsRing";

interface OutputCardProps {
  output: IOutputBase;
  updateOutputsAsync: () => Promise<void>;
}

export default function OutputCard({
  output,
  updateOutputsAsync,
}: OutputCardProps) {
  const [controlMode, setControlMode] = useState(output.state.controlMode);
  const [segmentedControlColor, setSegmentedControlColor] = useState(
    output.state.controlMode === ControlMode.manual ? "blue" : "teal",
  );

  return (
    <Fragment>
      <Stack justify="space-around">
        <Group justify="space-around">
          <Paper shadow="xs" radius="md" withBorder my="4" p="sm" w={rem(360)}>
            <Group justify="space-between" h="80">
              <SegmentedControl
                styles={
                  controlMode === ControlMode.manual
                    ? {
                        root: {
                          outline: "1px solid var(--mantine-color-blue-3)",
                        },
                      }
                    : {
                        root: {
                          outline: "1px solid var(--mantine-color-teal-3)",
                        },
                      }
                }
                w={"36%"}
                color={segmentedControlColor}
                orientation="vertical"
                value={controlMode}
                data={[
                  { label: "Manual", value: ControlMode.manual },
                  { label: "Schedule", value: ControlMode.schedule },
                ]}
                onChange={async (value) => {
                  setControlMode(value as ControlMode);
                  setSegmentedControlColor(
                    value === ControlMode.manual ? "blue" : "teal",
                  );
                  await setOutputControlModeAsync(output.id, value);
                  await updateOutputsAsync();
                }}
              />
              <Stack justify="space-around" w={"58%"}>
                {output.isPwm == true ? (
                  <Fragment>
                    {controlMode === ControlMode.manual ? (
                      <Slider
                        defaultValue={output.state.manual.value!}
                        disabled={controlMode !== ControlMode.manual}
                        label={(value) => `${value}%`}
                        onChangeEnd={async (value) => {
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
                    ) : (
                      <Group justify="space-around">
                        <StatsRing
                          value={output.state.schedule.value}
                          color="teal"
                        />
                      </Group>
                    )}
                  </Fragment>
                ) : (
                  <Group justify="space-around">
                    {controlMode === ControlMode.manual ? (
                      <Switch
                        size="xl"
                        onLabel="On"
                        offLabel="Off"
                        disabled={controlMode !== ControlMode.manual}
                        checked={output.state.manual.value === 100}
                        onChange={async (event) => {
                          await setOutputManualStateAsync(
                            output.id,
                            event.target.checked ? 100 : 0,
                          );
                          await updateOutputsAsync();
                        }}
                      />
                    ) : (
                      <StatsRing
                        value={output.state.schedule.value}
                        color="teal"
                      />
                    )}
                  </Group>
                )}
              </Stack>
            </Group>
          </Paper>
        </Group>
      </Stack>
    </Fragment>
  );
}
