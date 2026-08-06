import {
  Button,
  Collapse,
  Group,
  NumberInput,
  Select,
  Stack,
  Space,
  TextInput,
  SegmentedControl,
} from "@mantine/core";
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

type TimeConditionType = "Once" | "Between" | "Always";
type PhaseAnchorType = "window" | "clock" | "fixed" | null;

function resolveDefaultAnchorType(type: TimeConditionType): PhaseAnchorType {
  if (type === "Once") return null;
  if (type === "Always") return "fixed";
  return "window";
}

type TimeConditionFormValues = {
  startTime: string;
  endTime: string;
  repeatMode: "Continuous" | "Periodic";
  repeatInterval: number | "";
  repeatDuration: number | "";
  phaseAnchorType: PhaseAnchorType;
  phaseAnchorValue: string;
};

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
  const [timeConditionType, setTimeConditionType] = useState<TimeConditionType>("Between");

  const initialAnchorType = resolveDefaultAnchorType("Between");
  const conditionsQuery = useQuery({
    queryKey: ["conditions", automationId],
    queryFn: () => getConditionsAsync(automationId),
  });

  const addTimeMutation = useMutation({
    mutationFn: async (timeCondition: {
      startTime: string | null;
      endTime: string | null;
      repeatInterval: number | null;
      repeatDuration: number | null;
      phaseAnchorType: PhaseAnchorType | null;
      phaseAnchorValue: string | null;
    }) => {
      await addTimeConditionAsync(automationId, groupType, timeCondition);
    },
    onSettled: () => {
      conditionsQuery.refetch();
    },
  });

  const timeConditionForm = useForm<TimeConditionFormValues>({
    initialValues: {
      startTime: "",
      endTime: "",
      repeatMode: "Continuous",
      repeatInterval: "",
      repeatDuration: "",
      phaseAnchorType: initialAnchorType,
      phaseAnchorValue: "",
    },
    validate: {
      startTime: (value: string) =>
        timeConditionType !== "Always" && value === ""
          ? "Start time is required"
          : value === "" || regex.test(value)
            ? null
            : "Start time must be null or proper time format",
      endTime: (value: string) =>
        timeConditionType === "Between" && value === ""
          ? "End time is required"
          : value === "" || regex.test(value)
            ? null
            : "End time must be null or proper time format",
      repeatInterval: (value, values) => {
        if (values.repeatMode !== "Periodic" || timeConditionType === "Once") {
          return null;
        }
        if (value === "" || !Number.isInteger(value) || value <= 0) {
          return "Repeat interval must be a positive whole number of minutes";
        }
        return null;
      },
      repeatDuration: (value, values) => {
        if (values.repeatMode !== "Periodic" || timeConditionType === "Once") {
          return null;
        }
        if (value === "" || !Number.isInteger(value) || value <= 0) {
          return "Repeat duration must be a positive whole number of minutes";
        }
        if (typeof values.repeatInterval === "number" && value >= values.repeatInterval) {
          return "Repeat duration must be less than the interval";
        }
        return null;
      },
      phaseAnchorValue: (value, values) => {
        if (values.repeatMode !== "Periodic" || timeConditionType === "Once") {
          return null;
        }
        if (values.phaseAnchorType === "clock") {
          return regex.test(value) ? null : "Clock anchor must use HH:MM";
        }
        if (values.phaseAnchorType === "fixed") {
          return value !== "" && !Number.isNaN(new Date(value).getTime())
            ? null
            : "Fixed anchor must be a valid date and time";
        }
        return value === "" ? null : "This anchor type does not accept a value";
      },
    },
  });

  const repeatControlsVisible = timeConditionType !== "Once";
  const selectedAnchorType = timeConditionForm.values.phaseAnchorType;
   const anchorOptions = [
    { value: "clock", label: "Clock" },
    { value: "fixed", label: "Fixed time" },
    {
      value: "window",
      label: "Window start",
      disabled: timeConditionType !== "Between",
    },
  ];

  return (
    <Fragment>
      <form
        onSubmit={timeConditionForm.onSubmit(async (values) => {
          const startTime =
            timeConditionType === "Always" ? null : values.startTime || null;
          const endTime =
            timeConditionType === "Between" ? values.endTime || null : null;
          const repeatEnabled = values.repeatMode === "Periodic" && timeConditionType !== "Once";
          const phaseAnchorType = repeatEnabled ? values.phaseAnchorType : null;
          const phaseAnchorValue =
            !repeatEnabled || phaseAnchorType === null
              ? null
              : values.phaseAnchorValue || null;

          addTimeMutation.mutate({
            startTime,
            endTime,
            repeatInterval:
              repeatEnabled && typeof values.repeatInterval === "number"
                ? values.repeatInterval
                : null,
            repeatDuration:
              repeatEnabled && typeof values.repeatDuration === "number"
                ? values.repeatDuration
                : null,
            phaseAnchorType,
            phaseAnchorValue,
          });
          timeConditionForm.reset();
          setTimeConditionType("Between");
          toggleAddNewCondition();
        })}
      >
        <Stack>
          <SegmentedControl
            flex={1}
            value={timeConditionType}
            onChange={(value) => {
              const nextType = value as TimeConditionType;
              setTimeConditionType(nextType);
              if (nextType === "Always") {
                timeConditionForm.setValues({
                  ...timeConditionForm.values,
                  startTime: "",
                  endTime: "",
                  phaseAnchorType: "fixed",
                });
              }
              if (nextType === "Between") {
                timeConditionForm.setValues({
                  ...timeConditionForm.values,
                  phaseAnchorType: "window",
                });
              }
              if (nextType === "Once") {
                timeConditionForm.setValues({
                  ...timeConditionForm.values,
                  endTime: "",
                  repeatMode: "Continuous",
                  repeatInterval: "",
                  repeatDuration: "",
                  phaseAnchorType: null,
                  phaseAnchorValue: "",
                });
              }
            }}
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
          {repeatControlsVisible && (
            <Stack gap="sm">
              <SegmentedControl
                value={timeConditionForm.values.repeatMode}
                onChange={(value) => {
                  const nextMode = value as "Continuous" | "Periodic";
                  if (nextMode === "Continuous") {
                    timeConditionForm.setValues({
                      ...timeConditionForm.values,
                      repeatMode: nextMode,
                      repeatInterval: "",
                      repeatDuration: "",
                      phaseAnchorType: null,
                      phaseAnchorValue: "",
                    });
                    return;
                  }

                  timeConditionForm.setFieldValue("repeatMode", nextMode);
                  timeConditionForm.setFieldValue(
                    "phaseAnchorType",
                    resolveDefaultAnchorType(timeConditionType),
                  );
                }}
                data={["Continuous", "Periodic"]}
                color="blue"
              />
              <Collapse
                in={timeConditionForm.values.repeatMode === "Periodic"}
                transitionDuration={220}
                transitionTimingFunction="ease"
              >
                <Stack gap="sm" pt={4}>
                  <Group grow align="flex-start">
                    <NumberInput
                      min={1}
                      step={1}
                      allowDecimal={false}
                      clampBehavior="strict"
                      label="Period length"
                      suffix=" min"
                      value={timeConditionForm.values.repeatInterval}
                      onChange={(value) =>
                        timeConditionForm.setFieldValue(
                          "repeatInterval",
                          typeof value === "number" ? value : "",
                        )
                      }
                      error={timeConditionForm.errors["repeatInterval"]}
                    />
                    <NumberInput
                      min={1}
                      step={1}
                      allowDecimal={false}
                      clampBehavior="strict"
                      label="On duration"
                      suffix=" min"
                      value={timeConditionForm.values.repeatDuration}
                      onChange={(value) =>
                        timeConditionForm.setFieldValue(
                          "repeatDuration",
                          typeof value === "number" ? value : "",
                        )
                      }
                      error={timeConditionForm.errors["repeatDuration"]}
                    />
                  </Group>
                  <Select
                    allowDeselect={false}
                    label="Period anchor"
                    data={anchorOptions}
                    value={selectedAnchorType}
                    onChange={(value) => {
                      const nextValue = (value ?? null) as PhaseAnchorType;
                      timeConditionForm.setFieldValue("phaseAnchorType", nextValue);
                      if (nextValue !== "clock" && nextValue !== "fixed") {
                        timeConditionForm.setFieldValue("phaseAnchorValue", "");
                      }
                    }}
                  />
                  {selectedAnchorType === "clock" && (
                    <TimeInput
                      // label="Clock anchor"
                      value={timeConditionForm.values.phaseAnchorValue}
                      onChange={(value) =>
                        timeConditionForm.setFieldValue(
                          "phaseAnchorValue",
                          value.currentTarget.value,
                        )
                      }
                      error={timeConditionForm.errors["phaseAnchorValue"]}
                    />
                  )}
                  {selectedAnchorType === "fixed" && (
                    <TextInput
                      type="datetime-local"
                      // label="Fixed anchor"
                      value={timeConditionForm.values.phaseAnchorValue}
                      onChange={(value) =>
                        timeConditionForm.setFieldValue(
                          "phaseAnchorValue",
                          value.currentTarget.value,
                        )
                      }
                      error={timeConditionForm.errors["phaseAnchorValue"]}
                    />
                  )}
                </Stack>
              </Collapse>
            </Stack>
          )}
          <Group justify="center" mt="md">
            <Button type="submit">Save</Button>
          </Group>
        </Stack>
        <Space h={"12px"} />
      </form>
    </Fragment>
  );
}
