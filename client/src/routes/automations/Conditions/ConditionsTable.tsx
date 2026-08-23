import { Fragment } from "react/jsx-runtime";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  deleteOutputConditionAsync,
  deleteSensorConditionAsync,
  deleteTimeConditionAsync,
  deleteWeekdayConditionAsync,
  deleteMonthConditionAsync,
  deleteDateRangeConditionAsync,
  getConditionsAsync,
  getApplicationSettingsAsync,
} from "../../../requests/requests_v2";
import {
  Alert,
  Badge,
  Box,
  Button,
  Code,
  Collapse,
  Group,
  Paper,
  Space,
  Stack,
  ThemeIcon,
  Title,
  Text,
  LoadingOverlay,
} from "@mantine/core";
import { SDBTimeCondition } from "@sproot/database/SDBTimeCondition";
import { SDBSensorCondition } from "@sproot/database/SDBSensorCondition";
import { SDBOutputCondition } from "@sproot/database/SDBOutputCondition";
import { SDBWeekdayCondition } from "@sproot/database/SDBWeekdayCondition";
import { SDBMonthCondition } from "@sproot/database/SDBMonthCondition";
import { SDBDateRangeCondition } from "@sproot/database/SDBDateRangeCondition";
import { ConditionOperator } from "@sproot/automation/ConditionTypes";
import { ReadingType, Units } from "@sproot/common/sensors/ReadingType";
import { ReactNode, useEffect } from "react";
import { useDisclosure } from "@mantine/hooks";
import type { SolarLunarTimesMap } from "./ConditionTypes/useSolarLunarTimes";
import DeletablesTable from "../../common/DeletablesTable";
import NewConditionWidget from "./NewConditionWidget";
import { convertCelsiusToFahrenheit } from "@sproot/common/utility/DisplayFormats";
import {
  formatMilitaryTime,
  formatDateTime,
} from "@sproot/common/utility/TimeMethods";
import { getDynamicTimePointLabel } from "@sproot/common/automation/TimeConditionTimePoints";
import { useSolarLunarTimes } from "./ConditionTypes/useSolarLunarTimes";
import {
  IconLogicAnd,
  IconLogicOr,
  IconX,
  IconLogicXor,
  IconPlus,
} from "@tabler/icons-react";

export interface ConditionsTableProps {
  automationId: number;
  readOnly?: boolean;
}

