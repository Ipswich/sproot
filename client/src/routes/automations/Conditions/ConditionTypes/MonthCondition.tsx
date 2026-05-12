import { ConditionGroupType } from "@sproot/automation/ConditionTypes";
import {
  addMonthConditionAsync,
  getConditionsAsync,
} from "../../../../requests/requests_v2";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "@mantine/form";
import { Fragment } from "react/jsx-runtime";
import { Group, Button, Stack, Space, Chip } from "@mantine/core";

export interface MonthConditionProps {
  toggleAddNewCondition: () => void;
  automationId: number;
  groupType: ConditionGroupType;
}

export default function MonthCondition({
  toggleAddNewCondition,
  automationId,
  groupType,
}: MonthConditionProps) {
  const conditionsQuery = useQuery({
    queryKey: ["conditions", automationId],
    queryFn: () => getConditionsAsync(automationId),
  });

  const addMonthMutation = useMutation({
    mutationFn: async (monthCondition: { months: number }) => {
      await addMonthConditionAsync(
        automationId,
        groupType,
        monthCondition.months,
      );
    },
    onSettled: () => {
      conditionsQuery.refetch();
    },
  });

  const monthConditionForm = useForm({
    initialValues: {
      january: false,
      february: false,
      march: false,
      april: false,
      may: false,
      june: false,
      july: false,
      august: false,
      september: false,
      october: false,
      november: false,
      december: false,
    },
    validate: {},
  });

  return (
    <Fragment>
      <form
        onSubmit={monthConditionForm.onSubmit(async (values) => {
          let months = 0;
          if (values.january) months += 1;
          if (values.february) months += 2;
          if (values.march) months += 4;
          if (values.april) months += 8;
          if (values.may) months += 16;
          if (values.june) months += 32;
          if (values.july) months += 64;
          if (values.august) months += 128;
          if (values.september) months += 256;
          if (values.october) months += 512;
          if (values.november) months += 1024;
          if (values.december) months += 2048;
          if (months != 0) {
            await addMonthMutation.mutateAsync({ months });
            monthConditionForm.reset();
          }

          toggleAddNewCondition();
        })}
      >
        <Stack>
          <Group justify="center" gap={"0px"}>
            <Chip
              size="xs"
              px="0px"
              checked={monthConditionForm.values["january"]}
              {...monthConditionForm.getInputProps("january")}
            >
              Jan
            </Chip>
            <Chip
              size="xs"
              px="0px"
              checked={monthConditionForm.values["february"]}
              {...monthConditionForm.getInputProps("february")}
            >
              Feb
            </Chip>
            <Chip
              size="xs"
              px="0px"
              checked={monthConditionForm.values["march"]}
              {...monthConditionForm.getInputProps("march")}
            >
              Mar
            </Chip>
            <Chip
              size="xs"
              px="0px"
              checked={monthConditionForm.values["april"]}
              {...monthConditionForm.getInputProps("april")}
            >
              Apr
            </Chip>
          </Group>
          <Group justify="center" gap={"0px"}>
            <Chip
              size="xs"
              px="0px"
              checked={monthConditionForm.values["may"]}
              {...monthConditionForm.getInputProps("may")}
            >
              May
            </Chip>
            <Chip
              size="xs"
              px="0px"
              checked={monthConditionForm.values["june"]}
              {...monthConditionForm.getInputProps("june")}
            >
              Jun
            </Chip>
            <Chip
              size="xs"
              px="0px"
              checked={monthConditionForm.values["july"]}
              {...monthConditionForm.getInputProps("july")}
            >
              Jul
            </Chip>
            <Chip
              size="xs"
              px="0px"
              checked={monthConditionForm.values["august"]}
              {...monthConditionForm.getInputProps("august")}
            >
              Aug
            </Chip>
          </Group>
          <Group justify="center" gap={"0px"}>
            <Chip
              size="xs"
              px="0px"
              checked={monthConditionForm.values["september"]}
              {...monthConditionForm.getInputProps("september")}
            >
              Sep
            </Chip>
            <Chip
              size="xs"
              px="0px"
              checked={monthConditionForm.values["october"]}
              {...monthConditionForm.getInputProps("october")}
            >
              Oct
            </Chip>
            <Chip
              size="xs"
              px="0px"
              checked={monthConditionForm.values["november"]}
              {...monthConditionForm.getInputProps("november")}
            >
              Nov
            </Chip>
            <Chip
              size="xs"
              px="0px"
              checked={monthConditionForm.values["december"]}
              {...monthConditionForm.getInputProps("december")}
            >
              Dec
            </Chip>
          </Group>
          <Group pt="xs" justify="center">
            <Button
              type="submit"
              disabled={Object.values(monthConditionForm.values).every(
                (month) => month == false,
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
