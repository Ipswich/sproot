import { Fragment } from "react/jsx-runtime";
import { useMutation, useQuery } from "@tanstack/react-query";
import { deleteOutputConditionAsync, deleteSensorConditionAsync, deleteTimeConditionAsync, getConditionsAsync } from "../../../requests/requests_v2";
import { Button, Code, Collapse, Group, Space, Title } from "@mantine/core";
import { SDBTimeCondition } from "@sproot/database/SDBTimeCondition";
import { SDBSensorCondition } from "@sproot/database/SDBSensorCondition";
import { SDBOutputCondition } from "@sproot/database/SDBOutputCondition";
import { ConditionOperator } from "@sproot/automation/ConditionTypes";
import { Units } from "@sproot/sproot-common/src/sensors/ReadingType";
import { ReactNode, useEffect } from "react";
import { useDisclosure } from "@mantine/hooks";
import DeletablesTable from "../../common/DeletablesTable";
import NewConditionWidget from "./NewConditionWidget";

export interface ConditionsTableProps {
  automationId: number;
}

export default function ConditionsTable({ automationId }: ConditionsTableProps) {
  const [addNewConditionOpened, { toggle: toggleAddNewCondition }] = useDisclosure(false);
  const conditionsQueryFn = useQuery({
    queryKey: ["conditions"],
    queryFn: () => getConditionsAsync(automationId),
  })

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


  //local helper function
  function mapToDeleteConditionMutationAsync(condition: SDBSensorCondition | SDBOutputCondition | SDBTimeCondition): (id: number) => Promise<void> {
    if ('sensorId' in condition && 'readingType' in condition) {
      return async (conditionId: number) => {
        await deleteSensorConditionMutation.mutateAsync(conditionId);
      };
    } else if ('outputId' in condition) {
      return async (conditionId: number) => {
        await deleteOutputConditionMutation.mutateAsync(conditionId);
      };
    } else if ('startTime' in condition && 'endTime' in condition) {
      return async (conditionId: number) => {
        await deleteTimeConditionMutation.mutateAsync(conditionId);
      };
    }
    return async () => { };
  }

  useEffect(() => {
    conditionsQueryFn.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automationId])
  const allOfConditions = Object.values(conditionsQueryFn.data ?? {}).map((conditionType) => conditionType.allOf).flat();
  const anyOfConditions = Object.values(conditionsQueryFn.data ?? {}).map((conditionType) => conditionType.anyOf).flat();
  const oneOfConditions = Object.values(conditionsQueryFn.data ?? {}).map((conditionType) => conditionType.oneOf).flat();
  return (
    <Fragment>
      {allOfConditions.length != 0 &&
        <Fragment>
          <Title order={6}>All Of</Title>
          <DeletablesTable deletableName="All Of" deletables={allOfConditions.map((condition) => { return { displayLabel: mapToType(condition), id: condition.id, deleteFn: mapToDeleteConditionMutationAsync(condition) } })} />
        </Fragment>}
      {anyOfConditions.length != 0 &&
        <Fragment>
          <Title order={6}>Any Of</Title>
          <DeletablesTable deletableName="Any Of" deletables={anyOfConditions.map((condition) => { return { displayLabel: mapToType(condition), id: condition.id, deleteFn: mapToDeleteConditionMutationAsync(condition) } })} />
        </Fragment>}
      {oneOfConditions.length != 0 &&
        <Fragment>
          <Title order={6}>One Of</Title>
          <DeletablesTable deletableName="One Of" deletables={oneOfConditions.map((condition) => { return { displayLabel: mapToType(condition), id: condition.id, deleteFn: mapToDeleteConditionMutationAsync(condition) } })} />
        </Fragment>}
      <Group justify="center">
        <Button size="sm" w={"100%"} color="green" onClick={() => {toggleAddNewCondition()}}>Add Condition</Button>
      </Group>
      <Collapse in={addNewConditionOpened} transitionDuration={300}>
        <Space h={12} />
        <NewConditionWidget automationId={automationId} toggleAddNewCondition={toggleAddNewCondition} />
      </Collapse>
    </Fragment>
  )
}

function mapToType(condition: SDBSensorCondition | SDBOutputCondition | SDBTimeCondition): ReactNode {
  if ('sensorId' in condition && 'readingType' in condition) {
    return <SensorConditionRow {...condition as SDBSensorCondition} />;
  } else if ('outputId' in condition) {
    return <OutputConditionRow {...condition as SDBOutputCondition} />;
  } else if ('startTime' in condition && 'endTime' in condition) {
    return <TimeConditionRow {...condition as SDBTimeCondition} />;
  }
  return <></>
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
  return (
    <Group>
      {sensorCondition.sensorName} is {mapOperatorToText(sensorCondition.operator)} {String(sensorCondition.comparisonValue)}{Units[sensorCondition.readingType]}
    </Group>
  )
}

function OutputConditionRow(outputCondition: SDBOutputCondition): ReactNode {
  return (
    <Group>{outputCondition.outputName} is {mapOperatorToText(outputCondition.operator)} {String(outputCondition.comparisonValue)}%</Group>
  )
}

function TimeConditionRow(timeCondition: SDBTimeCondition): ReactNode {
  return (
    <Group>
      {!timeCondition.startTime && !timeCondition.endTime && "Always"}
      {timeCondition.startTime && !timeCondition.endTime && `Server time is ${timeCondition.startTime}`}
      {timeCondition.startTime && timeCondition.endTime && `Server time is between ${timeCondition.startTime} and ${timeCondition.endTime}`}
    </Group>
  )
}