export default function ConditionsTable({
  automationId,
  readOnly,
}: ConditionsTableProps) {
  const [addNewConditionOpened, { toggle: toggleAddNewCondition }] =
    useDisclosure(false);
  const settingsQuery = useQuery({
    queryKey: ["applicationSettings"],
    queryFn: () => getApplicationSettingsAsync(),
  });
  const solarLunarTimes = useSolarLunarTimes(
    settingsQuery.data?.["system.latitude"] ?? null,
    settingsQuery.data?.["system.longitude"] ?? null,
  );
  const conditionsQueryFn = useQuery({
    queryKey: ["conditions", automationId],
    queryFn: async () => {
      const data = await getConditionsAsync(automationId);
      return data;
    },
  });

  const deleteSensorConditionMutation = useMutation({
    mutationFn: async (conditionId: number) => {
      await deleteSensorConditionAsync(automationId, conditionId);
    },
    onSettled: () => {
      conditionsQueryFn.refetch();
    },
  });

  const deleteOutputConditionMutation = useMutation({
    mutationFn: async (conditionId: number) => {
      await deleteOutputConditionAsync(automationId, conditionId);
    },
    onSettled: () => {
      conditionsQueryFn.refetch();
    },
  });

  const deleteTimeConditionMutation = useMutation({
    mutationFn: async (conditionId: number) => {
      await deleteTimeConditionAsync(automationId, conditionId);
    },
    onSettled: () => {
      conditionsQueryFn.refetch();
    },
  });

  const deleteWeekdayConditionMutation = useMutation({
    mutationFn: async (conditionId: number) => {
      await deleteWeekdayConditionAsync(automationId, conditionId);
    },
    onSettled: () => {
      conditionsQueryFn.refetch();
    },
  });

  const deleteMonthConditionMutation = useMutation({
    mutationFn: async (conditionId: number) => {
      await deleteMonthConditionAsync(automationId, conditionId);
    },
    onSettled: () => {
      conditionsQueryFn.refetch();
    },
  });

  const deleteDateRangeConditionMutation = useMutation({
    mutationFn: async (conditionId: number) => {
      await deleteDateRangeConditionAsync(automationId, conditionId);
    },
    onSettled: () => {
      conditionsQueryFn.refetch();
    },
  });

  //local helper function
  function mapToDeleteConditionMutationAsync(
    condition:
      | SDBSensorCondition
      | SDBOutputCondition
      | SDBTimeCondition
      | SDBWeekdayCondition
      | SDBMonthCondition
      | SDBDateRangeCondition,
  ): (id: number) => Promise<void> {
    if ("sensorId" in condition && "readingType" in condition) {
      return async (conditionId: number) => {
        await deleteSensorConditionMutation.mutateAsync(conditionId);
      };
    } else if ("outputId" in condition) {
      return async (conditionId: number) => {
        await deleteOutputConditionMutation.mutateAsync(conditionId);
      };
    } else if ("startTime" in condition && "endTime" in condition) {
      return async (conditionId: number) => {
        await deleteTimeConditionMutation.mutateAsync(conditionId);
      };
    } else if ("weekdays" in condition) {
      return async (conditionId: number) => {
        await deleteWeekdayConditionMutation.mutateAsync(conditionId);
      };
    } else if ("months" in condition) {
      return async (conditionId: number) => {
        await deleteMonthConditionMutation.mutateAsync(conditionId);
      };
    } else if (
      "startMonth" in condition &&
      "startDate" in condition &&
      "endMonth" in condition &&
      "endDate" in condition
    ) {
      return async (conditionId: number) => {
        await deleteDateRangeConditionMutation.mutateAsync(conditionId);
      };
    }
    return async () => {};
  }

  useEffect(() => {
    conditionsQueryFn.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automationId]);
  const allOfConditions = Object.values(conditionsQueryFn.data ?? {})
    .map((conditionType) => conditionType.allOf)
    .flat();
  const anyOfConditions = Object.values(conditionsQueryFn.data ?? {})
    .map((conditionType) => conditionType.anyOf)
    .flat();
  const oneOfConditions = Object.values(conditionsQueryFn.data ?? {})
    .map((conditionType) => conditionType.oneOf)
    .flat();

  return (
    <Fragment>
      {conditionsQueryFn.isLoading ? (
        <LoadingOverlay
          style={{ height: "100%", pointerEvents: "none" }}
          visible={conditionsQueryFn.isLoading}
          zIndex={90}
          overlayProps={{
            backgroundOpacity: 0.92,
            color: "var(--mantine-color-body)",
          }}
          loaderProps={{ color: "teal", type: "bars", size: "lg" }}
        />
      ) : (
        <Stack gap="xs">
          {renderConditionGroup({
            title: "All Of",
            description: "Every condition must match.",
            color: "cyan",
            icon: <IconLogicAnd size={16} />,
            conditions: allOfConditions,
            solarLunarTimes,
            readOnly: readOnly ?? false,
            mapToDeleteConditionMutationAsync,
          })}
          {renderConditionGroup({
            title: "Any Of",
            description: "At least one condition must match.",
            color: "teal",
            icon: <IconLogicOr size={16} />,
            conditions: anyOfConditions,
            solarLunarTimes,
            readOnly: readOnly ?? false,
            mapToDeleteConditionMutationAsync,
          })}
          {renderConditionGroup({
            title: "One Of",
            description: "Exactly one condition must match.",
            color: "grape",
            icon: <IconLogicXor size={16} />,
            conditions: oneOfConditions,
            solarLunarTimes,
            readOnly: readOnly ?? false,
            mapToDeleteConditionMutationAsync,
          })}
          {allOfConditions.length == 0 &&
            anyOfConditions.length == 0 &&
            oneOfConditions.length == 0 && (
              <Alert color="gray" variant="light" title="No conditions yet">
                {readOnly
                  ? "This automation does not have any conditions configured."
                  : "Add a condition group below to start defining when this automation should run."}
              </Alert>
            )}
          {readOnly ? null : (
            <Paper withBorder radius="md" p="md">
              <Stack gap="sm">
                <Button
                  color="green"
                  variant="light"
                  size="sm"
                  fullWidth
                  leftSection={
                    <BuilderToggleIcon opened={addNewConditionOpened} />
                  }
                  onClick={() => {
                    toggleAddNewCondition();
                  }}
                >
                  {addNewConditionOpened
                    ? "Hide Condition Builder"
                    : "Show Condition Builder"}
                </Button>
                <Collapse
                  expanded={addNewConditionOpened}
                  transitionDuration={300}
                >
                  <Space h={12} />
                  <NewConditionWidget
                    automationId={automationId}
                    toggleAddNewCondition={toggleAddNewCondition}
                  />
                </Collapse>
              </Stack>
            </Paper>
          )}
        </Stack>
      )}
    </Fragment>
  );
}

