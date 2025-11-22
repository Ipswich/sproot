import { Fragment } from "react/jsx-runtime";
import {
  ComboboxItem,
  Divider,
  Group,
  OptionsFilter,
  Select,
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
      <Group justify="space-between">
        <Select
          allowDeselect={false}
          w={"45%"}
          label="Condition Type"
          value={conditionType}
          filter={optionsFilter}
          data={[
            { value: "Time", label: "Time", disabled: false },
            { value: "Weekday", label: "Weekday", disabled: false },
            { value: "Month", label: "Month", disabled: false },
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
          ]}
          onChange={(value) => setConditionType(value)}
        />
        <Select
          w={"45%"}
          label="Group"
          value={groupType}
          data={["allOf", "anyOf", "oneOf"]}
          onChange={(value) => setGroupType(value)}
        />
      </Group>
      <Divider my="md" />
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
  }
  return <></>;
}
