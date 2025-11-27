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
    queryKey: ["conditions", automationId],
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
          if (weekdays != 0) {
            await addWeekdayMutation.mutateAsync({ weekdays });
            weekdayConditionForm.reset();
          }

          toggleAddNewCondition();
        })}
      >
        <Stack>
          <Group justify="center" gap={"0px"}>
            <Chip
              size="xs"
              px="0px"
              checked={weekdayConditionForm.values["sunday"]}
              {...weekdayConditionForm.getInputProps("sunday")}
            >
              Sun
            </Chip>
            <Chip
              size="xs"
              px="0px"
              checked={weekdayConditionForm.values["monday"]}
              {...weekdayConditionForm.getInputProps("monday")}
            >
              Mon
            </Chip>
            <Chip
              size="xs"
              px="0px"
              checked={weekdayConditionForm.values["tuesday"]}
              {...weekdayConditionForm.getInputProps("tuesday")}
            >
              Tue
            </Chip>
            <Chip
              size="xs"
              px="0px"
              checked={weekdayConditionForm.values["wednesday"]}
              {...weekdayConditionForm.getInputProps("wednesday")}
            >
              Wed
            </Chip>
          </Group>
          <Group justify="center" gap={"0px"}>
            <Chip
              size="xs"
              px="0px"
              checked={weekdayConditionForm.values["thursday"]}
              {...weekdayConditionForm.getInputProps("thursday")}
            >
              Thu
            </Chip>
            <Chip
              size="xs"
              px="0px"
              checked={weekdayConditionForm.values["friday"]}
              {...weekdayConditionForm.getInputProps("friday")}
            >
              Fri
            </Chip>
            <Chip
              size="xs"
              px="0px"
              checked={weekdayConditionForm.values["saturday"]}
              {...weekdayConditionForm.getInputProps("saturday")}
            >
              Sat
            </Chip>
          </Group>
          <Group pt="xs" justify="center">
            <Button
              type="submit"
              disabled={Object.values(weekdayConditionForm.values).every(
                (day) => day == false,
              )}
            >
              Save
            </Button>
          </Group>
        </Stack>
        <Space h={"12px"} />
      </form>
    </Fragment>
  );
}