function BuilderToggleIcon({ opened }: { opened: boolean }) {
  return (
    <Box style={{ position: "relative", width: 16, height: 16 }}>
      <IconPlus
        size={16}
        style={{
          position: "absolute",
          inset: 0,
          opacity: opened ? 0 : 1,
          transform: `rotate(${opened ? 90 : 0}deg) scale(${opened ? 0.7 : 1})`,
          transition: "opacity 300ms ease, transform 300ms ease",
        }}
      />
      <IconX
        size={16}
        style={{
          position: "absolute",
          inset: 0,
          opacity: opened ? 1 : 0,
          transform: `rotate(${opened ? 0 : -90}deg) scale(${opened ? 1 : 0.7})`,
          transition: "opacity 150ms ease, transform 150ms ease",
        }}
      />
    </Box>
  );
}

function renderConditionGroup({
  title,
  description,
  color,
  icon,
  conditions,
  solarLunarTimes,
  readOnly,
  mapToDeleteConditionMutationAsync,
}: {
  title: string;
  description: string;
  color: string;
  icon: ReactNode;
  conditions: (
    | SDBSensorCondition
    | SDBOutputCondition
    | SDBTimeCondition
    | SDBWeekdayCondition
    | SDBMonthCondition
    | SDBDateRangeCondition
  )[];
  solarLunarTimes: SolarLunarTimesMap | null;
  readOnly: boolean;
  mapToDeleteConditionMutationAsync: ConditionsTableDeleteMapper;
}) {
  if (conditions.length === 0) {
    return null;
  }

  return (
    <Paper withBorder radius="md" py="md" p="xs">
      <Stack gap="sm">
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon variant="light" color={color} radius="xl">
              {icon}
            </ThemeIcon>
            <div>
              <Title order={6}>{title}</Title>
              <Text size="sm" c="dimmed">
                {description}
              </Text>
            </div>
          </Group>
          <Badge variant="light" color={color} radius="sm">
            {conditions.length}
          </Badge>
        </Group>
        <DeletablesTable
          deletables={conditions
            .sort((a, b) => sortTypes(a, b))
            .map((condition) => ({
              displayLabel: mapToType(condition, solarLunarTimes),
              id: condition.id,
              deleteFn: mapToDeleteConditionMutationAsync(condition),
            }))}
          readOnly={readOnly}
        />
      </Stack>
    </Paper>
  );
}

type ConditionsTableDeleteMapper = (
  condition:
    | SDBSensorCondition
    | SDBOutputCondition
    | SDBTimeCondition
    | SDBWeekdayCondition
    | SDBMonthCondition
    | SDBDateRangeCondition,
) => (id: number) => Promise<void>;

