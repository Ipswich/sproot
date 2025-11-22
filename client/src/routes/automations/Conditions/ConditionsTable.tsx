import { Fragment } from "react/jsx-runtime";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  deleteOutputConditionAsync,
  deleteSensorConditionAsync,
  deleteTimeConditionAsync,
  deleteWeekdayConditionAsync,
  deleteMonthConditionAsync,
  getConditionsAsync,
} from "../../../requests/requests_v2";
import { Button, Code, Collapse, Group, Space, Title } from "@mantine/core";
import { SDBTimeCondition } from "@sproot/database/SDBTimeCondition";
import { SDBSensorCondition } from "@sproot/database/SDBSensorCondition";
import { SDBOutputCondition } from "@sproot/database/SDBOutputCondition";
import { SDBWeekdayCondition } from "@sproot/database/SDBWeekdayCondition";
import { SDBMonthCondition } from "@sproot/database/SDBMonthCondition";
import { ConditionOperator } from "@sproot/automation/ConditionTypes";
import {
  ReadingType,
  Units,
} from "@sproot/sproot-common/src/sensors/ReadingType";
import { ReactNode, useEffect } from "react";
import { useDisclosure } from "@mantine/hooks";
import DeletablesTable from "../../common/DeletablesTable";
import NewConditionWidget from "./NewConditionWidget";
import {
  convertCelsiusToFahrenheit,
  formatDecimalReadingForDisplay,
} from "@sproot/sproot-common/src/utility/DisplayFormats";

export interface ConditionsTableProps {
  automationId: number;
  readOnly?: boolean;
}

export default function ConditionsTable({
  automationId,
  readOnly,
}: ConditionsTableProps) {
  const [addNewConditionOpened, { toggle: toggleAddNewCondition }] =
    useDisclosure(false);
  const conditionsQueryFn = useQuery({
    queryKey: ["conditions"],
    queryFn: () => getConditionsAsync(automationId),
  });

  const deleteSensorConditionMutation = useMutation({
    mutationFn: async (conditionId: number) => {
      await deleteSensorConditionAsync(automationId, conditionId);
    },
    onSettled: () => {
      conditionsQueryFn.refetch();
    },
  });

  const deleteOutputConditionMutation = useMutation({
    mutationFn: async (conditionId: number) => {
      await deleteOutputConditionAsync(automationId, conditionId);
    },
    onSettled: () => {
      conditionsQueryFn.refetch();
    },
  });

  const deleteTimeConditionMutation = useMutation({
    mutationFn: async (conditionId: number) => {
      await deleteTimeConditionAsync(automationId, conditionId);
    },
    onSettled: () => {
      conditionsQueryFn.refetch();
    },
  });

  const deleteWeekdayConditionMutation = useMutation({
    mutationFn: async (conditionId: number) => {
      await deleteWeekdayConditionAsync(automationId, conditionId);
    },
    onSettled: () => {
      conditionsQueryFn.refetch();
    },
  });

  const deleteMonthConditionMutation = useMutation({
    mutationFn: async (conditionId: number) => {
      await deleteMonthConditionAsync(automationId, conditionId);
    },
    onSettled: () => {
      conditionsQueryFn.refetch();
    },
  });

  //local helper function
  function mapToDeleteConditionMutationAsync(
    condition:
      | SDBSensorCondition
      | SDBOutputCondition
      | SDBTimeCondition
      | SDBWeekdayCondition
      | SDBMonthCondition,
  ): (id: number) => Promise<void> {
    if ("sensorId" in condition && "readingType" in condition) {
      return async (conditionId: number) => {
        await deleteSensorConditionMutation.mutateAsync(conditionId);
      };
    } else if ("outputId" in condition) {
      return async (conditionId: number) => {
        await deleteOutputConditionMutation.mutateAsync(conditionId);
      };
    } else if ("startTime" in condition && "endTime" in condition) {
      return async (conditionId: number) => {
        await deleteTimeConditionMutation.mutateAsync(conditionId);
      };
    } else if ("weekdays" in condition) {
      return async (conditionId: number) => {
        await deleteWeekdayConditionMutation.mutateAsync(conditionId);
      };
    } else if ("months" in condition) {
      return async (conditionId: number) => {
        await deleteMonthConditionMutation.mutateAsync(conditionId);
      };
    }
    return async () => {};
  }

  useEffect(() => {
    conditionsQueryFn.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automationId]);
  const allOfConditions = Object.values(conditionsQueryFn.data ?? {})
    .map((conditionType) => conditionType.allOf)
    .flat();
  const anyOfConditions = Object.values(conditionsQueryFn.data ?? {})
    .map((conditionType) => conditionType.anyOf)
    .flat();
  const oneOfConditions = Object.values(conditionsQueryFn.data ?? {})
    .map((conditionType) => conditionType.oneOf)
    .flat();
  return (
    <Fragment>
      {conditionsQueryFn.isLoading ? (
        <Fragment>Loading...</Fragment>
      ) : (
        <Fragment>
          {allOfConditions.length != 0 && (
            <Fragment>
              <Title order={6}>All Of</Title>
              <DeletablesTable
                deletables={allOfConditions.map((condition) => {
                  return {
                    displayLabel: mapToType(condition),
                    id: condition.id,
                    deleteFn: mapToDeleteConditionMutationAsync(condition),
                  };
                })}
                readOnly={readOnly ?? false}
              />
            </Fragment>
          )}
          {anyOfConditions.length != 0 && (
            <Fragment>
              <Title order={6}>Any Of</Title>
              <DeletablesTable
                deletables={anyOfConditions.map((condition) => {
                  return {
                    displayLabel: mapToType(condition),
                    id: condition.id,
                    deleteFn: mapToDeleteConditionMutationAsync(condition),
                  };
                })}
                readOnly={readOnly ?? false}
              />
            </Fragment>
          )}
          {oneOfConditions.length != 0 && (
            <Fragment>
              <Title order={6}>One Of</Title>
              <DeletablesTable
                deletables={oneOfConditions.map((condition) => {
                  return {
                    displayLabel: mapToType(condition),
                    id: condition.id,
                    deleteFn: mapToDeleteConditionMutationAsync(condition),
                  };
                })}
                readOnly={readOnly ?? false}
              />
            </Fragment>
          )}
          {allOfConditions.length == 0 &&
            anyOfConditions.length == 0 &&
            oneOfConditions.length == 0 &&
            readOnly && <div>None</div>}
          {readOnly ? null : (
            <Fragment>
              <Group justify="center">
                <Button
                  size="sm"
                  w={"100%"}
                  color="green"
                  onClick={() => {
                    toggleAddNewCondition();
                  }}
                >
                  Add Condition
                </Button>
              </Group>
              <Collapse in={addNewConditionOpened} transitionDuration={300}>
                <Space h={12} />
                <NewConditionWidget
                  automationId={automationId}
                  toggleAddNewCondition={toggleAddNewCondition}
                />
              </Collapse>
            </Fragment>
          )}
        </Fragment>
      )}
    </Fragment>
  );
}

