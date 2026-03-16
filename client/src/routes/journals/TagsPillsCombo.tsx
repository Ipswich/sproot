import { useState } from "react";
import {
  PillsInput,
  Pill,
  Combobox,
  Group,
  useCombobox,
  CheckIcon,
  Badge,
  ActionIcon,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";

type Tag = {
  id: number;
  name?: string | null | undefined;
  color?: string | null | undefined;
};

type Props = {
  allTags: Tag[];
  value: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
};

export default function TagsPillsCombo({
  allTags,
  value,
  onChange,
  placeholder = "Filter",
}: Props) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  const [search, setSearch] = useState("");

  const readableTextColor = (bg: string) => {
    const s = String(bg || "").trim();
    const hexMatch = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!hexMatch) return "#000";
    const hexRaw = hexMatch[1];
    if (!hexRaw) return "#000";
    let hex = hexRaw;
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 160 ? "#000" : "#fff";
  };

  const optionsRaw = allTags.map((t) => ({
    value: `tag:${t.id}`,
    label: t.name ?? "",
    color: t.color ?? "#dee2e6",
  }));

  const handleValueSelect = (val: string) =>
    onChange(
      value.includes(val) ? value.filter((v) => v !== val) : [...value, val],
    );

  const handleValueRemove = (val: string) =>
    onChange(value.filter((v) => v !== val));

  const values = value.map((item) => {
    const opt = optionsRaw.find((o) => o.value === item);
    const label = opt?.label ?? item;
    const color = opt?.color ?? "#dee2e6";
    const fg = readableTextColor(color);
    return (
      <Badge
        key={item}
        variant="filled"
        color={color}
        radius="sm"
        rightSection={
          <ActionIcon
            onClick={() => handleValueRemove(item)}
            size="xs"
            variant="transparent"
          >
            <IconX size={10} color={fg} />
          </ActionIcon>
        }
        styles={{ root: { paddingRight: 6 } }}
      >
        {label}
      </Badge>
    );
    // <Pill
    //   key={item}
    //   radius="sm"
    //   withRemoveButton
    //   onRemove={() => handleValueRemove(item)}
    //   style={{ backgroundColor: color, color: fg, borderRadius: 6 }}
    // >
    //   {label}
    // </Pill>
  });

  const options = optionsRaw
    .filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase()))
    .map((o) => (
      <Combobox.Option
        value={o.value}
        key={o.value}
        active={value.includes(o.value)}
      >
        <Group gap="sm">
          {value.includes(o.value) ? <CheckIcon size={12} /> : null}
          <Badge variant="filled" color={o.color} radius="sm">
            {o.label}
          </Badge>
        </Group>
      </Combobox.Option>
    ));

  return (
    <Combobox store={combobox} onOptionSubmit={handleValueSelect}>
      <Combobox.DropdownTarget>
        <PillsInput onClick={() => combobox.openDropdown()} w="100%">
          <Pill.Group>
            {values}

            <Combobox.EventsTarget>
              <PillsInput.Field
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                value={search}
                placeholder={placeholder}
                onChange={(event) => {
                  combobox.updateSelectedOptionIndex();
                  setSearch(event.currentTarget.value);
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Backspace" &&
                    search.length === 0 &&
                    value.length > 0
                  ) {
                    event.preventDefault();
                    const last = value[value.length - 1];
                    if (last) handleValueRemove(last);
                  }
                }}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <Combobox.Options>
          {options.length > 0 ? (
            options
          ) : (
            <Combobox.Empty>Nothing found...</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
