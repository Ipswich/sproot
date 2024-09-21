import { Button, Group, Select, Stack, Space, NumberInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Fragment } from "react/jsx-runtime";
import { addSensorConditionAsync, getConditionsAsync } from "../../../../requests/requests_v2";
import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ConditionTypes";
import { ReadingType } from "@sproot/sensors/ReadingType";

export interface SensorConditionProps {
  toggleAddNewCondition: () => void;
  automationId: number;
  groupType: ConditionGroupType;
  sensors: { id: number, units: Partial<Record<ReadingType, string>>, name: string }[];
}

export default function SensorCondition({ toggleAddNewCondition, automationId, groupType, sensors }: SensorConditionProps) {
  const condtionsQuery = useQuery({
    queryKey: ["conditions"],
    queryFn: () => getConditionsAsync(automationId),
  })
  const addSensorMutation = useMutation({
    mutationFn: async (sensorCondition: { operator: ConditionOperator, comparisonValue: number, sensorId: string, readingType: ReadingType }) => {
      await addSensorConditionAsync(automationId, groupType, sensorCondition.operator, sensorCondition.comparisonValue, sensorCondition.sensorId, sensorCondition.readingType);
    },
    onSettled: () => {
      condtionsQuery.refetch();
    },
  });


  const sensorConditionForm = useForm({
    initialValues: {
      sensorId: String(sensors[0]!.id),
      readingType: Object.keys(sensors[0]!.units)[0],
      operator: "less" as ConditionOperator,
      comparisonValue: 0,
    },

    validate: {
      sensorId: (value) =>
        value != null && value != undefined
          ? null
          : "Sensor Id must be provided",
      readingType: (value) =>
        value != null && value != undefined
          ? null
          : "Reading type must be provided",
      operator: (value) =>
        ["less", "lessOrEqual", "greater", "greaterOrEqual", "equal", "notEqual"].includes(value)
          ? null
          : "Invalid operator",
      comparisonValue: (value) =>
        value != null && value != undefined
          ? null
          : "Comparison value must be provided",
    },
  });

  return (
    <Fragment>
      <form
        onSubmit={sensorConditionForm.onSubmit(async (values) => {
          addSensorMutation.mutate({
            ...values,
            readingType: values.readingType as ReadingType,
          });
          sensorConditionForm.reset();
          toggleAddNewCondition();
        })}
      >

        <Stack>
          <Select
            flex={1}
            required
            allowDeselect={false}
            data={sensors.map((sensor) => { return { label: sensor.name, value: String(sensor.id) } })}
            {...sensorConditionForm.getInputProps("sensorId")}
            onChange={(value) => {
              sensorConditionForm.setFieldValue("sensorId", value!);
              const readingTypes = Object.keys(sensors.filter((sensor) => sensor.id == Number(value))[0]!.units);
              if (!readingTypes.includes(sensorConditionForm.values.readingType!)) {
                sensorConditionForm.setFieldValue("readingType", readingTypes[0]!);
              }
            }}
          />
          <Group>
            <Select
              flex={1}
              required
              allowDeselect={false}
              data={Object.keys(sensors.filter((sensor) => sensor.id == Number(sensorConditionForm.values.sensorId))[0]!.units).map((readingType) => { return { label: readingType.charAt(0).toUpperCase() + readingType.slice(1), value: readingType } })}
              {...sensorConditionForm.getInputProps("readingType")}
            />
            is
            <Select
              w={"30%"}
              required
              allowDeselect={false}
              data={[{
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
              }]}
              {...sensorConditionForm.getInputProps("operator")}
            />
          </Group>
          <Group justify="center">
            <NumberInput
              required
              w={"50%"}
              step={1}
              decimalScale={3}
              stepHoldDelay={500}
              stepHoldInterval={(t) => Math.max(1000 / t ** 2, 15)}
              suffix={sensors.filter((sensor) => sensor.id == Number(sensorConditionForm.values.sensorId))[0]!.units[sensorConditionForm.values.readingType as ReadingType]!}
              {...sensorConditionForm.getInputProps("comparisonValue")}
            />
          </Group>
          <Group justify="center">
            <Button justify="center" type="submit">Save</Button>
          </Group>
        </Stack>
        <Space h={"12px"} />
      </form>
    </Fragment>
  );
}