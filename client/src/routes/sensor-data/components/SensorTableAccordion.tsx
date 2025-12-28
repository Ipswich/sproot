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
import { getSensorsAsync, getDeviceGroupsAsync } from "../../../requests/requests_v2";
import { SDBDeviceGroup } from "@sproot/database/SDBDeviceGroup";
import SortableAccordionItem from "./SortableAccordionItem";
import { sensorAccordionOrderKey, sensorToggledDeviceGroupsKey } from "../../utility/LocalStorageKeys";

interface SensorTableAccordionProps {
  readingType: ReadingType;
  sensorToggleStates: string[];
  setSensorToggleStates: (sensorName: string[]) => void;
  deviceGroupToggleStates: string[];
  setDeviceGroupToggleStates: (deviceGroupNames: string[]) => void;
  useAlternateUnits: boolean;
}

export default function SensorTableAccordion({
  readingType,
  sensorToggleStates,
  setSensorToggleStates,
  deviceGroupToggleStates,
  setDeviceGroupToggleStates,
  useAlternateUnits,
}: SensorTableAccordionProps) {
  const dragSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [sensors, setSensors] = useState({} as Record<number, ISensorBase[]>);
  const [deviceGroups, setDeviceGroups] = useState([] as SDBDeviceGroup[]);

  const getSensorsQuery = useQuery({
    queryKey: ["sensor-data-sensors"],
    queryFn: () => getSensorsAsync(),
    refetchInterval: 60000,
  });

  const getDeviceGroupsQuery = useQuery({
    queryKey: ["device-groups"],
    queryFn: () => getDeviceGroupsAsync(),
    refetchInterval: 60000,
  });

  const updateDataAsync = async () => {
    const deviceGroups: SDBDeviceGroup[] = [];
    const sensorsByDeviceGroup: Record<number, ISensorBase[]> = { [-1]: [] };

    const deviceGroupsData = (await getDeviceGroupsQuery.refetch()).data;
    const sensorsData = (await getSensorsQuery.refetch()).data;

    deviceGroupsData?.forEach((group) => {
      deviceGroups.push(group);
      sensorsByDeviceGroup[group.id] = [];
    });

    Object.values(sensorsData ?? {}).forEach((sensor) => {
      if (!Object.keys(sensor.lastReading).includes(readingType)) {
        return;
      }
      if (sensor.deviceGroupId == null) {
        sensorsByDeviceGroup[-1]!.push(sensor);
      } else {
        if (sensorsByDeviceGroup[sensor.deviceGroupId] == null) {
          sensorsByDeviceGroup[sensor.deviceGroupId] = [];
        }
        sensorsByDeviceGroup[sensor.deviceGroupId]!.push(sensor);
      }
    });

    if ((sensorsByDeviceGroup[-1] ?? []).length > 0 && !deviceGroups.find((g) => g.id === -1)) {
      deviceGroups.unshift({ id: -1, name: "Default" } as SDBDeviceGroup);
    }
    try {
      const existingOrder = (
        JSON.parse(localStorage.getItem(sensorAccordionOrderKey(readingType)) ?? "[]") as SDBDeviceGroup[]
      ).map((dg) => dg.id ?? -1);

      if (existingOrder.length > 0) {
        const updatedOrder: SDBDeviceGroup[] = [];

        const newDeviceGroups = deviceGroups.filter(
          (deviceGroup) => !existingOrder.includes(deviceGroup.id),
        );

        existingOrder.forEach((deviceGroupId) => {
          const deviceGroupIndex = deviceGroups.findIndex(
            (dg) => dg.id == Number(deviceGroupId),
          );
          if (deviceGroupIndex != -1) {
            updatedOrder.push(deviceGroups[deviceGroupIndex]!);
          }
        });

        const newOrder = updatedOrder.concat(newDeviceGroups);
        setDeviceGroups(newOrder);
      } else {
        setDeviceGroups(deviceGroups);
      }
    } catch (e) {
      setDeviceGroups(deviceGroups);
    }
    setSensors(sensorsByDeviceGroup);
  };

  useEffect(() => {
    updateDataAsync();

    const interval = setInterval(() => {
      updateDataAsync();
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingType, JSON.stringify(sensorToggleStates), JSON.stringify(deviceGroupToggleStates)]);

  const sortableItems = deviceGroups.map((group) => {
    if (sensors[group.id] == null || sensors[group.id]!.length == 0) {
      return null;
    }
    return (
      <SortableAccordionItem
        key={group.id}
        readingType={readingType}
        deviceGroupId={group.id}
        deviceGroupName={group.name ?? (group.id == -1 ? "Default" : "Unknown Group")}
        sensors={sensors[group.id] ?? []}
        sensorToggleStates={sensorToggleStates}
        setSensorToggleStates={setSensorToggleStates}
        useAlternateUnits={useAlternateUnits}
      />
    );
  });

  const openedDeviceGroupIds = deviceGroups.map((g) => g.id.toString()).filter((id) => !deviceGroupToggleStates.includes(id));
  return (
    <Fragment>
      <Center>
        <h5>
          Last Updated:{" "}
          {`${new Date().toLocaleDateString([], { day: "2-digit", month: "numeric" })} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
        </h5>
      </Center>
      {getDeviceGroupsQuery.isLoading || getSensorsQuery.isLoading ? (
        <Center>
          <h3>Loading...</h3>
        </Center>
      ) :
        <DndContext
          sensors={dragSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Accordion
            key={readingType}
            multiple={true}
            radius="md"
            value={openedDeviceGroupIds}
            onChange={(values) => {
              startTransition(() => {
                const arr = Array.isArray(values) ? values : [values];
                const all = deviceGroups.map((g) => g.id.toString());
                const closed = all.filter((id) => !arr.includes(id));
                setDeviceGroupToggleStates(closed);
                localStorage.setItem(
                  sensorToggledDeviceGroupsKey(readingType),
                  JSON.stringify(closed),
                );
              });
            }}
          >
            <SortableContext
              items={deviceGroups.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortableItems}
            </SortableContext>
          </Accordion>
        </DndContext>
      }
    </Fragment>
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over == null) {
      return;
    }

    if (active.id !== over?.id) {
      setDeviceGroups((items: SDBDeviceGroup[]) => {
        const oldIndex = items.findIndex((group) => group.id == active.id);
        const newIndex = items.findIndex((group) => group.id == over!.id);

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
