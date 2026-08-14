import {
  Button,
  NumberInput,
  Paper,
  Select,
  Slider,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Fragment } from "react/jsx-runtime";
import {
  addOutputConditionAsync,
  getConditionsAsync,
} from "../../../../requests/requests_v2";
import {
  ConditionGroupType,
  ConditionOperator,
} from "@sproot/automation/ConditionTypes";

export interface OutputConditionProps {
  toggleAddNewCondition: () => void;
  automationId: number;
  groupType: ConditionGroupType;
  outputs: { id: number; name: string }[];
}

export default function OutputCondition({
  toggleAddNewCondition,
  automationId,
  groupType,
  outputs,
}: OutputConditionProps) {
  const condtionsQuery = useQuery({
    queryKey: ["conditions", automationId],
    queryFn: () => getConditionsAsync(automationId),
  });
  const addOutputMutation = useMutation({
    mutationFn: async (outputCondition: {
      operator: ConditionOperator;
      comparisonValue: number;
      comparisonLookback: number | null;
      outputId: string;
    }) => {
      if (outputCondition.comparisonLookback == 0) {
        outputCondition.comparisonLookback = null;
      }
      await addOutputConditionAsync(
        automationId,
        groupType,
        outputCondition.operator,
        outputCondition.comparisonValue,
        outputCondition.comparisonLookback,
        outputCondition.outputId,
      );
    },
    onSettled: () => {
      condtionsQuery.refetch();
    },
  });

  const outputConditionForm = useForm({
    initialValues: {
      outputId: String(outputs[0]!.id),
      operator: "less" as ConditionOperator,
      comparisonValue: 50,
      comparisonLookback: 0,
    },

    validate: {
      outputId: (value: string) =>
        value != null && value != undefined
          ? null
          : "Output Id must be provided",
      operator: (value: string) =>
        [
          "less",
          "lessOrEqual",
          "greater",
          "greaterOrEqual",
          "equal",
          "notEqual",
        ].includes(value)
          ? null
          : "Invalid operator",
      comparisonValue: (value: number) =>
        value != null && value != undefined && value <= 100 && value >= 0
          ? null
          : "Comparison value must be provided",
      comparisonLookback: (value: number) =>
        value >= 0 && value <= 1440
          ? null
          : "Comparison lookback must be empty between 1 and 1440 minutes",
    },
  });

  return (
    <Fragment>
      <form
        onSubmit={outputConditionForm.onSubmit(async (values) => {
          addOutputMutation.mutate(values);
          outputConditionForm.reset();
          toggleAddNewCondition();
        })}
      >
        <Stack gap="md">
          <Paper withBorder radius="md" p="md">
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Watch an output's current level or state and only trigger after
                it stays there long enough.
              </Text>
              <Select
                required
                allowDeselect={false}
                label="Output"
                data={outputs.map((output) => {
                  return { label: output.name, value: String(output.id) };
                })}
                {...outputConditionForm.getInputProps("outputId")}
              />
              <Select
                required
                allowDeselect={false}
                label="Comparison"
                data={[
                  {
                    label: "Less than",
                    value: "less",
                  },
                  {
                    label: "Less than or equal",
                    value: "lessOrEqual",
                  },
                  {
                    label: "Greater than",
                    value: "greater",
                  },
                  {
                    label: "Greater than or equal",
                    value: "greaterOrEqual",
                  },
                  {
                    label: "Equal to",
                    value: "equal",
                  },
                  {
                    label: "Not equal to",
                    value: "notEqual",
                  },
                ]}
                {...outputConditionForm.getInputProps("operator")}
              />
              <Stack gap="xs">
                <Text fw={500} size="sm">
                  Target output level
                </Text>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  label={(value) => `${value}%`}
                  marks={[
                    { value: 20, label: "20%" },
                    { value: 50, label: "50%" },
                    { value: 80, label: "80%" },
                  ]}
                  {...outputConditionForm.getInputProps("comparisonValue")}
                />
              </Stack>
              <NumberInput
                required
                label="Hold time"
                description="Triggers if target value is held for the specified time. Use 0 to trigger immediately."
                step={1}
                min={0}
                max={1440}
                suffix={
                  outputConditionForm.values.comparisonLookback === 1
                    ? " minute"
                    : " minutes"
                }
                {...outputConditionForm.getInputProps("comparisonLookback")}
              />
            </Stack>
          </Paper>
          <Button type="submit" fullWidth>
            Save Condition
          </Button>
        </Stack>
      </form>
    </Fragment>
  );
}