function sortTypes(
  a:
    | SDBSensorCondition
    | SDBOutputCondition
    | SDBTimeCondition
    | SDBWeekdayCondition
    | SDBMonthCondition
    | SDBDateRangeCondition,
  b:
    | SDBSensorCondition
    | SDBOutputCondition
    | SDBTimeCondition
    | SDBWeekdayCondition
    | SDBMonthCondition
    | SDBDateRangeCondition,
) {
  const rankOf = (
    c:
      | SDBSensorCondition
      | SDBOutputCondition
      | SDBTimeCondition
      | SDBWeekdayCondition
      | SDBMonthCondition
      | SDBDateRangeCondition,
  ) => {
    if ("sensorId" in c && "readingType" in c) return 0; // Sensor
    if ("outputId" in c) return 1; // Output
    if ("months" in c) return 2; // Month
    if ("weekdays" in c) return 3; // Weekday
    if (
      "startMonth" in c &&
      "startDate" in c &&
      "endMonth" in c &&
      "endDate" in c
    )
      return 4; // DateRange
    if ("startTime" in c && "endTime" in c) return 5; // Time
    return 99;
  };

  const ra = rankOf(a);
  const rb = rankOf(b);
  if (ra !== rb) return ra - rb;

  const ida =
    (
      a as
        | SDBSensorCondition
        | SDBOutputCondition
        | SDBTimeCondition
        | SDBWeekdayCondition
        | SDBMonthCondition
        | SDBDateRangeCondition
    )?.id ?? 0;
  const idb =
    (
      b as
        | SDBSensorCondition
        | SDBOutputCondition
        | SDBTimeCondition
        | SDBWeekdayCondition
        | SDBMonthCondition
        | SDBDateRangeCondition
    )?.id ?? 0;
  return ida - idb;
}

function mapToType(
  condition:
    | SDBSensorCondition
    | SDBOutputCondition
    | SDBTimeCondition
    | SDBWeekdayCondition
    | SDBMonthCondition
    | SDBDateRangeCondition,
  solarLunarTimes: SolarLunarTimesMap | null,
): ReactNode {
  if ("sensorId" in condition && "readingType" in condition) {
    return <SensorConditionRow {...(condition as SDBSensorCondition)} />;
  } else if ("outputId" in condition) {
    return <OutputConditionRow {...(condition as SDBOutputCondition)} />;
  } else if ("startTime" in condition && "endTime" in condition) {
    return (
      <TimeConditionRow
        solarLunarTimes={solarLunarTimes}
        {...(condition as SDBTimeCondition)}
      />
    );
  } else if ("weekdays" in condition) {
    return <WeekdayConditionRow {...(condition as SDBWeekdayCondition)} />;
  } else if ("months" in condition) {
    return <MonthConditionRow {...(condition as SDBMonthCondition)} />;
  } else if (
    "startMonth" in condition &&
    "startDate" in condition &&
    "endMonth" in condition &&
    "endDate" in condition
  ) {
    return <DateRangeConditionRow {...(condition as SDBDateRangeCondition)} />;
  }
  return <></>;
}

function TimeConditionRow({
  solarLunarTimes,
  ...timeCondition
}: SDBTimeCondition & {
  solarLunarTimes: SolarLunarTimesMap | null;
}): ReactNode {
  const labelStart = formatTimeLabel(timeCondition.startTime);
  const labelEnd = formatTimeLabel(timeCondition.endTime);
  const timeStart = formatTimeDisplay(timeCondition.startTime, solarLunarTimes);
  const timeEnd = formatTimeDisplay(timeCondition.endTime, solarLunarTimes);

  const windowSummary =
    !labelStart && !labelEnd
      ? "Always"
      : labelStart && !labelEnd
        ? `At ${labelStart}`
        : `Between ${labelStart} and ${labelEnd}`;

  const timeSummary =
    timeStart && timeEnd
      ? `${timeStart} and ${timeEnd}`
      : (timeStart ?? timeEnd ?? null);

  const repeatSummary = formatRepeatSummary(timeCondition, solarLunarTimes);

  return (
    <Group gap={0}>
      <div>
        <Text ta="left">{windowSummary}</Text>
        {timeSummary && (
          <Text ta="left" size="sm" c="dimmed">
            ↳ {timeSummary}
          </Text>
        )}
        {repeatSummary && (
          <Text ta="left" size="sm" c="dimmed">
            ↳ {repeatSummary}
          </Text>
        )}
      </div>
    </Group>
  );
}

