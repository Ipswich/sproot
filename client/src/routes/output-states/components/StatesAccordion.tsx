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
import { getOutputsAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import { useQuery } from "@tanstack/react-query";
import SortableAccordionItem from "./SortableAccordionItem";

export default function OutputAccordion() {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [outputs, setOutputs] = useState([] as IOutputBase[]);
  const getOutputsQuery = useQuery({
    queryKey: ["output-states-accordion"],
    queryFn: () => getOutputsAsync(),
  });

  const updateOutputsAsync = async () => {
    const lastOutputStateOrder = (
      JSON.parse(
        localStorage.getItem(`outputStateOrder`) ?? "[]",
      ) as IOutputBase[]
    ).map((s) => s.id);
    const retrievedOutputs = Object.values(
      (await getOutputsQuery.refetch()).data!,
    );
    const orderedOutputs: IOutputBase[] = [];

    //Get outputs that don't exist in last list
    const newOutputs = retrievedOutputs.filter(
      (output) => !lastOutputStateOrder.includes(output.id),
    );

    //Add the outputs that do exist in the last list
    lastOutputStateOrder.forEach((outputId) => {
      const outputIndex = retrievedOutputs.findIndex(
        (o) => o.id == Number(outputId),
      );
      if (outputIndex != -1) {
        orderedOutputs.push(retrievedOutputs[outputIndex]!);
      }
    });

    //Add the new ones to the end of the order
    setOutputs(orderedOutputs.concat(newOutputs));
  };

  useEffect(() => {
    updateOutputsAsync();

    const interval = setInterval(() => {
      updateOutputsAsync();
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortableItems = outputs.map((output) => (
    <SortableAccordionItem
      output={output}
      updateOutputsAsync={updateOutputsAsync}
    />
  ));
  return getOutputsQuery.isPending ? (
    <p>Loading...</p>
  ) : (
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
      setOutputs((items: IOutputBase[]) => {
        const oldIndex = items.findIndex((output) => output.id == active.id);
        const newIndex = items.findIndex((output) => output.id == over!.id);

        const updatedArray = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem("outputStateOrder", JSON.stringify(updatedArray));
        return updatedArray;
      });
    }
  }
}
