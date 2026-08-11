import { ControlMode, IOutputBase } from "@sproot/common/outputs/IOutputBase";
import {
  setOutputControlModeAsync,
  setOutputManualStateAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { Fragment, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Group,
  Paper,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text,
  rem,
} from "@mantine/core";
import { getOutputActionPrecedenceColor } from "@sproot/common/automation/OutputActionPrecedence";
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

  const conflictAutomationNames = output.activeConflict?.actions.map(
    (action) => action.automationName,
  );
  const showTriggeredBy =
    controlMode === ControlMode.automatic &&
    !output.activeConflict &&
    output.state.automatic.value > 0 &&
    output.triggeredBy.length > 0;

  return (
    <Fragment>
      <Stack justify="space-around">
        <Group justify="space-around">
          <Paper shadow="xs" radius="md" withBorder my="4" p="sm" w={rem(360)}>
            <Stack gap="sm">
              <Group justify="space-between" h="80">
                <SegmentedControl
                  miw={rem(140)}
                  styles={
                    controlMode === ControlMode.manual
                      ? {
                          root: {
                            outline: "1px solid var(--mantine-color-blue-3)",
                          },
                          label: {
                            whiteSpace: "nowrap",
                          },
                        }
                      : {
                          root: {
                            outline: "1px solid var(--mantine-color-teal-3)",
                          },
                          label: {
                            whiteSpace: "nowrap",
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
                          withThumbIndicator={false}
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
              {controlMode === ControlMode.automatic &&
              output.activeConflict ? (
                <Alert
                  color="yellow"
                  variant="light"
                  title="Automation conflict detected"
                >
                  <Stack gap={4} ta="left">
                    <Text size="sm">
                      {`${output.name ?? "This output"} received conflicting `}
                      <Text
                        inherit
                        c={getOutputActionPrecedenceColor(
                          output.activeConflict.precedence,
                        )}
                        span
                        fw={600}
                      >
                        {output.activeConflict.precedence}
                      </Text>
                      {` precedence requests, so no automatic action was applied.`}
                    </Text>
                    {conflictAutomationNames?.map((automationName) => (
                      <Text key={automationName} size="sm">
                        {`- ${automationName}`}
                      </Text>
                    ))}
                    <Text size="sm">
                      Verify the related automations and output actions so they
                      do not request different states at the same precedence.
                    </Text>
                  </Stack>
                </Alert>
              ) : null}
              {showTriggeredBy ? (
                <Stack gap={6}>
                  <Text size="sm" fw={500} c="dimmed">
                    Triggered by
                  </Text>
                  <Group gap="xs" wrap="wrap">
                    {output.triggeredBy.map((automation) => (
                      <Badge
                        key={`${output.id}-${automation.automationId}`}
                        variant="light"
                        color="green"
                        radius="sm"
                      >
                        {automation.automationName}
                      </Badge>
                    ))}
                  </Group>
                </Stack>
              ) : null}
            </Stack>
          </Paper>
        </Group>
      </Stack>
    </Fragment>
  );
}
