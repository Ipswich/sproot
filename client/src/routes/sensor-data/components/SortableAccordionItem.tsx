import { useSortable } from "@dnd-kit/sortable";
import { Accordion } from "@mantine/core";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
import { CSS } from "@dnd-kit/utilities";
import { IconGripVertical } from "@tabler/icons-react";
import SensorTable from "./SensorTable";

interface SortableAccordionItemProps {
  readingType: ReadingType;
  deviceGroupId: number;
  deviceGroupName: string;
  sensors: ISensorBase[];
  sensorToggleStates: string[];
  setSensorToggleStates: (sensorNames: string[]) => void;
  useAlternateUnits: boolean;
}

export default function SortableAccordionItem({
  readingType,
  deviceGroupId,
  deviceGroupName,
  sensors,
  sensorToggleStates,
  setSensorToggleStates,
  useAlternateUnits,
}: SortableAccordionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id: deviceGroupId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Accordion.Item
      ref={setNodeRef}
      style={style}
      key={deviceGroupId}
      value={deviceGroupId.toString()}
    >
      <Accordion.Control
        icon={
          <span ref={setActivatorNodeRef} {...attributes} {...listeners}>
            <IconGripVertical color={"lightgray"} />
          </span>
        }
      >
        {deviceGroupName}
      </Accordion.Control>
      <Accordion.Panel>
        <SensorTable
          readingType={readingType}
          deviceGroup={deviceGroupId}
          sensors={sensors ?? []}
          sensorToggleStates={sensorToggleStates}
          setSensorToggleStates={setSensorToggleStates}
          useAlternateUnits={useAlternateUnits}
        />
      </Accordion.Panel>
    </Accordion.Item>
  );
}
