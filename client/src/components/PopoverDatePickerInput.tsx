import { ActionIcon, Box, CheckIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  DatePicker,
  DatePickerInput,
  PickerInputBase,
  TimeInput,
  type DatePickerInputProps,
} from "@mantine/dates";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";

function parseLocalDateString(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function normalizeDateValue(value: Date | string | null | undefined) {
  if (value == null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = parseLocalDateString(value) ?? new Date(value);
  return Number.isNaN(normalized.getTime()) ? null : normalized;
}

function normalizeRangeValue(
  value: [Date | string | null, Date | string | null] | null | undefined,
): [Date | null, Date | null] {
  if (!value) {
    return [null, null];
  }

  return [normalizeDateValue(value[0]), normalizeDateValue(value[1])];
}

function formatRangeValue(
  value: [Date | null, Date | null],
  format: string,
): string {
  const [start, end] = value;

  if (!start) {
    return "";
  }

  const formattedStart = dayjs(start).format(format);

  if (!end) {
    return `${formattedStart} - ...`;
  }

  return `${formattedStart} - ${dayjs(end).format(format)}`;
}

function getTimeValue(value: Date | null) {
  return value ? dayjs(value).format("HH:mm") : "";
}

function applyTimeValue(value: Date, timeValue: string) {
  if (!timeValue) {
    return value;
  }

  const [rawHours = "0", rawMinutes = "0"] = timeValue.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  return dayjs(value)
    .hour(Number.isNaN(hours) ? 0 : hours)
    .minute(Number.isNaN(minutes) ? 0 : minutes)
    .second(0)
    .millisecond(0)
    .toDate();
}

function preserveTime(nextValue: Date | null, previousValue: Date | null) {
  if (!nextValue || !previousValue) {
    return nextValue;
  }

  return applyTimeValue(nextValue, getTimeValue(previousValue));
}

function clampToMaxDate(value: Date | null, maxDate: Date) {
  if (!value) {
    return null;
  }

  return value.getTime() > maxDate.getTime() ? maxDate : value;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function normalizeEndEndTime(
  value: [Date | string | null, Date | string | null],
): [Date | null, Date | null] {
  const normalized = normalizeRangeValue(value);

  if (!normalized[1]) {
    return normalized;
  }

  const now = new Date();
  const isToday = isSameDay(normalized[1], now);
  const isMidnight =
    normalized[1].getHours() === 0 && normalized[1].getMinutes() === 0;

  const nextValue: [Date | null, Date | null] = [...normalized];

  if (isToday && isMidnight) {
    nextValue[1] = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
    );
  } else if (isMidnight) {
    nextValue[1] = new Date(
      normalized[1].getFullYear(),
      normalized[1].getMonth(),
      normalized[1].getDate(),
      23,
      59,
    );
  }

  return nextValue;
}

function getMaxTimeValue(value: Date | null, maxDate: Date) {
  if (!value || !dayjs(value).isSame(maxDate, "day")) {
    return undefined;
  }

  return dayjs(maxDate).format("HH:mm");
}

function getMaxTimeProps(value: Date | null, maxDate: Date) {
  const maxTime = getMaxTimeValue(value, maxDate);

  if (!maxTime) {
    return {};
  }

  return { maxTime };
}

type Props = {
  value: [Date | null, Date | null] | null;
  onChange: (v: [Date | null, Date | null]) => void;
  placeholder?: string;
  label?: string;
  valueFormat?: string;
  ignoreYear?: boolean;
  allowSingleDateInRange?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  clearable?: boolean;
  type?: "range";
  dropdownContent?: React.ReactNode;
  withTime?: boolean;
  commitOnClose?: boolean;
};

type NativeDateTimeRangePickerProps = {
  value: [Date | null, Date | null];
  onChange: (value: [Date | null, Date | null]) => void;
  placeholder?: string;
  label?: string;
  valueFormat?: string;
  allowSingleDateInRange?: boolean;
  size: NonNullable<Props["size"]>;
  clearable?: boolean;
  onDropdownClose: () => void;
  dropdownContent?: React.ReactNode;
};

function NativeDateTimeRangePicker({
  value,
  onChange,
  placeholder,
  label,
  valueFormat,
  allowSingleDateInRange,
  size,
  clearable,
  onDropdownClose,
  dropdownContent,
}: NativeDateTimeRangePickerProps) {
  const [dropdownOpened, dropdownHandlers] = useDisclosure(false);
  const maxDate = new Date();
  const displayFormat = valueFormat ?? "MMM D, 'YY h:mm A";
  const startTimeValue = getTimeValue(value[0]);
  const endTimeValue = getTimeValue(value[1]);

  const emitValue = (nextValue: [Date | null, Date | null]) => {
    const normalizedEnd = normalizeEndEndTime(nextValue);
    onChange([
      clampToMaxDate(normalizedEnd[0], maxDate),
      clampToMaxDate(normalizedEnd[1], maxDate),
    ]);
  };

  const handleDateChange = (
    nextValue: [Date | string | null, Date | string | null],
  ) => {
    const normalizedValue = normalizeRangeValue(nextValue);
    emitValue([
      preserveTime(normalizedValue[0], value[0]),
      preserveTime(normalizedValue[1], value[1]),
    ]);
  };

  const handleTimeChange = (index: 0 | 1, timeValue: string) => {
    const currentDate = value[index];

    if (!currentDate) {
      return;
    }

    const nextValue: [Date | null, Date | null] = [...value];
    nextValue[index] = applyTimeValue(currentDate, timeValue);
    emitValue(nextValue);
  };

  return (
    <PickerInputBase
      type="range"
      value={value}
      withTime
      size={size}
      dropdownType="popover"
      formattedValue={formatRangeValue(value, displayFormat)}
      dropdownOpened={dropdownOpened}
      dropdownHandlers={dropdownHandlers}
      onClear={() => emitValue([null, null])}
      shouldClear={value[0] !== null || value[1] !== null}
      onDropdownClose={onDropdownClose}
      __staticSelector="DateTimePicker"
      styles={{ input: { cursor: "pointer" } }}
      {...(label ? { label } : {})}
      {...(placeholder ? { placeholder } : {})}
      {...(clearable !== undefined ? { clearable } : {})}
    >
      <Box>
        <DatePicker
          type="range"
          value={value}
          onChange={(nextValue) => handleDateChange(nextValue)}
          size={size}
          maxDate={maxDate}
          __staticSelector="DateTimePicker"
          __stopPropagation
          {...(allowSingleDateInRange !== undefined
            ? { allowSingleDateInRange }
            : {})}
        />
        {/* <Text
          size="sm"
          mt="md"
          c="text"
          style={{
            lineHeight: 1.4,
            minHeight: "calc(var(--mantine-font-size-sm) * 1.4)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {formatRangeValue(value, displayFormat)}
        </Text> */}
        <Box
          mt="md"
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: "var(--mantine-spacing-md)",
          }}
        >
          <TimeInput
            value={startTimeValue}
            onChange={(event) => handleTimeChange(0, event.currentTarget.value)}
            size={size}
            disabled={!value[0]}
            style={{ flex: 1 }}
            data-mantine-stop-propagation
            {...getMaxTimeProps(value[0], maxDate)}
          />
          <TimeInput
            value={endTimeValue}
            onChange={(event) => handleTimeChange(1, event.currentTarget.value)}
            size={size}
            disabled={!value[1]}
            style={{ flex: 1 }}
            data-mantine-stop-propagation
            {...getMaxTimeProps(value[1], maxDate)}
          />
          <ActionIcon
            variant="default"
            size={`input-${size}`}
            onClick={() => dropdownHandlers.close()}
            data-mantine-stop-propagation
          >
            <CheckIcon size="30%" />
          </ActionIcon>
        </Box>
        {dropdownContent ? <Box mt="sm">{dropdownContent}</Box> : null}
      </Box>
    </PickerInputBase>
  );
}

