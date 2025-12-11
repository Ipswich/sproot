import { ConditionGroupType } from "@sproot/automation/ConditionTypes";
import {
  addDateRangeConditionAsync,
  getConditionsAsync,
} from "../../../../requests/requests_v2";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "@mantine/form";
import { Fragment } from "react/jsx-runtime";
import { Group, Button, Stack, Space, Select } from "@mantine/core";
import { useEffect } from "react";

export interface DateRangeConditionProps {
  toggleAddNewCondition: () => void;
  automationId: number;
  groupType: ConditionGroupType;
}

export default function DateRangeCondition({
  toggleAddNewCondition,
  automationId,
  groupType,
}: DateRangeConditionProps) {
  const conditionsQuery = useQuery({
    queryKey: ["conditions", automationId],
    queryFn: () => getConditionsAsync(automationId),
  });

  const addMonthMutation = useMutation({
    mutationFn: async (dateRangeCondition: {
      startMonth: number;
      startDate: number;
      endMonth: number;
      endDate: number;
    }) => {
      await addDateRangeConditionAsync(
        automationId,
        groupType,
        dateRangeCondition.startMonth,
        dateRangeCondition.startDate,
        dateRangeCondition.endMonth,
        dateRangeCondition.endDate,
      );
    },
    onSettled: () => {
      conditionsQuery.refetch();
    },
  });

  const dateRangeConditionForm = useForm({
    initialValues: {
      startMonth: undefined as string | undefined,
      startDate: undefined as string | undefined,
      endMonth: undefined as string | undefined,
      endDate: undefined as string | undefined,
    },
    validate: {
      startMonth: (value: string | undefined) => {
        if (value == null) {
          return "Start month is required";
        } else if (
          isNaN(parseInt(value)) ||
          parseInt(value) < 1 ||
          parseInt(value) > 12
        ) {
          return "Start month must be between 1 and 12";
        }
        return null;
      },
      startDate: (
        value: string | undefined,
        formValues: {
          startMonth: string | undefined;
          startDate: string | undefined;
          endMonth: string | undefined;
          endDate: string | undefined;
        },
      ) => {
        if (value == null) {
          return "Start date is required";
        }
        const max = getDaysInMonth(parseInt(formValues.startMonth ?? ""));
        if (
          isNaN(parseInt(value)) ||
          parseInt(value) < 1 ||
          parseInt(value) > max
        ) {
          return `Start date must be between 1 and ${max}`;
        }
        return null;
      },
      endMonth: (value: string | undefined) => {
        if (value == null) {
          return "Start month is required";
        } else if (
          isNaN(parseInt(value)) ||
          parseInt(value) < 1 ||
          parseInt(value) > 12
        ) {
          return "Start month must be between 1 and 12";
        }
        return null;
      },
      endDate: (
        value: string | undefined,
        formValues: {
          startMonth: string | undefined;
          startDate: string | undefined;
          endMonth: string | undefined;
          endDate: string | undefined;
        },
      ) => {
        if (value == null) {
          return "Start date is required";
        }
        const max = getDaysInMonth(parseInt(formValues.endMonth ?? ""));
        if (
          isNaN(parseInt(value)) ||
          parseInt(value) < 1 ||
          parseInt(value) > max
        ) {
          return `Start date must be between 1 and ${max}`;
        }
        return null;
      },
    },
  });

  function getDaysInMonth(month?: number): number {
    return (
      [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][(month ?? 1) - 1] ?? 31
    );
  }

  const monthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const startMonth = Number(dateRangeConditionForm.values.startMonth);
  const endMonth = Number(dateRangeConditionForm.values.endMonth);

  const startDayOptions = Array.from(
    { length: getDaysInMonth(startMonth) },
    (_, i) => ({
      value: (i + 1).toString(),
      label: `${i + 1}${getOrdinalSuffix(i + 1)}`,
    }),
  );

  const endDayOptions = Array.from(
    { length: getDaysInMonth(endMonth) },
    (_, i) => ({
      value: (i + 1).toString(),
      label: `${i + 1}${getOrdinalSuffix(i + 1)}`,
    }),
  );

  useEffect(() => {
    const max = getDaysInMonth(startMonth);
    if (
      dateRangeConditionForm.values.startDate &&
      parseInt(dateRangeConditionForm.values.startDate) > max
    ) {
      dateRangeConditionForm.setFieldValue("startDate", max.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMonth]);

  useEffect(() => {
    const max = getDaysInMonth(endMonth);
    if (
      dateRangeConditionForm.values.endDate &&
      parseInt(dateRangeConditionForm.values.endDate) > max
    ) {
      dateRangeConditionForm.setFieldValue("endDate", max.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endMonth]);

  return (
    <Fragment>
      <form
        onSubmit={dateRangeConditionForm.onSubmit(async (values) => {
          if (
            values.startMonth != null &&
            values.startDate != null &&
            values.endMonth != null &&
            values.endDate != null
          ) {
            await addMonthMutation.mutateAsync({
              startMonth: parseInt(values.startMonth),
              startDate: parseInt(values.startDate),
              endMonth: parseInt(values.endMonth),
              endDate: parseInt(values.endDate),
            });
            dateRangeConditionForm.reset();
          }

          toggleAddNewCondition();
        })}
      >
        <Stack>
          <Group justify="space-between" gap={"0px"}>
            <Stack w={"45%"}>
              <Select
                required
                data={monthOptions}
                label="Start Month"
                allowDeselect={false}
                {...dateRangeConditionForm.getInputProps("startMonth")}
              />
              <Select
                required
                w={"60%"}
                key={startMonth}
                data={startDayOptions}
                label="Start Date"
                allowDeselect={false}
                {...dateRangeConditionForm.getInputProps("startDate")}
              />
            </Stack>
            <Stack w={"45%"}>
              <Select
                required
                data={monthOptions}
                label="End Month"
                allowDeselect={false}
                {...dateRangeConditionForm.getInputProps("endMonth")}
              />
              <Select
                required
                w={"60%"}
                key={endMonth}
                data={endDayOptions}
                label="End Date"
                allowDeselect={false}
                {...dateRangeConditionForm.getInputProps("endDate")}
              />
            </Stack>
          </Group>
          <Group pt="xs" justify="center">
            <Button
              type="submit"
              disabled={Object.values(dateRangeConditionForm.values).some(
                (value) => value == null,
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

function getOrdinalSuffix(day: number) {
  if (day % 10 == 1 && day != 11) {
    return "st";
  } else if (day % 10 == 2 && day != 12) {
    return "nd";
  } else if (day % 10 == 3 && day != 13) {
    return "rd";
  } else {
    return "th";
  }
}
