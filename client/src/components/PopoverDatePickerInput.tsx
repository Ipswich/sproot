import { DatePickerInput, type DatePickerInputProps } from "@mantine/dates";
import { useEffect, useRef, useState } from "react";

type Props = {
  value: [Date | null, Date | null] | null;
  onChange: (v: [Date | null, Date | null]) => void;
  placeholder?: string;
  valueFormat?: string;
  ignoreYear?: boolean;
  allowSingleDateInRange?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  clearable?: boolean;
  type?: "default" | "multiple" | "range";
  dropdownContent?: React.ReactNode;
};

export default function PopoverDatePickerInput({
  value,
  onChange,
  placeholder,
  valueFormat,
  ignoreYear,
  allowSingleDateInRange,
  size = "sm",
  clearable,
  type = "range",
}: Props) {
  const dpType: NonNullable<DatePickerInputProps["type"]> = type ?? "range";
  const [internalValue, setInternalValue] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const hasClearedRef = useRef(false);

  useEffect(() => {
    if (value === null && hasClearedRef.current) {
      setInternalValue([null, null]);
    }
    hasClearedRef.current = value === null;
  }, [value]);

  const displayValue: [Date | null, Date | null] =
    internalValue[0] !== null && internalValue[1] === null
      ? internalValue
      : (value ?? [null, null]);

  return (
    <DatePickerInput
      type={dpType}
      value={displayValue}
      onChange={(nextValue) => {
        setInternalValue(nextValue as [Date | null, Date | null]);
        onChange(nextValue as [Date | null, Date | null]);
      }}
      valueFormat={valueFormat ?? (ignoreYear ? "MMMM D" : "MMMM D, YYYY")}
      size={size}
      dropdownType="popover"
      label={placeholder}
      styles={{ input: { cursor: "pointer" } }}
      maxDate={new Date()}
      {...(placeholder ? { placeholder } : {})}
      {...(allowSingleDateInRange !== undefined
        ? { allowSingleDateInRange }
        : {})}
      {...(clearable !== undefined ? { clearable } : {})}
    />
  );
}
