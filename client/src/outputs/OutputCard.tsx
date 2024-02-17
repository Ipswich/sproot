import {
  ControlMode,
  IOutputBase,
} from "@sproot/sproot-common/src/outputs/OutputBase";
import {
  setOutputControlModeAsync,
  setOutputManualStateAsync,
} from "../requests";
import { Fragment, useState } from "react";
import {
  Group,
  Paper,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Title,
  rem,
} from "@mantine/core";

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
      <Group justify="space-around">
        <Paper shadow="xs" radius="md" withBorder m="xs" p="md" w={rem(400)}>
          <Group justify="space-between">
            <SegmentedControl
              w={"25%"}
              color="blue"
              orientation="vertical"
              value={controlMode}
              data={[
                { label: "Manual", value: ControlMode.manual },
                { label: "Schedule", value: ControlMode.schedule },
              ]}
              onChange={async (value) => {
                setControlMode(value as ControlMode);
                await setOutputControlModeAsync(output.id, value);
              }}
            />
            <Stack justify="space-around" w={"70%"}>
              <Group justify="space-around">
                <Title order={4}>{output.name}</Title>
              </Group>
              {output.isPwm == true ? (
                // <Box maw={240} m={10} style={{ width: "100%" }}>
                <Slider
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
                // </Box>
                <Group justify="space-around">
                  <Switch
                    size="xl"
                    onLabel="On"
                    offLabel="Off"
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
                </Group>
              )}
            </Stack>
          </Group>
        </Paper>
      </Group>
    </Fragment>
  );
}
