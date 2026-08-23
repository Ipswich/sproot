import { Fragment } from "react/jsx-runtime";
import {
  ComboboxItem,
  Divider,
  OptionsFilter,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import {
  getOutputsAsync,
  getSensorsAsync,
} from "../../../requests/requests_v2";
import { useQuery } from "@tanstack/react-query";
import { ConditionGroupType } from "@sproot/automation/ConditionTypes";
import { ReadingType } from "@sproot/sensors/ReadingType";
import SensorCondition from "./ConditionTypes/SensorCondition";
import OutputCondition from "./ConditionTypes/OutputCondition";
import TimeCondition from "./ConditionTypes/TimeCondition";
import WeekdayCondition from "./ConditionTypes/WeekdayCondition";
import MonthCondition from "./ConditionTypes/MonthCondition";
import DataRangeCondition from "./ConditionTypes/DateRangeCondition";

export interface NewConditionWidgetProps {
  automationId: number;
  toggleAddNewCondition: () => void;
}

export default function NewConditionWidget({
  automationId,
  toggleAddNewCondition,
}: NewConditionWidgetProps) {
  const [conditionType, setConditionType] = useState<string | null>("Time");
  const [groupType, setGroupType] = useState<string | null>("allOf");

  const getSensorsQuery = useQuery({
    queryKey: ["sensors"],
    queryFn: getSensorsAsync,
  });

  const getOutputsQuery = useQuery({
    queryKey: ["outputs"],
    queryFn: getOutputsAsync,
  });

  const optionsFilter: OptionsFilter = ({ options }) => {
    const filtered = (options as ComboboxItem[]).filter(
      (option) => option.disabled == false,
    );

    return filtered;
  };

  return (
    <Fragment>
      <Paper withBorder radius="md" p="md">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Start with the condition type, then choose how it should be grouped
            with the rest of the automation logic.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              allowDeselect={false}
              label="Condition Type"
              value={conditionType}
              filter={optionsFilter}
              data={[
                {
                  value: "Sensor",
                  label: "Sensor",
                  disabled:
                    !getSensorsQuery.isSuccess ||
                    Object.keys(getSensorsQuery.data).length == 0,
                },
                {
                  value: "Output",
                  label: "Output",
                  disabled:
                    !getOutputsQuery.isSuccess ||
                    Object.keys(getOutputsQuery.data).length == 0,
                },
                { value: "Weekday", label: "Weekday", disabled: false },
                { value: "Month", label: "Month", disabled: false },
                { value: "Date Range", label: "Date Range", disabled: false },
                { value: "Time", label: "Time", disabled: false },
              ]}
              onChange={(value) => setConditionType(value)}
            />
            <Select
              label="Condition Group"
              description="Determines how this condition combines with neighboring rules."
              value={groupType}
              data={[
                { value: "allOf", label: "All Of" },
                { value: "anyOf", label: "Any Of" },
                { value: "oneOf", label: "One Of" },
              ]}
              onChange={(value) => setGroupType(value)}
            />
          </SimpleGrid>
          <Divider variant="dashed" />
          {updateDisplayedCondition(
            conditionType!,
            groupType as ConditionGroupType,
            automationId,
            toggleAddNewCondition,
            Object.values(getSensorsQuery.data ?? {}).map((sensor) => {
              return { id: sensor.id, units: sensor.units, name: sensor.name };
            }) ?? [],
            Object.values(getOutputsQuery.data ?? {}).map((output) => {
              return { id: output.id, name: output.name ?? "" };
            }) ?? [],
          )}
        </Stack>
      </Paper>
    </Fragment>
  );
}

function updateDisplayedCondition(
  conditionType: string,
  groupType: ConditionGroupType,
  automationId: number,
  toggleAddNewCondition: () => void,
  sensors: {
    id: number;
    units: Partial<Record<ReadingType, string>>;
    name: string;
  }[],
  outputs: { id: number; name: string }[],
) {
  switch (conditionType) {
    case "Sensor":
      return (
        <SensorCondition
          toggleAddNewCondition={toggleAddNewCondition}
          automationId={automationId}
          groupType={groupType}
          sensors={sensors}
        />
      );
    case "Output":
      return (
        <OutputCondition
          toggleAddNewCondition={toggleAddNewCondition}
          automationId={automationId}
          groupType={groupType}
          outputs={outputs}
        />
      );
    case "Time":
      return (
        <TimeCondition
          toggleAddNewCondition={toggleAddNewCondition}
          automationId={automationId}
          groupType={groupType}
        />
      );
    case "Weekday":
      return (
        <WeekdayCondition
          toggleAddNewCondition={toggleAddNewCondition}
          automationId={automationId}
          groupType={groupType}
        />
      );
    case "Month":
      return (
        <MonthCondition
          toggleAddNewCondition={toggleAddNewCondition}
          automationId={automationId}
          groupType={groupType}
        />
      );
    case "Date Range":
      return (
        <DataRangeCondition
          toggleAddNewCondition={toggleAddNewCondition}
          automationId={automationId}
          groupType={groupType}
        />
      );
  }
  return <></>;
}
