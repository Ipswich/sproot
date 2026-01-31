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
import { Table } from "@mantine/core";
import { IconEyeOff } from "@tabler/icons-react";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { useEffect, useState } from "react";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
import SortableTableRow from "./SortableTableRow";
import { sensorDataOrderKey } from "../../utility/LocalStorageKeys";

interface SensorTableProps {
  readingType: ReadingType;
  deviceZone: number;
  sensors: ISensorBase[];
  sensorToggleStates: string[];
  setSensorToggleStates: (sensorName: string[]) => void;
  useAlternateUnits: boolean;
}

export default function SensorTable({
  readingType,
  deviceZone,
  sensors,
  sensorToggleStates,
  setSensorToggleStates,
  useAlternateUnits,
}: SensorTableProps) {
  const dragSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [orderedSensors, setSensorOrder] = useState([] as ISensorBase[]);

  const _sensorToggleKey = JSON.stringify(sensorToggleStates);
  const _sensorsIdKey = JSON.stringify((sensors ?? []).map((s) => s.id));

  useEffect(() => {
    updateSensorOrder();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingType, _sensorToggleKey, deviceZone, _sensorsIdKey]);

  const sortableItems = orderedSensors.map((sensor) => (
    <SortableTableRow
      key={sensor.id}
      sensor={sensor}
      readingType={readingType}
      useAlternateUnits={useAlternateUnits}
      sensorToggleStates={sensorToggleStates}
      setSensorToggleState={setSensorToggleStates}
    />
  ));

  return (
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
            items={orderedSensors.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortableItems}
          </SortableContext>
        </Table.Tbody>
      </DndContext>
    </Table>
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over == null) {
      return;
    }

    if (active.id !== over?.id) {
      setSensorOrder((items: ISensorBase[]) => {
        const oldIndex = items.findIndex((sensor) => sensor.id == active.id);
        const newIndex = items.findIndex((sensor) => sensor.id == over!.id);

        const updatedArray = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(
          sensorDataOrderKey(readingType, deviceZone),
          JSON.stringify(updatedArray),
        );
        return updatedArray;
      });
    }
  }

  function updateSensorOrder() {
    const updatedOrder: ISensorBase[] = [];
    // Data from local storage
    const existingOrder = (
      JSON.parse(
        localStorage.getItem(sensorDataOrderKey(readingType, deviceZone)) ??
          "[]",
      ) as ISensorBase[]
    ).map((s) => s.id);
    const retrievedSensors = Object.values(sensors).filter((sensor) =>
      Object.keys(sensor.lastReading).includes(readingType),
    );

    //Get sensors that don't exist in the last list
    const newSensors = retrievedSensors.filter(
      (sensor) => !existingOrder.includes(sensor.id),
    );

    //Add the sensors that do exist in the last list
    existingOrder.forEach((sensorId) => {
      const sensorIndex = retrievedSensors.findIndex(
        (o) => o.id == Number(sensorId),
      );
      if (sensorIndex != -1) {
        updatedOrder.push(retrievedSensors[sensorIndex]!);
      }
    });

    const newOrder = updatedOrder.concat(newSensors);
    setSensorOrder(newOrder);
  }
}
