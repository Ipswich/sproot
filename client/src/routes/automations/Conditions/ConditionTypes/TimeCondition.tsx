import {
  Alert,
  Button,
  Collapse,
  Group,
  NumberInput,
  Select,
  SegmentedControl,
  Stack,
  Space,
  Text,
  TextInput,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ConditionGroupType } from "@sproot/automation/ConditionTypes";
import type { DynamicTimePoint } from "@sproot/common/automation/TimeConditionTimePoints";
import {
  DYNAMIC_TIME_POINT_LABELS,
  DYNAMIC_TIME_POINT_VALUES,
  isDynamicTimePoint,
} from "@sproot/common/automation/TimeConditionTimePoints";
import { ReactNode, useMemo, useState } from "react";
import {
  addTimeConditionAsync,
  getApplicationSettingsAsync,
  getConditionsAsync,
} from "../../../../requests/requests_v2";
import { useSolarLunarTimes } from "./useSolarLunarTimes";
import type { SolarLunarTimesMap } from "./useSolarLunarTimes";

type TimeConditionType = "Once" | "Between" | "Always";
type PhaseAnchorType = "window" | "clock" | "fixed" | null;
type TimeExpressionMode = "clock" | "dynamic";

function resolveDefaultAnchorType(type: TimeConditionType): PhaseAnchorType {
  if (type === "Once") return null;
  if (type === "Always") return "clock";
  return "window";
}

function resolveExpressionMode(value: string): TimeExpressionMode {
  return isDynamicTimePoint(value) ? "dynamic" : "clock";
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
  const [timeConditionType, setTimeConditionType] =
    useState<TimeConditionType>("Between");
  const [startTimeMode, setStartTimeMode] =
    useState<TimeExpressionMode>("clock");
  const [endTimeMode, setEndTimeMode] = useState<TimeExpressionMode>("clock");
  const [phaseAnchorMode, setPhaseAnchorMode] =
    useState<TimeExpressionMode>("clock");

  const initialAnchorType = resolveDefaultAnchorType("Between");
  const conditionsQuery = useQuery({
    queryKey: ["conditions", automationId],
    queryFn: () => getConditionsAsync(automationId),
  });
  const settingsQuery = useQuery({
    queryKey: ["applicationSettings"],
    queryFn: () => getApplicationSettingsAsync(),
  });

  const hasDynamicTimeSupport =
    typeof settingsQuery.data?.["system.latitude"] === "string" &&
    typeof settingsQuery.data?.["system.longitude"] === "string";

  const solarLunarTimes = useSolarLunarTimes(
    settingsQuery.data?.["system.latitude"] ?? null,
    settingsQuery.data?.["system.longitude"] ?? null,
  );

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
          : value === "" || regex.test(value) || isDynamicTimePoint(value)
            ? null
            : "Start time must be HH:MM or a supported solar/lunar point",
      endTime: (value: string) =>
        timeConditionType === "Between" && value === ""
          ? "End time is required"
          : value === "" || regex.test(value) || isDynamicTimePoint(value)
            ? null
            : "End time must be HH:MM or a supported solar/lunar point",
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
        if (
          typeof values.repeatInterval === "number" &&
          value >= values.repeatInterval
        ) {
          return "Repeat duration must be less than the interval";
        }
        return null;
      },
      phaseAnchorValue: (value, values) => {
        if (values.repeatMode !== "Periodic" || timeConditionType === "Once") {
          return null;
        }
        if (values.phaseAnchorType === "clock") {
          return regex.test(value) || isDynamicTimePoint(value)
            ? null
            : "Anchor must use HH:MM or a supported solar/lunar point";
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
    { value: "clock", label: "Time point" },
    { value: "fixed", label: "Fixed time" },
    {
      value: "window",
      label: "Window start",
      disabled: timeConditionType !== "Between",
    },
  ];

  return (
    <form
      onSubmit={timeConditionForm.onSubmit(async (values) => {
        const startTime =
          timeConditionType === "Always" ? null : values.startTime || null;
        const endTime =
          timeConditionType === "Between" ? values.endTime || null : null;
        const repeatEnabled =
          values.repeatMode === "Periodic" && timeConditionType !== "Once";
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
        setStartTimeMode("clock");
        setEndTimeMode("clock");
        setPhaseAnchorMode("clock");
        toggleAddNewCondition();
      })}
    >
      <Stack>
        {!hasDynamicTimeSupport && (
          <Alert color="yellow" title="Dynamic time points are unavailable">
            Set latitude and longitude in System Settings to unlock solar and
            lunar events.
          </Alert>
        )}
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
                phaseAnchorType: "clock",
              });
              setStartTimeMode("clock");
              setEndTimeMode("clock");
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
              setEndTimeMode("clock");
            }
          }}
          data={["Once", "Between", "Always"]}
          color="blue"
        />
        <Stack>
          <Collapse
            in={timeConditionType === "Between"}
            transitionDuration={220}
            transitionTimingFunction="ease"
          >
            <TimeExpressionField
              label="Start time"
              required
              value={timeConditionForm.values.startTime}
              mode={startTimeMode}
              dynamicEnabled={hasDynamicTimeSupport}
              error={timeConditionForm.errors["startTime"]}
              onModeChange={(mode) => {
                setStartTimeMode(mode);
                timeConditionForm.setFieldValue("startTime", "");
              }}
              onChange={(value) => {
                timeConditionForm.setFieldValue("startTime", value);
              }}
              timeSuffixes={solarLunarTimes}
            />
            <TimeExpressionField
              label="End time"
              required
              value={timeConditionForm.values.endTime}
              mode={endTimeMode}
              dynamicEnabled={hasDynamicTimeSupport}
              error={timeConditionForm.errors["endTime"]}
              onModeChange={(mode) => {
                setEndTimeMode(mode);
                timeConditionForm.setFieldValue("endTime", "");
              }}
              onChange={(value) => {
                timeConditionForm.setFieldValue("endTime", value);
              }}
              timeSuffixes={solarLunarTimes}
            />
          </Collapse>
          <Collapse
            in={timeConditionType === "Once"}
            transitionDuration={220}
            transitionTimingFunction="ease"
          >
            <TimeExpressionField
              label="Run at"
              required
              value={timeConditionForm.values.startTime}
              mode={startTimeMode}
              dynamicEnabled={hasDynamicTimeSupport}
              error={timeConditionForm.errors["startTime"]}
              onModeChange={(mode) => {
                setStartTimeMode(mode);
                timeConditionForm.setFieldValue("startTime", "");
              }}
              onChange={(value) => {
                timeConditionForm.setFieldValue("startTime", value);
              }}
              timeSuffixes={solarLunarTimes}
            />
          </Collapse>
        </Stack>
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
                    timeConditionForm.setFieldValue(
                      "phaseAnchorType",
                      nextValue,
                    );
                    if (nextValue !== "clock" && nextValue !== "fixed") {
                      timeConditionForm.setFieldValue("phaseAnchorValue", "");
                    }
                  }}
                />
                {selectedAnchorType === "clock" && (
                  <TimeExpressionField
                    label="Period anchor"
                    value={timeConditionForm.values.phaseAnchorValue}
                    mode={phaseAnchorMode}
                    dynamicEnabled={hasDynamicTimeSupport}
                    error={timeConditionForm.errors["phaseAnchorValue"]}
                    onModeChange={(mode) => {
                      setPhaseAnchorMode(mode);
                      timeConditionForm.setFieldValue("phaseAnchorValue", "");
                    }}
                    onChange={(value) =>
                      timeConditionForm.setFieldValue("phaseAnchorValue", value)
                    }
                    timeSuffixes={solarLunarTimes}
                  />
                )}
                {selectedAnchorType === "fixed" && (
                  <TextInput
                    type="datetime-local"
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
  );
}

