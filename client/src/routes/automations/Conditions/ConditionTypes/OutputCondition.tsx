import { Button, Group, Select, Slider, Stack, Space } from "@mantine/core";
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
    queryKey: ["conditions"],
    queryFn: () => getConditionsAsync(automationId),
  });
  const addOutputMutation = useMutation({
    mutationFn: async (outputCondition: {
      operator: ConditionOperator;
      comparisonValue: number;
      outputId: string;
    }) => {
      await addOutputConditionAsync(
        automationId,
        groupType,
        outputCondition.operator,
        outputCondition.comparisonValue,
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
        <Stack>
          <Group>
            <Select
              flex={1}
              required
              allowDeselect={false}
              data={outputs.map((output) => {
                return { label: output.name, value: String(output.id) };
              })}
              {...outputConditionForm.getInputProps("outputId")}
            />
            is
            <Select
              w={"30%"}
              required
              allowDeselect={false}
              data={[
                {
                  label: "<",
                  value: "less",
                },
                {
                  label: "<=",
                  value: "lessOrEqual",
                },
                {
                  label: ">",
                  value: "greater",
                },
                {
                  label: ">=",
                  value: "greaterOrEqual",
                },
                {
                  label: "=",
                  value: "equal",
                },
                {
                  label: "!=",
                  value: "notEqual",
                },
              ]}
              {...outputConditionForm.getInputProps("operator")}
            />
          </Group>
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
          <Group justify="center" mt="md">
            <Button type="submit">Save</Button>
          </Group>
        </Stack>
        <Space h={"12px"} />
      </form>
    </Fragment>
  );
}