export default function PopoverDatePickerInput({
  value,
  onChange,
  placeholder,
  label,
  valueFormat,
  ignoreYear,
  allowSingleDateInRange,
  size = "sm",
  clearable,
  type = "range",
  withTime,
  commitOnClose = false,
  dropdownContent,
}: Props) {
  const dpType: Extract<DatePickerInputProps["type"], "range"> =
    type ?? "range";
  const [internalValue, setInternalValue] = useState<
    [Date | null, Date | null]
  >(normalizeRangeValue(value));
  const internalValueRef = useRef<[Date | null, Date | null]>(internalValue);
  const hasClearedRef = useRef(false);

  useEffect(() => {
    if (value === null && hasClearedRef.current) {
      setInternalValue([null, null]);
      internalValueRef.current = [null, null];
      return;
    }

    const normalizedValue = normalizeRangeValue(value);
    setInternalValue(normalizedValue);
    internalValueRef.current = normalizedValue;
    hasClearedRef.current = value === null;
  }, [value]);

  const displayValue: [Date | null, Date | null] = internalValue;

  const commitInternalValue = (nextValue: [Date | null, Date | null]) => {
    onChange(nextValue);
  };

  const handleChange = (
    nextValue: [Date | string | null, Date | string | null],
  ) => {
    const normalizedValue = normalizeEndEndTime(nextValue);
    setInternalValue(normalizedValue);
    internalValueRef.current = normalizedValue;

    if (
      !commitOnClose ||
      (normalizedValue[0] === null && normalizedValue[1] === null)
    ) {
      commitInternalValue(normalizedValue);
    }
  };

  const handleDropdownClose = () => {
    if (commitOnClose) {
      commitInternalValue(internalValueRef.current);
    }
  };

  return (
    <>
      {withTime ? (
        <NativeDateTimeRangePicker
          value={displayValue}
          onChange={(nextValue) => handleChange(nextValue)}
          valueFormat={
            valueFormat ?? (ignoreYear ? "MMM D h:mm A" : "MMM D, 'YY h:mm A")
          }
          size={size}
          onDropdownClose={handleDropdownClose}
          dropdownContent={dropdownContent}
          {...(label ? { label } : {})}
          {...(placeholder ? { placeholder } : {})}
          {...(allowSingleDateInRange !== undefined
            ? { allowSingleDateInRange }
            : {})}
          {...(clearable !== undefined ? { clearable } : {})}
        />
      ) : (
        <DatePickerInput
          type={dpType}
          value={displayValue}
          onChange={(nextValue) => handleChange(nextValue)}
          valueFormat={valueFormat ?? (ignoreYear ? "MMM D" : "MMM D, 'YY")}
          size={size}
          dropdownType="popover"
          label={label}
          onDropdownClose={handleDropdownClose}
          styles={{ input: { cursor: "pointer" } }}
          maxDate={new Date()}
          {...(placeholder ? { placeholder } : {})}
          {...(allowSingleDateInRange !== undefined
            ? { allowSingleDateInRange }
            : {})}
          {...(clearable !== undefined ? { clearable } : {})}
        />
      )}
    </>
  );
}
