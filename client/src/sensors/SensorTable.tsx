import { Flex, Switch, Table } from "@mantine/core";
import { IconEyeOff } from "@tabler/icons-react";
import {
  ReadingType,
  ISensorBase,
} from "@sproot/sproot-common/src/sensors/SensorBase";
import { useTransition } from "react";

interface SensorTableProps {
  readingType: ReadingType;
  sensors: Record<string, ISensorBase>;
  chartSeries: { name: string; color: string }[];
  toggleState: string[];
  setToggleState: (sensorName: string[]) => void;
}

export default function SensorTable({
  readingType,
  sensors,
  chartSeries,
  toggleState,
  setToggleState,
}: SensorTableProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, startTransition] = useTransition();

  const relevantSensors = Object.values(sensors).filter((sensor) =>
    Object.keys(sensor.lastReading).includes(readingType),
  );

  return (
    <Table
      style={{
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <Table.Thead>
        <Table.Tr>
          <Table.Th>
            <IconEyeOff />
          </Table.Th>
          <Table.Th>Sensor</Table.Th>
          <Table.Th>
            {readingType.charAt(0).toUpperCase() + readingType.slice(1)}
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {relevantSensors.map((sensor) => (
          <Table.Tr key={sensor.id}>
            <Table.Td style={{ verticalAlign: "middle" }}>
              <Flex style={{ alignContent: "center" }}>
                <Switch
                  defaultChecked
                  style={{ marginRight: "4px" }}
                  color={
                    chartSeries.find((value) => value.name == sensor.name)
                      ?.color ?? "bbb"
                  }
                  onChange={() => {
                    startTransition(() => {
                      if (toggleState.includes(sensor.name)) {
                        toggleState.splice(toggleState.indexOf(sensor.name), 1);
                      } else {
                        toggleState.push(sensor.name);
                      }
                      setToggleState([...toggleState]);
                    });
                  }}
                />
              </Flex>
            </Table.Td>
            <Table.Td>{sensor.name}</Table.Td>
            <Table.Td>{`${sensor.lastReading[readingType]} ${sensor.units[readingType]}`}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
