import { useSortable } from "@dnd-kit/sortable";
import { Table, Flex, Switch } from "@mantine/core";
import { ISensorBase } from "@sproot/common/sensors/ISensorBase";
import { ReadingType } from "@sproot/common/sensors/ReadingType";
import { convertCelsiusToFahrenheit } from "@sproot/common/utility/DisplayFormats";
import { CSS } from "@dnd-kit/utilities";
import { IconGripVertical } from "@tabler/icons-react";
import { useTransition } from "react";
import { sensorsToggledKey } from "../../utility/LocalStorageKeys";

interface SortableTableRowProps {
  sensor: ISensorBase;
  readingType: ReadingType;
  useAlternateUnits: boolean;
  sensorToggleStates: string[];
  setSensorToggleState: (sensorNames: string[]) => void;
}

export default function SortableTableRow({
  sensor,
  readingType,
  useAlternateUnits,
  sensorToggleStates,
  setSensorToggleState,
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
      <Table.Td
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        style={{ textAlign: "center", verticalAlign: "middle" }}
      >
        <IconGripVertical color={"lightgray"} />
      </Table.Td>
      <Table.Td style={{ verticalAlign: "middle", textAlign: "center" }}>
        <Flex justify="center" align="center">
          <Switch
            checked={!sensorToggleStates.includes(sensor.name)}
            color={sensor.color}
            withThumbIndicator={false}
            onChange={() => {
              startTransition(() => {
                if (sensorToggleStates.includes(sensor.name)) {
                  sensorToggleStates.splice(
                    sensorToggleStates.indexOf(sensor.name),
                    1,
                  );
                } else {
                  sensorToggleStates.push(sensor.name);
                }
                setSensorToggleState([...sensorToggleStates]);
                localStorage.setItem(
                  sensorsToggledKey(readingType),
                  JSON.stringify([...sensorToggleStates]),
                );
              });
            }}
          />
        </Flex>
      </Table.Td>
      <Table.Td
        style={{
          whiteSpace: "normal",
          overflowWrap: "break-word",
          wordBreak: "normal",
          paddingRight: 8,
          textAlign: "center",
          verticalAlign: "middle",
        }}
      >
        {sensor.name}
      </Table.Td>
      <Table.Td
        style={{
          whiteSpace: "nowrap",
          textAlign: "center",
          verticalAlign: "middle",
        }}
      >
        {useAlternateUnits && readingType == ReadingType.temperature
          ? `${convertCelsiusToFahrenheit(sensor.lastReading[readingType])} °F`
          : `${sensor.lastReading[readingType]} ${sensor.units[readingType]}`}
      </Table.Td>
    </Table.Tr>
  );
}
