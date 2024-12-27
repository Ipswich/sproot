import { ConditionGroupType } from "@sproot/automation/ConditionTypes";
import {
  addWeekdayConditionAsync,
  getConditionsAsync,
} from "../../../../requests/requests_v2";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "@mantine/form";
import { Fragment } from "react/jsx-runtime";
import { Group, Button, Stack, Space, Chip } from "@mantine/core";

export interface WeekdayConditionProps {
  toggleAddNewCondition: () => void;
  automationId: number;
  groupType: ConditionGroupType;
}

export default function WeekdayCondition({
  toggleAddNewCondition,
  automationId,
  groupType,
}: WeekdayConditionProps) {
  const conditionsQuery = useQuery({
    queryKey: ["conditions"],
    queryFn: () => getConditionsAsync(automationId),
  });

  const addWeekdayMutation = useMutation({
    mutationFn: async (weekdayCondition: { weekdays: number }) => {
      await addWeekdayConditionAsync(
        automationId,
        groupType,
        weekdayCondition.weekdays,
      );
    },
    onSettled: () => {
      conditionsQuery.refetch();
    },
  });

  const weekdayConditionForm = useForm({
    initialValues: {
      sunday: false,
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
    },
    validate: {},
  });

  return (
    <Fragment>
      <form
        onSubmit={weekdayConditionForm.onSubmit(async (values) => {
          let weekdays = 0;
          if (values.sunday) weekdays += 1;
          if (values.monday) weekdays += 2;
          if (values.tuesday) weekdays += 4;
          if (values.wednesday) weekdays += 8;
          if (values.thursday) weekdays += 16;
          if (values.friday) weekdays += 32;
          if (values.saturday) weekdays += 64;
          await addWeekdayMutation.mutateAsync({ weekdays });

          weekdayConditionForm.reset();
          toggleAddNewCondition();
        })}
      >
        <Stack>
          <Group justify="center" gap={"0px"}>
            <Chip
              size="xs"
              px="0px"
              onChange={() => {
                weekdayConditionForm.setFieldValue(
                  "sunday",
                  !weekdayConditionForm.getValues()["sunday"],
                );
              }}
            >
              Sun
            </Chip>
            <Chip
              size="xs"
              px="0px"
              onChange={() => {
                weekdayConditionForm.setFieldValue(
                  "monday",
                  !weekdayConditionForm.getValues()["monday"],
                );
              }}
            >
              Mon
            </Chip>
            <Chip
              size="xs"
              px="0px"
              onChange={() => {
                weekdayConditionForm.setFieldValue(
                  "tuesday",
                  !weekdayConditionForm.getValues()["tuesday"],
                );
              }}
            >
              Tue
            </Chip>
            <Chip
              size="xs"
              px="0px"
              onChange={() => {
                weekdayConditionForm.setFieldValue(
                  "wednesday",
                  !weekdayConditionForm.getValues()["wednesday"],
                );
              }}
            >
              Wed
            </Chip>
          </Group>
          <Group justify="center" gap={"0px"}>
            <Chip
              size="xs"
              px="0px"
              onChange={() => {
                weekdayConditionForm.setFieldValue(
                  "thursday",
                  !weekdayConditionForm.getValues()["thursday"],
                );
              }}
            >
              Thu
            </Chip>
            <Chip
              size="xs"
              px="0px"
              onChange={() => {
                weekdayConditionForm.setFieldValue(
                  "friday",
                  !weekdayConditionForm.getValues()["friday"],
                );
              }}
            >
              Fri
            </Chip>
            <Chip
              size="xs"
              px="0px"
              onChange={() => {
                weekdayConditionForm.setFieldValue(
                  "saturday",
                  !weekdayConditionForm.getValues()["saturday"],
                );
              }}
            >
              Sat
            </Chip>
          </Group>
          <Group pt="xs" justify="center">
            <Button type="submit">Save</Button>
          </Group>
        </Stack>
        <Space h={"12px"} />
      </form>
    </Fragment>
  );
}
