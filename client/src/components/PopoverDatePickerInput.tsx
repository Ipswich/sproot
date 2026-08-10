import {
  DatePickerInput,
  DateTimePicker,
  type DatePickerInputProps,
} from "@mantine/dates";
import { useEffect, useRef, useState } from "react";

function normalizeDateValue(value: Date | string | null | undefined) {
  if (value == null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = new Date(value);
  return Number.isNaN(normalized.getTime()) ? null : normalized;
}

function normalizeRangeValue(
  value:
    | [Date | string | null, Date | string | null]
    | null
    | undefined,
): [Date | null, Date | null] {
  if (!value) {
    return [null, null];
  }

  return [normalizeDateValue(value[0]), normalizeDateValue(value[1])];
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
};

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
}: Props) {
  const dpType: Extract<DatePickerInputProps["type"], "range"> =
    type ?? "range";
  const [internalValue, setInternalValue] = useState<
    [Date | null, Date | null]
  >(normalizeRangeValue(value));
  const hasClearedRef = useRef(false);

  useEffect(() => {
    if (value === null && hasClearedRef.current) {
      setInternalValue([null, null]);
      return;
    }

    setInternalValue(normalizeRangeValue(value));
    hasClearedRef.current = value === null;
  }, [value]);

  const displayValue: [Date | null, Date | null] =
    internalValue[0] !== null && internalValue[1] === null
      ? internalValue
      : normalizeRangeValue(value);

  const handleChange = (
    nextValue: [Date | string | null, Date | string | null],
  ) => {
    const normalizedValue = normalizeRangeValue(nextValue);
    setInternalValue(normalizedValue);
    onChange(normalizedValue);
  };

  return (
    <>
      {withTime ? (
        <DateTimePicker
          type={dpType}
          value={displayValue}
          onChange={(nextValue) => handleChange(nextValue)}
          valueFormat={
            valueFormat ??
            (ignoreYear ? "MMM D h:mm A" : "MMM D, 'YY h:mm A")
          }
          size={size}
          dropdownType="popover"
          label={label}
          styles={{ input: { cursor: "pointer" } }}
          maxDate={new Date()}
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
