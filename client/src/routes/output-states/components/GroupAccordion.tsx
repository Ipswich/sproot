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
  getDeviceGroupsAsync,
} from "../../../requests/requests_v2";
import { SDBDeviceGroup } from "@sproot/database/SDBDeviceGroup";
import {
  outputGroupOrderKey,
  outputStateToggledGroupsKey,
} from "../../utility/LocalStorageKeys";
import { IOutputBase } from "@sproot/outputs/IOutputBase";
import GroupAccordionItem from "./GroupAccordionItem";
import StatesAccordion from "./StatesAccordion";

interface GroupAccordionProps {
  deviceGroupToggleStates: string[];
  setDeviceGroupToggleStates: (deviceGroupNames: string[]) => void;
}

export default function GroupAccordion({
  deviceGroupToggleStates,
  setDeviceGroupToggleStates,
}: GroupAccordionProps) {
  const dragSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [outputs, setOutputs] = useState({} as Record<number, IOutputBase[]>);
  const [deviceGroups, setDeviceGroups] = useState([] as SDBDeviceGroup[]);

  const getOutputsQuery = useQuery({
    queryKey: ["outputs"],
    queryFn: () => getOutputsAsync(),
    refetchInterval: 60000,
  });

  const getDeviceGroupsQuery = useQuery({
    queryKey: ["device-groups"],
    queryFn: () => getDeviceGroupsAsync(),
    refetchInterval: 60000,
  });

  const updateDataAsync = async () => {
    const deviceGroups: SDBDeviceGroup[] = [];
    const outputsByDeviceGroup: Record<number, IOutputBase[]> = { [-1]: [] };

    const deviceGroupsData = (await getDeviceGroupsQuery.refetch()).data;
    const outputsData = (await getOutputsQuery.refetch()).data;

    deviceGroupsData?.forEach((group) => {
      deviceGroups.push(group);
      outputsByDeviceGroup[group.id] = [];
    });

    Object.values(outputsData ?? {}).forEach((output) => {
      if (output.deviceGroupId == null) {
        outputsByDeviceGroup[-1]!.push(output);
      } else {
        if (outputsByDeviceGroup[output.deviceGroupId] == null) {
          outputsByDeviceGroup[output.deviceGroupId] = [];
        }
        outputsByDeviceGroup[output.deviceGroupId]!.push(output);
      }
    });

    if (
      (outputsByDeviceGroup[-1] ?? []).length > 0 &&
      !deviceGroups.find((g) => g.id === -1)
    ) {
      deviceGroups.unshift({ id: -1, name: "Default" } as SDBDeviceGroup);
    }
    try {
      const existingOrder = (
        JSON.parse(
          localStorage.getItem(outputGroupOrderKey()) ?? "[]",
        ) as SDBDeviceGroup[]
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
    setOutputs(outputsByDeviceGroup);
  };

  useEffect(() => {
    updateDataAsync();

    const interval = setInterval(() => {
      updateDataAsync();
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(deviceGroupToggleStates)]);

  const sortableItems = deviceGroups
    .map((group) => {
      if (outputs[group.id] == null || outputs[group.id]!.length == 0) {
        return null;
      }
      return (
        <GroupAccordionItem
          key={group.id}
          deviceGroupId={group.id}
          deviceGroupName={
            group.name ?? (group.id == -1 ? "Default" : "Unknown Group")
          }
          outputs={outputs[group.id] ?? []}
          updateOutputsAsync={updateDataAsync}
        />
      );
    })
    .filter((item) => item != null);

  const openedDeviceGroupIds = deviceGroups
    .map((g) => g.id.toString())
    .filter((id) => !deviceGroupToggleStates.includes(id));
  return (
    <Fragment>
      {getDeviceGroupsQuery.isLoading || getOutputsQuery.isLoading ? (
        <Center>
          <h3>Loading...</h3>
        </Center>
      ) : sortableItems.length === 1 ? (
        <StatesAccordion
          outputs={sortableItems[0]!.props.outputs ?? []}
          updateOutputsAsync={sortableItems[0]!.props.updateOutputsAsync}
          deviceGroupId={sortableItems[0]!.props.deviceGroupId}
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
            value={openedDeviceGroupIds}
            onChange={(values) => {
              startTransition(() => {
                const arr = Array.isArray(values) ? values : [values];
                const all = deviceGroups.map((g) => g.id.toString());
                const closed = all.filter((id) => !arr.includes(id));
                setDeviceGroupToggleStates(closed);
                localStorage.setItem(
                  outputStateToggledGroupsKey(),
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
      )}
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
          outputGroupOrderKey(),
          JSON.stringify(updatedArray),
        );
        return updatedArray;
      });
    }
  }
}
