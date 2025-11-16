import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Center, Table } from "@mantine/core";
import { IconEyeOff } from "@tabler/icons-react";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { Fragment, useEffect, useState } from "react";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
import { useQuery } from "@tanstack/react-query";
import { getSensorsAsync } from "../../../requests/requests_v2";
import SortableTableRow from "./SortableTableRow";

interface SensorTableProps {
  readingType: ReadingType;
  toggleStates: string[];
  setToggleState: (sensorName: string[]) => void;
  useAlternateUnits: boolean;
}

export default function SensorTable({
  readingType,
  toggleStates,
  setToggleState,
  useAlternateUnits,
}: SensorTableProps) {
  const dragSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [sensors, setSensors] = useState([] as ISensorBase[]);
  const getSensorsQuery = useQuery({
    queryKey: ["sensor-data-sensors"],
    queryFn: () => getSensorsAsync(),
    refetchInterval: 60000,
  });
  const updateSensorsAsync = async () => {
  
    const lastSensorDataOrder = (JSON.parse(localStorage.getItem(`${readingType}-sensorDataOrder`) ?? "[]") as ISensorBase[]).map(s => s.id);
    const retrievedSensors = Object.values(
      (await getSensorsQuery.refetch()).data!,
    ).filter((sensor) => Object.keys(sensor.lastReading).includes(readingType));
    const orderedSensors: ISensorBase[] = [];

    //Get sensors that don't exist in the last list
    const newSensors = retrievedSensors.filter(
      (sensor) => !lastSensorDataOrder.includes(sensor.id),
    );

    //Add the outputs that do exist in the last list
    lastSensorDataOrder.forEach((sensorId) => {
      const sensorIndex = retrievedSensors.findIndex(
        (o) => o.id == Number(sensorId),
      );
      if (sensorIndex != -1) {
        orderedSensors.push(retrievedSensors[sensorIndex]!);
      }
    });

    setSensors(orderedSensors.concat(newSensors));
  };

  useEffect(() => {
    updateSensorsAsync();

    const interval = setInterval(() => {
      updateSensorsAsync();
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingType, JSON.stringify(toggleStates)]);

  const sortableItems = sensors.map((sensor) => (
    <SortableTableRow
      sensor={sensor}
      readingType={readingType}
      useAlternateUnits={useAlternateUnits}
      toggleStates={toggleStates}
      setToggleState={setToggleState}
    />
  ));

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
            <Table.Th />
            <Table.Th style={{ display: "flex", paddingLeft: 10 }}>
              <IconEyeOff />
            </Table.Th>
            <Table.Th>Sensor</Table.Th>
            <Table.Th>
              {readingType.charAt(0).toUpperCase() + readingType.slice(1)}
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <DndContext
          sensors={dragSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table.Tbody>
            <SortableContext
              items={sensors}
              strategy={verticalListSortingStrategy}
            >
              {sortableItems}
            </SortableContext>
          </Table.Tbody>
        </DndContext>
      </Table>
    </Fragment>
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over == null) {
      return;
    }

    if (active.id !== over?.id) {
      setSensors((items: ISensorBase[]) => {
        const oldIndex = items.findIndex((sensor) => sensor.id == active.id);
        const newIndex = items.findIndex((sensor) => sensor.id == over!.id);

        const updatedArray = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(
          `${readingType}-sensorDataOrder`,
          JSON.stringify(updatedArray),
        );
        return updatedArray;
      });
    }
  }
}
