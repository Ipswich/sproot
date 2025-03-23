import { useSortable } from "@dnd-kit/sortable";
import { Table, Flex, Switch } from "@mantine/core";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
import { convertCelsiusToFahrenheit } from "@sproot/sproot-common/src/utility/DisplayFormats";
import { CSS } from "@dnd-kit/utilities";
import { IconGripVertical } from "@tabler/icons-react";
import { useTransition } from "react";

interface SortableTableRowProps {
  sensor: ISensorBase;
  readingType: ReadingType;
  useAlternateUnits: boolean;
  toggleStates: string[];
  setToggleState: (sensorNames: string[]) => void;
}

export default function SortableTableRow({
  sensor,
  readingType,
  useAlternateUnits,
  toggleStates,
  setToggleState,
}: SortableTableRowProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, startTransition] = useTransition();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id: sensor.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Table.Tr ref={setNodeRef} style={style} key={sensor.id}>
      <Table.Td ref={setActivatorNodeRef} {...attributes} {...listeners}>
        <IconGripVertical color={"lightgray"} />
      </Table.Td>
      <Table.Td style={{ verticalAlign: "middle" }}>
        <Flex style={{ alignContent: "center" }}>
          <Switch
            defaultChecked
            color={sensor.color}
            onChange={() => {
              startTransition(() => {
                if (toggleStates.includes(sensor.name)) {
                  toggleStates.splice(toggleStates.indexOf(sensor.name), 1);
                } else {
                  toggleStates.push(sensor.name);
                }
                setToggleState([...toggleStates]);
              });
            }}
          />
        </Flex>
      </Table.Td>
      <Table.Td>{sensor.name}</Table.Td>
      <Table.Td>
        {useAlternateUnits && readingType == ReadingType.temperature
          ? `${convertCelsiusToFahrenheit(sensor.lastReading[readingType])} °F`
          : `${sensor.lastReading[readingType]} ${sensor.units[readingType]}`}
      </Table.Td>
    </Table.Tr>
  );
}
