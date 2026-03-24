import React, { useState, useRef } from 'react';
import { Popover, TextInput, ActionIcon, Box } from '@mantine/core';
import { DatePicker, type DatePickerProps } from '@mantine/dates';
import dayjs from 'dayjs';
import { IconX } from '@tabler/icons-react';

type Props = {
  value: [Date | null, Date | null] | null;
  onChange: (v: [Date | null, Date | null]) => void;
  placeholder?: string;
  valueFormat?: string;
  ignoreYear?: boolean;
  allowSingleDateInRange?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  clearable?: boolean;
  type?: 'default' | 'multiple' | 'range';
  // style removed to prefer consistent TextInput styling
  dropdownContent?: React.ReactNode;
};

function safeFormat(valueFormat: string | undefined, ignoreYear: boolean | undefined, d: Date | null) {
  if (!d) return '';
  const fmt = valueFormat ?? (ignoreYear ? 'MMMM D, [xxxx]' : 'MMMM D, YYYY');
  try {
    return dayjs(d).format(fmt);
  } catch {
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();
    return `${m}/${day}/${year}`;
  }
}

export default function PopoverDatePickerInput({
  value,
  onChange,
  placeholder,
  valueFormat,
  ignoreYear,
  allowSingleDateInRange,
  size = 'sm',
  clearable,
  type = 'range',
  dropdownContent,
}: Props) {
  const [opened, setOpened] = useState(false);
  const targetRef = useRef<HTMLInputElement | null>(null);

  const dpType = (type ?? 'range') as DatePickerProps['type'];
  const dpAllowSingle = Boolean(allowSingleDateInRange);
  // prepare DatePicker props; use any to satisfy strict prop typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dpProps: any = {
    type: dpType,
    allowSingleDateInRange: dpAllowSingle,
    value: value as unknown as DatePickerProps['value'],
    onChange: (v: unknown) => {
      onChange(v as [Date | null, Date | null]);
      if (type === 'range') {
        const arr = v as unknown as [Date | null, Date | null];
        if (arr && arr[0] && arr[1]) setOpened(false);
      } else {
        setOpened(false);
      }
    },
  };

  const start = value ? value[0] : null;
  const end = value ? value[1] : null;

  let display = '';
  if (!start && !end) display = '';
  else if (type === 'range') {
    if (start && end) display = `${safeFormat(valueFormat, ignoreYear, start)} - ${safeFormat(valueFormat, ignoreYear, end)}`;
    else if (start) display = safeFormat(valueFormat, ignoreYear, start);
    else if (end) display = safeFormat(valueFormat, ignoreYear, end);
  } else if (start) display = safeFormat(valueFormat, ignoreYear, start);

  const hasValue = Boolean(start || end);

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom"
      trapFocus
      withArrow
    >
      <Popover.Target>
        <TextInput
          ref={targetRef}
          value={display || ''}
          placeholder={placeholder}
          readOnly
          size={size}
          onClick={() => setOpened((o) => !o)}
          rightSection={
            clearable && hasValue ? (
              <ActionIcon
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([null, null]);
                }}
                size="sm"
              >
                <IconX size={14} />
              </ActionIcon>
            ) : null
          }
          styles={{ input: { cursor: 'pointer' } }}
        />
      </Popover.Target>

      <Popover.Dropdown>
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
          <div>
            {/* cast props to any to satisfy DatePicker strict prop typing */}
            <DatePicker {...dpProps} />
          </div>
          {dropdownContent ? (
            <div style={{ alignSelf: 'center', marginTop: 'auto', paddingTop: 6 }}>
              {dropdownContent}
            </div>
          ) : null}
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
