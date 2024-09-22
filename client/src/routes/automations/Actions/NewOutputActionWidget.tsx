import { Button, Group, Select, Slider, Stack, Switch } from "@mantine/core";
import { Fragment } from "react/jsx-runtime";
import { useForm } from "@mantine/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { addOutputActionAsync, getOutputActionsByAutomationIdAsync } from "../../../requests/requests_v2";

export interface NewOutputActionWidgetProps {
  automationId: number,
  outputs: { id: number, name: string, isPwm: boolean }[];
  toggleAddNewOutputAction: () => void;
}

export default function NewOutputActionWidget({ automationId, outputs, toggleAddNewOutputAction }: NewOutputActionWidgetProps) {
  const outputActionsQueryFn = useQuery({
    queryKey: ["outputActions"],
    queryFn: () => getOutputActionsByAutomationIdAsync(automationId),
  });
  const addOutputActionMutation = useMutation({
    mutationFn: async (outputAction: { outputId: string, value: number }) => {
      console.log(outputAction);
      await addOutputActionAsync(automationId, parseInt(outputAction.outputId), outputAction.value);
    },
    onSettled: () => {
      outputActionsQueryFn.refetch();
    },
  });

  const outputActionForm = useForm({
    initialValues: {
      outputId: String(outputs[0]?.id) ?? "",
      value: outputs[0]?.isPwm ? 50 : 100,
    },

    validate: {
      outputId: (value) =>
        value != null && value != undefined
          ? null
          : "Output Id must be provided",
      value: (value) =>
        value != null && value != undefined
          ? null
          : "Value must be provided",
    },
  });

  return (
    <Fragment>
      <form
        onSubmit={outputActionForm.onSubmit(async (values) => {
          addOutputActionMutation.mutate(values);
          outputActionForm.reset();
          toggleAddNewOutputAction();
        })}
      >
        <Stack>
          <Select
            data={outputs.map((output) => { return { value: String(output.id), label: output.name } })}
            label="Output"
            value={outputActionForm.values.outputId}
            {...outputActionForm.getInputProps("outputId")}
          />
          {outputActionForm.values.outputId && outputs.find((output) => output.id == parseInt(outputActionForm.values.outputId))?.isPwm ? (
            <Slider
              min={0}
              max={100}
              step={1}
              label={(value) => `${value}%`}
              marks={[
                { value: 20, label: "20%" },
                { value: 50, label: "50%" },
                { value: 80, label: "80%" }
              ]}
              {...outputActionForm.getInputProps("value")}
            />
          ) : (
            <Group justify="center">
              <Switch
                size="xl"
                onLabel="On"
                offLabel="Off"
                checked={outputActionForm.values.value === 100}
                {...outputActionForm.getInputProps("value")}
                onChange={(event) => {
                  outputActionForm.setFieldValue("value", event.target.checked ? 100 : 0);
                }}
              /></Group>
          )}
          <Group justify="center" mt="md">
            <Button type="submit">Save</Button>
          </Group>
        </Stack>
      </form>
    </Fragment>
  );
}