function formatTimeLabel(value: string | null): string | undefined {
  const dynamicLabel = getDynamicTimePointLabel(value);
  if (dynamicLabel) {
    return dynamicLabel;
  }
  return formatMilitaryTime(value);
}

function formatTimeDisplay(
  value: string | null,
  solarLunarTimes: SolarLunarTimesMap | null,
): string | null {
  const dynamicLabel = getDynamicTimePointLabel(value);
  if (dynamicLabel && solarLunarTimes) {
    const time = solarLunarTimes[value as keyof SolarLunarTimesMap] as
      Date | null | undefined;
    if (time) {
      return formatTime(time);
    }
  }
  return null;
}

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return formatMilitaryTime(`${hh}:${mm}`) ?? "";
}

function formatRepeatSummary(
  timeCondition: SDBTimeCondition,
  solarLunarTimes: SolarLunarTimesMap | null,
): ReactNode {
  if (
    timeCondition.repeatInterval == null ||
    timeCondition.repeatDuration == null
  ) {
    return null;
  }

  const anchorSummary = formatAnchorSummary(timeCondition, solarLunarTimes);

  return (
    <>
      {`Every ${timeCondition.repeatInterval} min • Active first ${timeCondition.repeatDuration} min${timeCondition.repeatDuration === 1 ? "" : "s"}`}
      {anchorSummary && (
        <Text ta="left" size="sm" c="dimmed">
          ↳ {anchorSummary}
        </Text>
      )}
    </>
  );
}

function formatAnchorSummary(
  timeCondition: SDBTimeCondition,
  solarLunarTimes: SolarLunarTimesMap | null,
): ReactNode {
  switch (timeCondition.phaseAnchorType) {
    case "epoch":
      return "Global reference";

    case "window":
      return "Period anchor: Window start";

    case "clock": {
      const dynamicLabel = getDynamicTimePointLabel(
        timeCondition.phaseAnchorValue,
      );
      if (dynamicLabel) {
        const time = solarLunarTimes?.[
          timeCondition.phaseAnchorValue as keyof SolarLunarTimesMap
        ] as Date | null | undefined;
        const timeStr = time ? formatTime(time) : null;
        if (timeStr) {
          return (
            <>
              Period anchor: {dynamicLabel}
              <Text span color="dimmed" size="sm">
                {" "}
                ({timeStr})
              </Text>
            </>
          );
        }
        return `Period anchor: ${dynamicLabel}`;
      }

      const formatted = formatMilitaryTime(timeCondition.phaseAnchorValue);
      return formatted ? `Period anchor: Daily at ${formatted}` : "";
    }

    case "fixed": {
      const formatted = formatDateTime(timeCondition.phaseAnchorValue);
      return formatted ? `Period anchor: ${formatted}` : "";
    }

    default:
      return "";
  }
}

function mapOperatorToText(operator: ConditionOperator) {
  switch (operator) {
    case "less":
      return (
        <Code mx={"-10px"} fw={700}>
          &lt;
        </Code>
      );
    case "lessOrEqual":
      return (
        <Code mx={"-10px"} fw={700}>
          &lt;=
        </Code>
      );
    case "greater":
      return (
        <Code mx={"-10px"} fw={700}>
          &gt;
        </Code>
      );
    case "greaterOrEqual":
      return (
        <Code mx={"-10px"} fw={700}>
          &gt;=
        </Code>
      );
    case "equal":
      return (
        <Code mx={"-10px"} fw={700}>
          =
        </Code>
      );
    case "notEqual":
      return (
        <Code mx={"-10px"} fw={700}>
          !=
        </Code>
      );
  }
}

