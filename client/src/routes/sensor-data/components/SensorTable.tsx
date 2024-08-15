import { Center, Flex, Switch, Table } from "@mantine/core";
import { IconEyeOff } from "@tabler/icons-react";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { Fragment, useEffect, useState, useTransition } from "react";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
import { useQuery } from "@tanstack/react-query";
import { getSensorsAsync } from "../../../requests/requests_v2";

interface SensorTableProps {
  readingType: ReadingType;
  toggleStates: string[];
  setToggleState: (sensorName: string[]) => void;
}

export default function SensorTable({
  readingType,
  toggleStates,
  setToggleState,
}: SensorTableProps) {
  const [sensors, setSensors] = useState([] as ISensorBase[]);
  const getSensorsQuery = useQuery({
    queryKey: ["sensor-data-sensors"],
    queryFn: () => getSensorsAsync(),
    refetchInterval: 60000,
  });
  const updateSensorsAsync = async () => {
    setSensors(Object.values((await getSensorsQuery.refetch()).data!));
  };

  useEffect(() => {
    updateSensorsAsync();

    const interval = setInterval(() => {
      updateSensorsAsync();
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingType, JSON.stringify(toggleStates)]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, startTransition] = useTransition();

  return (
    <Fragment>
      <Center>
        <h5>
          Last Updated:{" "}
          {`${new Date().toLocaleDateString([], { day: "2-digit", month: "numeric" })} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
        </h5>
      </Center>
      <Table
        highlightOnHover
        style={{
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ display: "flex", paddingLeft: 10 }}>
              <IconEyeOff />
            </Table.Th>
            <Table.Th>Sensor</Table.Th>
            <Table.Th>
              {readingType.charAt(0).toUpperCase() + readingType.slice(1)}
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sensors
            .filter((sensor) =>
              Object.keys(sensor.lastReading).includes(readingType),
            )
            .map((sensor) => (
              <Table.Tr key={sensor.id}>
                <Table.Td style={{ verticalAlign: "middle" }}>
                  <Flex style={{ alignContent: "center" }}>
                    <Switch
                      defaultChecked
                      color={sensor.color}
                      onChange={() => {
                        startTransition(() => {
                          if (toggleStates.includes(sensor.name)) {
                            toggleStates.splice(
                              toggleStates.indexOf(sensor.name),
                              1,
                            );
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
                <Table.Td>{`${sensor.lastReading[readingType]} ${sensor.units[readingType]}`}</Table.Td>
              </Table.Tr>
            ))}
        </Table.Tbody>
      </Table>
    </Fragment>
  );
}
