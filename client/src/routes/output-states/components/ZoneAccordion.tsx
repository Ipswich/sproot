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
import { Fragment, startTransition, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getOutputsAsync,
  getDeviceZonesAsync,
} from "../../../requests/requests_v2";
import { SDBDeviceZone } from "@sproot/database/SDBDeviceZone";
import {
  outputZoneOrderKey,
  outputStateToggledZonesKey,
} from "../../utility/LocalStorageKeys";
import { IOutputBase } from "@sproot/outputs/IOutputBase";
import ZoneAccordionItem from "./ZoneAccordionItem";
import StatesAccordion from "./StatesAccordion";

interface ZoneAccordionProps {
  deviceZoneToggleStates: string[];
  setDeviceZoneToggleStates: (deviceZoneNames: string[]) => void;
}

export default function ZoneAccordion({
  deviceZoneToggleStates,
  setDeviceZoneToggleStates,
}: ZoneAccordionProps) {
  const dragSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [outputs, setOutputs] = useState({} as Record<number, IOutputBase[]>);
  const [deviceZones, setDeviceZones] = useState([] as SDBDeviceZone[]);

  const getOutputsQuery = useQuery({
    queryKey: ["outputs"],
    queryFn: () => getOutputsAsync(),
    refetchInterval: 60000,
  });

  const getDeviceZonesQuery = useQuery({
    queryKey: ["device-zones"],
    queryFn: () => getDeviceZonesAsync(),
    refetchInterval: 60000,
  });

  const updateDataAsync = async () => {
    const deviceZones: SDBDeviceZone[] = [];
    const outputsByDeviceZone: Record<number, IOutputBase[]> = { [-1]: [] };

    const deviceZonesData = (await getDeviceZonesQuery.refetch()).data;
    const outputsData = (await getOutputsQuery.refetch()).data;

    deviceZonesData?.forEach((zone: SDBDeviceZone) => {
      deviceZones.push(zone);
      outputsByDeviceZone[zone.id] = [];
    });

    (Object.values(outputsData ?? {}) as IOutputBase[]).forEach(
      (output: IOutputBase) => {
        if (output.deviceZoneId == null) {
          outputsByDeviceZone[-1]!.push(output);
        } else {
          if (outputsByDeviceZone[output.deviceZoneId] == null) {
            outputsByDeviceZone[output.deviceZoneId] = [];
          }
          outputsByDeviceZone[output.deviceZoneId]!.push(output);
        }
      },
    );

    if (
      (outputsByDeviceZone[-1] ?? []).length > 0 &&
      !deviceZones.find((g) => g.id === -1)
    ) {
      deviceZones.unshift({ id: -1, name: "Default" } as SDBDeviceZone);
    }
    try {
      const existingOrder = (
        JSON.parse(
          localStorage.getItem(outputZoneOrderKey()) ?? "[]",
        ) as SDBDeviceZone[]
      ).map((dg) => dg.id ?? -1);

      if (existingOrder.length > 0) {
        const updatedOrder: SDBDeviceZone[] = [];

        const newDeviceZones = deviceZones.filter(
          (deviceZone) => !existingOrder.includes(deviceZone.id),
        );

        existingOrder.forEach((deviceZoneId) => {
          const deviceZoneIndex = deviceZones.findIndex(
            (dz) => dz.id == Number(deviceZoneId),
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
    setOutputs(outputsByDeviceZone);
  };

  useEffect(() => {
    updateDataAsync();

    const interval = setInterval(() => {
      updateDataAsync();
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(deviceZoneToggleStates)]);

  const sortableItems = deviceZones
    .map((zone) => {
      if (outputs[zone.id] == null || outputs[zone.id]!.length == 0) {
        return null;
      }
      return (
        <ZoneAccordionItem
          key={zone.id}
          deviceZoneId={zone.id}
          deviceZoneName={
            zone.name ?? (zone.id == -1 ? "Default" : "Unknown Zone")
          }
          outputs={outputs[zone.id] ?? []}
          updateOutputsAsync={updateDataAsync}
        />
      );
    })
    .filter((item) => item != null);

  const openedDeviceZoneIds = deviceZones
    .map((g) => g.id.toString())
    .filter((id) => !deviceZoneToggleStates.includes(id));
  return (
    <Fragment>
      {getDeviceZonesQuery.isLoading || getOutputsQuery.isLoading ? (
        <Center>
          <h3>Loading...</h3>
        </Center>
      ) : sortableItems.length === 1 ? (
        <StatesAccordion
          outputs={sortableItems[0]!.props.outputs ?? []}
          updateOutputsAsync={sortableItems[0]!.props.updateOutputsAsync}
          deviceZoneId={sortableItems[0]!.props.deviceZoneId}
        />
      ) : (
        <DndContext
          sensors={dragSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Accordion
            key={"output-states-accordion"}
            multiple={true}
            radius="md"
            value={openedDeviceZoneIds}
            onChange={(values) => {
              startTransition(() => {
                const arr = Array.isArray(values) ? values : [values];
                const all = deviceZones.map((g: SDBDeviceZone) =>
                  g.id.toString(),
                );
                const closed = all.filter((id) => !arr.includes(id));
                setDeviceZoneToggleStates(closed);
                localStorage.setItem(
                  outputStateToggledZonesKey(),
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
          outputZoneOrderKey(),
          JSON.stringify(updatedArray),
        );
        return updatedArray;
      });
    }
  }
}
