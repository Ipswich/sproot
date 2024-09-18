import { Fragment } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { getConditionsAsync } from "../../../requests/requests_v2";
import { Button, Code, Collapse, Group, Space, Stack, Title, Text, rem } from "@mantine/core";
import { SDBTimeCondition } from "@sproot/database/SDBTimeCondition";
import { SDBSensorCondition } from "@sproot/database/SDBSensorCondition";
import { SDBOutputCondition } from "@sproot/database/SDBOutputCondition";
import { ConditionOperator } from "@sproot/automation/ConditionTypes";
import { useEffect } from "react";
import { useDisclosure } from "@mantine/hooks";

export interface ConditionsTableProps {
  automationId: number;
}

export default function ConditionsTable({ automationId }: ConditionsTableProps) {
  // console.log(automationId);
  const [addNewConditionOpened, { toggle: toggleAddNewCondition }] = useDisclosure(false);
  const conditionsQueryFn = useQuery({
    queryKey: ["conditions"],
    queryFn: () => getConditionsAsync(automationId),
  })

  useEffect(() => {
    conditionsQueryFn.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automationId])

  const allOfConditions = Object.values(conditionsQueryFn.data ?? {}).map((conditionType) => conditionType.allOf).flat();
  const anyOfConditions = Object.values(conditionsQueryFn.data ?? {}).map((conditionType) => conditionType.anyOf).flat();
  const oneOfConditions = Object.values(conditionsQueryFn.data ?? {}).map((conditionType) => conditionType.oneOf).flat();
  return (
    <Fragment>
      <Space h={16} />
      <Group justify="space-between">
        {allOfConditions.length == 0 && anyOfConditions.length == 0 && oneOfConditions.length == 0 ?
          <Button size="sm" w={rem(300)} onClick={toggleAddNewCondition}>Add Condition</Button> :
          <Fragment>
            <Title order={3}>Conditions</Title>
            <Button onClick={toggleAddNewCondition}>Add</Button>
          </Fragment>}
      </Group>
      <Collapse in={addNewConditionOpened} transitionDuration={300}>
        <Text>From Bulbapedia: Bulbasaur is a small, quadrupedal Pokémon that has blue-green skin with darker patches. It has red eyes with white pupils, pointed, ear-like structures on top of its head, and a short, blunt snout with a wide mouth. A pair of small, pointed teeth are visible in the upper jaw when its mouth is open. Each of its thick legs ends with three sharp claws. On Bulbasaur's back is a green plant bulb, which is grown from a seed planted there at birth. The bulb also conceals two slender, tentacle-like vines and provides it with energy through photosynthesis as well as from the nutrient-rich seeds contained within.</Text>
      </Collapse>
      <Space h={8} />
      {allOfConditions.length != 0 &&
        <Fragment>
          <Title order={4}>All Of</Title>
          <Stack ml={12}>
            {allOfConditions.map((condition) => mapToType(condition))}
          </Stack>
        </Fragment>}
      {anyOfConditions.length != 0 &&
        <Fragment>
          <Title order={4}>Any Of</Title>
          <Stack ml={12}>
            {anyOfConditions.map((condition) => mapToType(condition))}
          </Stack>
        </Fragment>}
      {oneOfConditions.length != 0 &&
        <Fragment>
          <Title order={4}>One Of</Title>
          <Stack ml={12}>
            {oneOfConditions.map((condition) => mapToType(condition))}
          </Stack>
        </Fragment>}
    </Fragment>
  )
}

function mapToType(condition: SDBSensorCondition | SDBOutputCondition | SDBTimeCondition) {
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

function SensorConditionRow(sensorCondition: SDBSensorCondition) {
  return (
    <Group>
      {sensorCondition.sensorName}[{sensorCondition.readingType}] is {mapOperatorToText(sensorCondition.operator)} {sensorCondition.comparisonValue}
    </Group>
  )
}

function OutputConditionRow(outputCondition: SDBOutputCondition) {
  return (
    <Group>{outputCondition.outputName} is {mapOperatorToText(outputCondition.operator)} {outputCondition.comparisonValue}%</Group>
  )
}

function TimeConditionRow(timeCondition: SDBTimeCondition) {
  return (
    <Group>
      StartTime: {timeCondition.startTime ?? "None"}, EndTime: {timeCondition.endTime ?? "None"}
    </Group>
  )
}