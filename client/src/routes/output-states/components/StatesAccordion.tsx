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
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { Accordion } from "@mantine/core";
import { useEffect, useState } from "react";
import StateAccordionItem from "./StateAccordionItem";
import { outputStateOrderKey } from "../../utility/LocalStorageKeys";

interface StatesAccordionProps {
  outputs: IOutputBase[];
  updateOutputsAsync: () => Promise<void>;
  deviceZoneId: number;
}

export default function StatesAccordion({
  outputs,
  updateOutputsAsync,
  deviceZoneId,
}: StatesAccordionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [orderedOutputs, setOutputOrder] = useState([] as IOutputBase[]);

  useEffect(() => {
    updateOutputOrderAsync();

    const interval = setInterval(() => {
      updateOutputOrderAsync();
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortableItems = orderedOutputs
    .filter((output) => output.parentOutputId == null)
    .map((output) => (
      <StateAccordionItem
        output={output}
        updateOutputsAsync={updateOutputsAsync}
      />
    ));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Accordion>
        <SortableContext items={outputs} strategy={verticalListSortingStrategy}>
          {sortableItems}
        </SortableContext>
      </Accordion>
    </DndContext>
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over == null) {
      return;
    }

    if (active.id !== over?.id) {
      setOutputOrder((items: IOutputBase[]) => {
        const oldIndex = items.findIndex((output) => output.id == active.id);
        const newIndex = items.findIndex((output) => output.id == over!.id);

        const updatedArray = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(
          outputStateOrderKey(deviceZoneId),
          JSON.stringify(updatedArray),
        );
        return updatedArray;
      });
    }
  }

  function updateOutputOrderAsync() {
    const existingOrder = (
      JSON.parse(
        localStorage.getItem(outputStateOrderKey(deviceZoneId)) ?? "[]",
      ) as IOutputBase[]
    ).map((o) => o.id);
    const retrievedOutputs = Object.values(outputs);
    const orderedOutputs: IOutputBase[] = [];

    //Get outputs that don't exist in last list
    const newOutputs = retrievedOutputs.filter(
      (output) => !existingOrder.includes(output.id),
    );

    //Add the outputs that do exist in the last list
    existingOrder.forEach((outputId) => {
      const outputIndex = retrievedOutputs.findIndex(
        (o) => o.id == Number(outputId),
      );
      if (outputIndex != -1) {
        orderedOutputs.push(retrievedOutputs[outputIndex]!);
      }
    });

    //Add the new ones to the end of the order
    const newOrder = orderedOutputs.concat(newOutputs);
    setOutputOrder(newOrder);
  }
}