function SensorConditionRow(sensorCondition: SDBSensorCondition): ReactNode {
  let comparisonValue = sensorCondition.comparisonValue;
  let readingType = String(Units[sensorCondition.readingType]);
  if (
    sensorCondition.readingType == ReadingType.temperature &&
    localStorage.getItem("temperature-useAlternateUnits") == "true"
  ) {
    comparisonValue = parseFloat(
      String(convertCelsiusToFahrenheit(comparisonValue) ?? 0),
    );
    readingType = "°F";
  }

  return (
    <Stack gap={4}>
      <Text fw={500} ta="left">
        {sensorCondition.sensorName}
      </Text>
      <Group gap="xs">
        <Text size="sm">is</Text>
        {mapOperatorToText(sensorCondition.operator)}
        <Text size="sm">
          {String(comparisonValue)}
          {readingType}
        </Text>
      </Group>
      {sensorCondition.comparisonLookback != null ? (
        <Text size="sm" c="dimmed" ta="left">
          Held for {sensorCondition.comparisonLookback}{" "}
          {sensorCondition.comparisonLookback === 1 ? "minute" : "minutes"}
        </Text>
      ) : null}
    </Stack>
  );
}

function OutputConditionRow(outputCondition: SDBOutputCondition): ReactNode {
  return (
    <Stack gap={4}>
      <Text fw={500} ta="left">
        {outputCondition.outputName}
      </Text>
      <Group gap="xs">
        <Text size="sm">is</Text>
        {mapOperatorToText(outputCondition.operator)}
        <Text size="sm">{String(outputCondition.comparisonValue)}%</Text>
      </Group>
      {outputCondition.comparisonLookback != null ? (
        <Text size="sm" c="dimmed" ta="left">
          Held for {outputCondition.comparisonLookback}{" "}
          {outputCondition.comparisonLookback === 1 ? "minute" : "minutes"}
        </Text>
      ) : null}
    </Stack>
  );
}

function WeekdayConditionRow(weekdayCondition: SDBWeekdayCondition): ReactNode {
  const bits = weekdayCondition.weekdays.toString(2).padStart(7, "0");
  const days = [];
  for (let i = bits.length - 1; i >= 0; i--) {
    if (bits[i] === "1") {
      days.push(
        [
          "Saturday",
          "Friday",
          "Thursday",
          "Wednesday",
          "Tuesday",
          "Monday",
          "Sunday",
        ][i],
      );
    }
  }
  let response: string | undefined = "";
  if (days.length == 1) {
    response = days[0];
  } else if (days.length == 2) {
    response = `${days[0]} or ${days[1]}`;
  } else {
    response = days.slice(0, -1).join(", ") + ", or " + days.slice(-1);
  }
  return <Text ta="left">{`Day is ${response}`}</Text>;
}

function MonthConditionRow(monthCondition: SDBMonthCondition): ReactNode {
  const bits = monthCondition.months.toString(2).padStart(12, "0");
  const months = [];
  for (let i = bits.length - 1; i >= 0; i--) {
    if (bits[i] === "1") {
      months.push(
        [
          "December",
          "November",
          "October",
          "September",
          "August",
          "July",
          "June",
          "May",
          "April",
          "March",
          "February",
          "January",
        ][i],
      );
    }
  }
  let response: string | undefined = "";
  if (months.length == 1) {
    response = months[0];
  } else if (months.length == 2) {
    response = `${months[0]} or ${months[1]}`;
  } else {
    response = months.slice(0, -1).join(", ") + ", or " + months.slice(-1);
  }
  return <Text ta="left">{`Month is ${response}`}</Text>;
}

function DateRangeConditionRow(dateRangeCondition: {
  startMonth: number;
  startDate: number;
  endMonth: number;
  endDate: number;
}): ReactNode {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
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
  const startMonth = months[dateRangeCondition.startMonth - 1];
  const endMonth = months[dateRangeCondition.endMonth - 1];
  return (
    <Text ta="left">
      {startMonth == endMonth &&
      dateRangeCondition.startDate == dateRangeCondition.endDate ? (
        <Fragment>
          Date is {startMonth} {dateRangeCondition.startDate}
          {getOrdinalSuffix(dateRangeCondition.startDate)}
        </Fragment>
      ) : (
        <Fragment>
          Date is between {startMonth} {dateRangeCondition.startDate}
          {getOrdinalSuffix(dateRangeCondition.startDate)} and {endMonth}{" "}
          {dateRangeCondition.endDate}
          {getOrdinalSuffix(dateRangeCondition.endDate)}
        </Fragment>
      )}
    </Text>
  );
}
