import {
  ControlMode,
  IOutputBase,
} from "@sproot/sproot-common/src/outputs/IOutputBase";
import {
  setOutputControlModeAsync,
  setOutputManualStateAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
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
import { useMutation } from "@tanstack/react-query";

interface StateProps {
  output: IOutputBase;
  updateOutputsAsync: () => Promise<void>;
}

export default function StateCard({
  output,
  updateOutputsAsync,
}: StateProps) {
  const [controlMode, setControlMode] = useState(output.state.controlMode);

  const updateOutputControlModeMutation = useMutation({
    mutationFn: async (newControlMode: { id: number, controlMode: string }) => {
      await setOutputControlModeAsync(newControlMode.id, newControlMode.controlMode)
    },
    onSettled: async () => {
      await updateOutputsAsync();
    }
  });

  const updateOutputManualStateMutation = useMutation({
    mutationFn: async (newState: { id: number, value: number }) => {
      await setOutputManualStateAsync(newState.id, newState.value)
    },
    onSettled: async () => {
      await updateOutputsAsync();
    }
  });

  function segmentedControlColor() {
    return output.state.controlMode == ControlMode.manual ? "blue" : "teal";
  }

  let isSegmentedControlDisabled = false;
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
                color={segmentedControlColor()}
                orientation="vertical"
                value={controlMode}
                data={[
                  { label: "Manual", value: ControlMode.manual },
                  { label: "Automatic", value: ControlMode.automatic },
                ]}
                disabled={isSegmentedControlDisabled}
                onChange={async (value) => {
                  isSegmentedControlDisabled = true;
                  setControlMode(value as ControlMode);
                  await updateOutputControlModeMutation.mutateAsync({ id: output.id, controlMode: value });
                  isSegmentedControlDisabled = false;
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
                          await updateOutputManualStateMutation.mutateAsync({ id: output.id, value });
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
                          value={output.state.automatic.value}
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
                          await updateOutputManualStateMutation.mutateAsync({ id: output.id, value: event.target.checked ? 100 : 0 });
                        }}
                      />
                    ) : (
                      <Fragment>
                        <StatsRing
                          value={output.state.automatic.value}
                          color="teal"
                        />
                      </Fragment>
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
