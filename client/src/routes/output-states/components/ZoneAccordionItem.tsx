import { useSortable } from "@dnd-kit/sortable";
import { Accordion } from "@mantine/core";
import { CSS } from "@dnd-kit/utilities";
import { IconGripVertical } from "@tabler/icons-react";
import StatesAccordion from "./StatesAccordion";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";

interface SortableAccordionItemProps {
  deviceZoneId: number;
  deviceZoneName: string;
  outputs: IOutputBase[];
  updateOutputsAsync: () => Promise<void>;
}

export default function SortableAccordionItem({
  deviceZoneId,
  deviceZoneName,
  outputs,
  updateOutputsAsync,
}: SortableAccordionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id: deviceZoneId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Accordion.Item
      ref={setNodeRef}
      style={style}
      key={deviceZoneId}
      value={deviceZoneId.toString()}
    >
      <Accordion.Control
        icon={
          <span ref={setActivatorNodeRef} {...attributes} {...listeners}>
            <IconGripVertical color={"lightgray"} />
          </span>
        }
      >
        {deviceZoneName}
      </Accordion.Control>
      <Accordion.Panel>
        <StatesAccordion
          outputs={outputs ?? []}
          updateOutputsAsync={updateOutputsAsync}
          deviceZoneId={deviceZoneId}
        />
      </Accordion.Panel>
    </Accordion.Item>
  );
}
