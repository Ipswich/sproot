import {
  Button,
  Group,
  Select,
  Stack,
  Space,
  NumberInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Fragment } from "react/jsx-runtime";
import {
  addSensorConditionAsync,
  getConditionsAsync,
} from "../../../../requests/requests_v2";
import {
  ConditionGroupType,
  ConditionOperator,
} from "@sproot/sproot-common/src/automation/ConditionTypes";
import {
  ReadingType,
  Units,
} from "@sproot/sproot-common/src/sensors/ReadingType";
import { convertFahrenheitToCelsius } from "@sproot/sproot-common/src/utility/DisplayFormats";

export interface SensorConditionProps {
  toggleAddNewCondition: () => void;
  automationId: number;
  groupType: ConditionGroupType;
  sensors: {
    id: number;
    units: Partial<Record<ReadingType, string>>;
    name: string;
  }[];
}

export default function SensorCondition({
  toggleAddNewCondition,
  automationId,
  groupType,
  sensors,
}: SensorConditionProps) {
  const condtionsQuery = useQuery({
    queryKey: ["conditions"],
    queryFn: () => getConditionsAsync(automationId),
  });
  const addSensorMutation = useMutation({
    mutationFn: async (sensorCondition: {
      operator: ConditionOperator;
      comparisonValue: number;
      comparisonLookback: number | null;
      sensorId: string;
      readingType: ReadingType;
    }) => {
      if (
        sensorCondition.readingType == ReadingType.temperature &&
        localStorage.getItem("temperature-useAlternateUnits") == "true"
      ) {
        sensorCondition.comparisonValue =
          convertFahrenheitToCelsius(sensorCondition.comparisonValue) ?? 0;
      }
      if (sensorCondition.comparisonLookback == 0) {
        sensorCondition.comparisonLookback = null;
      }

      await addSensorConditionAsync(
        automationId,
        groupType,
        sensorCondition.operator,
        sensorCondition.comparisonValue,
        sensorCondition.comparisonLookback,
        sensorCondition.sensorId,
        sensorCondition.readingType,
      );
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
      comparisonLookback: 0,
    },

    validate: {
      sensorId: (value: string) =>
        value != null && value != undefined
          ? null
          : "Sensor Id must be provided",
      readingType: (value: string | undefined) =>
        value != null && value != undefined
          ? null
          : "Reading type must be provided",
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
        value != null && value != undefined
          ? null
          : "Comparison value must be provided",
      comparisonLookback: (value: number) =>
        value != null && value >= 0 && value <= 1440
          ? null
          : "Comparison lookback must be between 0 and 1440 minutes",
    },
  });

  function getSuffix() {
    let suffix = sensors.filter(
      (sensor) => sensor.id == Number(sensorConditionForm.values.sensorId),
    )[0]!.units[sensorConditionForm.values.readingType as ReadingType]!;

    if (
      suffix == Units.temperature &&
      localStorage.getItem("temperature-useAlternateUnits") == "true"
    ) {
      suffix = "°F";
    }
    return suffix;
  }

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
            data={sensors.map((sensor) => {
              return { label: sensor.name, value: String(sensor.id) };
            })}
            {...sensorConditionForm.getInputProps("sensorId")}
            onChange={(value) => {
              sensorConditionForm.setFieldValue("sensorId", value!);
              const readingTypes = Object.keys(
                sensors.filter((sensor) => sensor.id == Number(value))[0]!
                  .units,
              );
              if (
                !readingTypes.includes(sensorConditionForm.values.readingType!)
              ) {
                sensorConditionForm.setFieldValue(
                  "readingType",
                  readingTypes[0]!,
                );
              }
            }}
          />
          <Group>
            <Select
              flex={1}
              required
              allowDeselect={false}
              data={Object.keys(
                sensors.filter(
                  (sensor) =>
                    sensor.id == Number(sensorConditionForm.values.sensorId),
                )[0]!.units,
              ).map((readingType) => {
                return {
                  label:
                    readingType.charAt(0).toUpperCase() + readingType.slice(1),
                  value: readingType,
                };
              })}
              {...sensorConditionForm.getInputProps("readingType")}
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
              {...sensorConditionForm.getInputProps("operator")}
            />
          </Group>
          <Group justify="center">
            <NumberInput
              required
              w={"40%"}
              step={1}
              decimalScale={3}
              stepHoldDelay={500}
              stepHoldInterval={(t) => Math.max(1000 / t ** 2, 15)}
              suffix={getSuffix()}
              {...sensorConditionForm.getInputProps("comparisonValue")}
            />
            for
            <NumberInput
              required
              w={"40%"}
              step={1}
              min={0}
              max={1440}
              suffix={
                sensorConditionForm.values.comparisonLookback === 1
                  ? " minute"
                  : " minutes"
              }
              {...sensorConditionForm.getInputProps("comparisonLookback")}
            />
          </Group>
          <Group justify="center">
            <Button justify="center" type="submit">
              Save
            </Button>
          </Group>
        </Stack>
        <Space h={"12px"} />
      </form>
    </Fragment>
  );
}