type TimeExpressionFieldProps = {
  label: string;
  value: string;
  mode: TimeExpressionMode;
  onChange: (value: string) => void;
  onModeChange: (mode: TimeExpressionMode) => void;
  error?: ReactNode;
  required?: boolean;
  dynamicEnabled: boolean;
  timeSuffixes: SolarLunarTimesMap | null;
};

function TimeExpressionField({
  label,
  value,
  mode,
  onChange,
  onModeChange,
  error,
  required,
  dynamicEnabled,
  timeSuffixes,
}: TimeExpressionFieldProps) {
  const timeValues = useMemo(() => {
    if (!timeSuffixes) {
      return {} as Record<DynamicTimePoint, string | null>;
    }
    const result: Record<DynamicTimePoint, string | null> = {} as Record<
      DynamicTimePoint,
      string | null
    >;
    for (const point of DYNAMIC_TIME_POINT_VALUES) {
      const time = timeSuffixes[point];
      result[point] = time ? formatTime(time) : null;
    }
    return result;
  }, [timeSuffixes]);

  const timePointOptions = useMemo(() => {
    return DYNAMIC_TIME_POINT_VALUES.map((value) => ({
      value,
      label: DYNAMIC_TIME_POINT_LABELS[value],
    }));
  }, []);

  return (
    <Stack gap="xs">
      <SegmentedControl
        fullWidth
        value={mode}
        onChange={(nextMode) => {
          if (
            nextMode === "clock" ||
            (nextMode === "dynamic" && dynamicEnabled)
          ) {
            onModeChange(nextMode as TimeExpressionMode);
          }
        }}
        data={[
          { label: "Clock", value: "clock" },
          { label: "Solar/Lunar", value: "dynamic", disabled: !dynamicEnabled },
        ]}
      />
      {mode === "clock" ? (
        <TimeInput
          required={required ?? false}
          label={label}
          value={mode === resolveExpressionMode(value) ? value : ""}
          onChange={(event) => onChange(event.currentTarget.value)}
          error={error}
        />
      ) : (
        <Select
          required={required ?? false}
          searchable
          allowDeselect={false}
          label={label}
          placeholder="Select a solar or lunar event"
          data={timePointOptions}
          value={mode === resolveExpressionMode(value) ? value : null}
          onChange={(nextValue) => onChange(nextValue ?? "")}
          error={error}
          renderOption={({ option }) => {
            const time = timeValues[option.value as DynamicTimePoint] ?? null;
            return (
              <span>
                {option.label}
                {time ? (
                  <Text span color="dimmed" size="sm">
                    {" "}
                    ({time})
                  </Text>
                ) : null}
              </span>
            );
          }}
        />
      )}
    </Stack>
  );
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
