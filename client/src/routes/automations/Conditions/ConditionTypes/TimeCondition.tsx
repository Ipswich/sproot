import { Button, Group, Stack, Space, SegmentedControl } from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Fragment } from "react/jsx-runtime";
import {
  addTimeConditionAsync,
  getConditionsAsync,
} from "../../../../requests/requests_v2";
import { ConditionGroupType } from "@sproot/automation/ConditionTypes";
import { useState } from "react";

export interface TimeConditionProps {
  toggleAddNewCondition: () => void;
  automationId: number;
  groupType: ConditionGroupType;
}

export default function TimeCondition({
  toggleAddNewCondition,
  automationId,
  groupType,
}: TimeConditionProps) {
  const regex = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
  const [timeConditionType, setTimeConditionType] = useState("Between");
  const conditionsQuery = useQuery({
    queryKey: ["conditions", automationId],
    queryFn: () => getConditionsAsync(automationId),
  });

  const addTimeMutation = useMutation({
    mutationFn: async (timeCondition: {
      startTime: string | null;
      endTime: string | null;
    }) => {
      await addTimeConditionAsync(
        automationId,
        groupType,
        timeCondition.startTime || null,
        timeCondition.endTime || null,
      );
    },
    onSettled: () => {
      conditionsQuery.refetch();
    },
  });

  const timeConditionForm = useForm({
    initialValues: {
      startTime: "",
      endTime: "",
    },
    validate: {
      startTime: (value: string) =>
        value === "" || regex.test(value)
          ? null
          : "Start time must be null or proper time format",
      endTime: (value: string) =>
        value === "" || regex.test(value)
          ? null
          : "End time must be null or proper time format",
    },
  });

  return (
    <Fragment>
      <form
        onSubmit={timeConditionForm.onSubmit(async (values) => {
          if (timeConditionType === "Once") {
            timeConditionForm.setFieldValue("endTime", "");
          }
          if (timeConditionType === "Always") {
            timeConditionForm.setFieldValue("startTime", "");
            timeConditionForm.setFieldValue("endTime", "");
          }
          addTimeMutation.mutate(values);
          timeConditionForm.reset();
          toggleAddNewCondition();
        })}
      >
        <Stack>
          <SegmentedControl
            flex={1}
            value={timeConditionType}
            onChange={setTimeConditionType}
            data={["Once", "Between", "Always"]}
            color="blue"
          />
          <Group justify="space-around">
            {timeConditionType === "Once" && (
              <Fragment>
                <TimeInput
                  required
                  label="Run at"
                  onChange={(value) => {
                    timeConditionForm.setFieldValue(
                      "startTime",
                      value.currentTarget.value,
                    );
                  }}
                />
              </Fragment>
            )}
            {timeConditionType === "Between" && (
              <Fragment>
                <TimeInput
                  label="Start time"
                  required
                  value={timeConditionForm.values.startTime}
                  onChange={(value) => {
                    timeConditionForm.setFieldValue(
                      "startTime",
                      value.currentTarget.value,
                    );
                  }}
                />
                <TimeInput
                  label="End time"
                  required
                  value={timeConditionForm.values.endTime}
                  onChange={(value) =>
                    timeConditionForm.setFieldValue(
                      "endTime",
                      value.currentTarget.value,
                    )
                  }
                />
              </Fragment>
            )}
            {timeConditionType === "Always" && <Fragment />}
          </Group>
          <Group justify="center" mt="md">
            <Button type="submit">Save</Button>
          </Group>
        </Stack>
        <Space h={"12px"} />
      </form>
    </Fragment>
  );
}
