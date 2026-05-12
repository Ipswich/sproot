import {
  ControlMode,
  IOutputBase,
} from "@sproot/sproot-common/src/outputs/IOutputBase";
import {
  setOutputControlModeAsync,
  setOutputManualStateAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { Fragment, useEffect, useState } from "react";
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

export default function StateCard({ output, updateOutputsAsync }: StateProps) {
  const [controlMode, setControlMode] = useState(output.state.controlMode);
  const [manualValue, setManualValue] = useState<number>(
    output.state.manual.value ?? 0,
  );
  const [pwmValue, setPwmValue] = useState<number>(
    output.state.manual.value ?? 0,
  );
  const [isSegmentedControlDisabled, setSegmentedControlDisabled] =
    useState(false);

  useEffect(() => {
    setControlMode(output.state.controlMode);
    setManualValue(output.state.manual.value ?? 0);
    setPwmValue(output.state.manual.value ?? 0);
  }, [output.id, output.state.controlMode, output.state.manual?.value]);

  const updateOutputControlModeMutation = useMutation({
    mutationFn: async (newControlMode: { id: number; controlMode: string }) => {
      await setOutputControlModeAsync(
        newControlMode.id,
        newControlMode.controlMode,
      );
    },
    onSettled: async () => {
      await updateOutputsAsync();
    },
  });

  const updateOutputManualStateMutation = useMutation({
    mutationFn: async (newState: { id: number; value: number }) => {
      await setOutputManualStateAsync(newState.id, newState.value);
    },
    onSettled: async () => {
      await updateOutputsAsync();
    },
  });

  function segmentedControlColor() {
    return controlMode == ControlMode.manual ? "blue" : "teal";
  }
  return (
    <Fragment>
      <Stack justify="space-around">
        <Group justify="space-around">
          <Paper shadow="xs" radius="md" withBorder my="4" p="sm" w={rem(360)}>
            <Group justify="space-between" h="80">
              <SegmentedControl
                w={"96px"}
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
                color={segmentedControlColor()}
                orientation="vertical"
                value={controlMode}
                data={[
                  { label: "Manual", value: ControlMode.manual },
                  { label: "Automatic", value: ControlMode.automatic },
                ]}
                disabled={isSegmentedControlDisabled}
                onChange={async (value) => {
                  setSegmentedControlDisabled(true);
                  setControlMode(value as ControlMode);
                  await updateOutputControlModeMutation.mutateAsync({
                    id: output.id,
                    controlMode: value,
                  });
                  setSegmentedControlDisabled(false);
                }}
              />
              <Stack justify="space-around" flex={1}>
                {output.isPwm == true ? (
                  <Fragment>
                    {controlMode === ControlMode.manual ? (
                      <Slider
                        value={pwmValue}
                        onChange={(v) => setPwmValue(v)}
                        disabled={controlMode !== ControlMode.manual}
                        label={(value) => `${value}%`}
                        onChangeEnd={async (value) => {
                          await updateOutputManualStateMutation.mutateAsync({
                            id: output.id,
                            value,
                          });
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
                        checked={manualValue === 100}
                        onChange={async (event) => {
                          const val = event.target.checked ? 100 : 0;
                          setManualValue(val);
                          await updateOutputManualStateMutation.mutateAsync({
                            id: output.id,
                            value: val,
                          });
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
