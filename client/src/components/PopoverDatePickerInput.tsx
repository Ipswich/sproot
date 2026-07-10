import { DatePickerInput, type DatePickerInputProps } from "@mantine/dates";

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

  return (
    <DatePickerInput
      type={dpType}
      value={value}
      onChange={(nextValue) =>
        onChange(nextValue as [Date | null, Date | null])
      }
      valueFormat={valueFormat ?? (ignoreYear ? "MMMM D" : "MMMM D, YYYY")}
      size={size}
      dropdownType="popover"
      label={placeholder}
      styles={{ input: { cursor: "pointer" } }}
      {...(placeholder ? { placeholder } : {})}
      {...(allowSingleDateInRange !== undefined
        ? { allowSingleDateInRange }
        : {})}
      {...(clearable !== undefined ? { clearable } : {})}
    />
  );
}