function mapToType(
  condition:
    | SDBSensorCondition
    | SDBOutputCondition
    | SDBTimeCondition
    | SDBWeekdayCondition
    | SDBMonthCondition,
): ReactNode {
  if ("sensorId" in condition && "readingType" in condition) {
    return <SensorConditionRow {...(condition as SDBSensorCondition)} />;
  } else if ("outputId" in condition) {
    return <OutputConditionRow {...(condition as SDBOutputCondition)} />;
  } else if ("startTime" in condition && "endTime" in condition) {
    return <TimeConditionRow {...(condition as SDBTimeCondition)} />;
  } else if ("weekdays" in condition) {
    return <WeekdayConditionRow {...(condition as SDBWeekdayCondition)} />;
  } else if ("months" in condition) {
    return <MonthConditionRow {...(condition as SDBMonthCondition)} />;
  }
  return <></>;
}

function mapOperatorToText(operator: ConditionOperator) {
  switch (operator) {
    case "less":
      return <Code fw={700}>&lt;</Code>;
    case "lessOrEqual":
      return <Code fw={700}>&lt;=</Code>;
    case "greater":
      return <Code fw={700}>&gt;</Code>;
    case "greaterOrEqual":
      return <Code fw={700}>&gt;=</Code>;
    case "equal":
      return <Code fw={700}>=</Code>;
    case "notEqual":
      return <Code fw={700}>!=</Code>;
  }
}

function SensorConditionRow(sensorCondition: SDBSensorCondition): ReactNode {
  let comparisonValue = sensorCondition.comparisonValue;
  let readingType = String(Units[sensorCondition.readingType]);
  if (
    sensorCondition.readingType == ReadingType.temperature &&
    localStorage.getItem("temperature-useAlternateUnits") == "true"
  ) {
    comparisonValue = convertCelsiusToFahrenheit(comparisonValue) ?? 0;
    readingType = "°F";
  }

  return (
    <Group>
      {sensorCondition.sensorName} is{" "}
      {mapOperatorToText(sensorCondition.operator)}{" "}
      {formatDecimalReadingForDisplay(String(comparisonValue))}
      {readingType}
    </Group>
  );
}

function OutputConditionRow(outputCondition: SDBOutputCondition): ReactNode {
  return (
    <Group>
      {outputCondition.outputName} is{" "}
      {mapOperatorToText(outputCondition.operator)}{" "}
      {formatDecimalReadingForDisplay(String(outputCondition.comparisonValue))}%
    </Group>
  );
}

function TimeConditionRow(timeCondition: SDBTimeCondition): ReactNode {
  return (
    <Group>
      {!timeCondition.startTime && !timeCondition.endTime && "Always"}
      {timeCondition.startTime &&
        !timeCondition.endTime &&
        `Time is ${timeCondition.startTime}`}
      {timeCondition.startTime &&
        timeCondition.endTime &&
        `Time is between ${timeCondition.startTime} and ${timeCondition.endTime}`}
    </Group>
  );
}

function WeekdayConditionRow(weekdayCondition: SDBWeekdayCondition): ReactNode {
  const bits = weekdayCondition.weekdays.toString(2).padStart(7, "0");
  const days = [];
  for (let i = bits.length - 1; i >= 0; i--) {
    if (bits[i] === "1") {
      days.push(
        [
          "Saturday",
          "Friday",
          "Thursday",
          "Wednesday",
          "Tuesday",
          "Monday",
          "Sunday",
        ][i],
      );
    }
  }
  let response: string | undefined = "";
  if (days.length == 1) {
    response = days[0];
  } else if (days.length == 2) {
    response = `${days[0]} or ${days[1]}`;
  } else {
    response = days.slice(0, -1).join(", ") + ", or " + days.slice(-1);
  }
  return <Group>{`Day is ${response}`}</Group>;
}

function MonthConditionRow(monthCondition: SDBMonthCondition): ReactNode {
  const bits = monthCondition.months.toString(2).padStart(12, "0");
  const months = [];
  for (let i = bits.length - 1; i >= 0; i--) {
    if (bits[i] === "1") {
      months.push(
        [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ][i],
      );
    }
  }
  let response: string | undefined = "";
  if (months.length == 1) {
    response = months[0];
  } else if (months.length == 2) {
    response = `${months[0]} or ${months[1]}`;
  } else {
    response = months.slice(0, -1).join(", ") + ", or " + months.slice(-1);
  }
  return <Group>{`Month is ${response}`}</Group>;
}
