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
import { Accordion, Center } from "@mantine/core";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { Fragment, startTransition, useEffect, useState } from "react";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
import { useQuery } from "@tanstack/react-query";
import {
  getSensorsAsync,
  getDeviceZonesAsync,
} from "../../../requests/requests_v2";
import { SDBDeviceZone } from "@sproot/database/SDBDeviceZone";
import SortableAccordionItem from "./SortableAccordionItem";
import {
  sensorAccordionOrderKey,
  sensorToggledDeviceZonesKey,
} from "../../utility/LocalStorageKeys";
import SensorTable from "./SensorTable";

interface SensorTableAccordionProps {
  readingType: ReadingType;
  sensorToggleStates: string[];
  setSensorToggleStates: (sensorName: string[]) => void;
  deviceZoneToggleStates: string[];
  setDeviceZoneToggleStates: (deviceZoneNames: string[]) => void;
  useAlternateUnits: boolean;
}

export default function SensorTableAccordion({
  readingType,
  sensorToggleStates,
  setSensorToggleStates,
  deviceZoneToggleStates,
  setDeviceZoneToggleStates,
  useAlternateUnits,
}: SensorTableAccordionProps) {
  const dragSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [sensors, setSensors] = useState({} as Record<number, ISensorBase[]>);
  const [deviceZones, setDeviceZones] = useState([] as SDBDeviceZone[]);

  const getSensorsQuery = useQuery({
    queryKey: ["sensor-data-sensors"],
    queryFn: () => getSensorsAsync(),
    refetchInterval: 60000,
  });

  const getDeviceZonesQuery = useQuery({
    queryKey: ["device-zones"],
    queryFn: () => getDeviceZonesAsync(),
    refetchInterval: 60000,
  });

  const updateDataAsync = async () => {
    const deviceZones: SDBDeviceZone[] = [];
    const sensorsByDeviceZone: Record<number, ISensorBase[]> = { [-1]: [] };

    const deviceZonesData = (await getDeviceZonesQuery.refetch()).data;
    const sensorsData = (await getSensorsQuery.refetch()).data;

    deviceZonesData?.forEach((zone) => {
      deviceZones.push(zone);
      sensorsByDeviceZone[zone.id] = [];
    });

    Object.values(sensorsData ?? {}).forEach((sensor) => {
      if (!Object.keys(sensor.lastReading).includes(readingType)) {
        return;
      }
      if (sensor.deviceZoneId == null) {
        sensorsByDeviceZone[-1]!.push(sensor);
      } else {
        if (sensorsByDeviceZone[sensor.deviceZoneId] == null) {
          sensorsByDeviceZone[sensor.deviceZoneId] = [];
        }
        sensorsByDeviceZone[sensor.deviceZoneId]!.push(sensor);
      }
    });

    if (
      (sensorsByDeviceZone[-1] ?? []).length > 0 &&
      !deviceZones.find((g) => g.id === -1)
    ) {
      deviceZones.unshift({ id: -1, name: "Default" } as SDBDeviceZone);
    }
    try {
      const existingOrder = (
        JSON.parse(
          localStorage.getItem(sensorAccordionOrderKey(readingType)) ?? "[]",
        ) as SDBDeviceZone[]
      ).map((dg) => dg.id ?? -1);

      if (existingOrder.length > 0) {
        const updatedOrder: SDBDeviceZone[] = [];

        const newDeviceZones = deviceZones.filter(
          (deviceZone) => !existingOrder.includes(deviceZone.id),
        );

        existingOrder.forEach((deviceZoneId) => {
          const deviceZoneIndex = deviceZones.findIndex(
            (dg) => dg.id == Number(deviceZoneId),
          );
          if (deviceZoneIndex != -1) {
            updatedOrder.push(deviceZones[deviceZoneIndex]!);
          }
        });

        const newOrder = updatedOrder.concat(newDeviceZones);
        setDeviceZones(newOrder);
      } else {
        setDeviceZones(deviceZones);
      }
    } catch (e) {
      setDeviceZones(deviceZones);
    }
    setSensors(sensorsByDeviceZone);
  };

  const sensorToggleStatesJSON = JSON.stringify(sensorToggleStates);
  const deviceZoneToggleStatesJSON = JSON.stringify(deviceZoneToggleStates);

  useEffect(() => {
    updateDataAsync();

    const interval = setInterval(() => {
      updateDataAsync();
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingType, sensorToggleStatesJSON, deviceZoneToggleStatesJSON]);

  const sortableItems = deviceZones
    .map((zone) => {
      if (sensors[zone.id] == null || sensors[zone.id]!.length == 0) {
        return null;
      }
      return (
        <SortableAccordionItem
          key={zone.id}
          readingType={readingType}
          deviceZoneId={zone.id}
          deviceZoneName={
            zone.name ?? (zone.id == -1 ? "Default" : "Unknown Zone")
          }
          sensors={sensors[zone.id] ?? []}
          sensorToggleStates={sensorToggleStates}
          setSensorToggleStates={setSensorToggleStates}
          useAlternateUnits={useAlternateUnits}
        />
      );
    })
    .filter((item) => item != null);

  const openedDeviceZoneIds = deviceZones
    .map((g) => g.id.toString())
    .filter((id) => !deviceZoneToggleStates.includes(id));
  return (
    <Fragment>
      <Center>
        <h5>
          Last Updated:{" "}
          {`${new Date().toLocaleDateString([], { day: "2-digit", month: "numeric" })} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
        </h5>
      </Center>
      {getDeviceZonesQuery.isLoading || getSensorsQuery.isLoading ? (
        <Center>
          <h3>Loading...</h3>
        </Center>
      ) : sortableItems.length === 1 ? (
        <SensorTable
          readingType={readingType}
          deviceZone={sortableItems[0]!.props.deviceZoneId}
          sensors={sortableItems[0]!.props.sensors ?? []}
          sensorToggleStates={sensorToggleStates}
          setSensorToggleStates={setSensorToggleStates}
          useAlternateUnits={useAlternateUnits}
        />
      ) : (
        <DndContext
          sensors={dragSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Accordion
            key={readingType}
            multiple={true}
            radius="md"
            value={openedDeviceZoneIds}
            onChange={(values) => {
              startTransition(() => {
                const arr = Array.isArray(values) ? values : [values];
                const all = deviceZones.map((g) => g.id.toString());
                const closed = all.filter((id) => !arr.includes(id));
                setDeviceZoneToggleStates(closed);
                localStorage.setItem(
                  sensorToggledDeviceZonesKey(readingType),
                  JSON.stringify(closed),
                );
              });
            }}
          >
            <SortableContext
              items={deviceZones.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortableItems}
            </SortableContext>
          </Accordion>
        </DndContext>
      )}
    </Fragment>
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over == null) {
      return;
    }

    if (active.id !== over?.id) {
      setDeviceZones((items: SDBDeviceZone[]) => {
        const oldIndex = items.findIndex((zone) => zone.id == active.id);
        const newIndex = items.findIndex((zone) => zone.id == over!.id);

        const updatedArray = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(
          sensorAccordionOrderKey(readingType),
          JSON.stringify(updatedArray),
        );
        return updatedArray;
      });
    }
  }
}
