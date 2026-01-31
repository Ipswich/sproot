import { useSortable } from "@dnd-kit/sortable";
import { Accordion } from "@mantine/core";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
import { CSS } from "@dnd-kit/utilities";
import { IconGripVertical } from "@tabler/icons-react";
import SensorTable from "./SensorTable";

interface SortableAccordionItemProps {
  readingType: ReadingType;
  deviceZoneId: number;
  deviceZoneName: string;
  sensors: ISensorBase[];
  sensorToggleStates: string[];
  setSensorToggleStates: (sensorNames: string[]) => void;
  useAlternateUnits: boolean;
}

export default function SortableAccordionItem({
  readingType,
  deviceZoneId,
  deviceZoneName,
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
        <SensorTable
          readingType={readingType}
          deviceZone={deviceZoneId}
          sensors={sensors ?? []}
          sensorToggleStates={sensorToggleStates}
          setSensorToggleStates={setSensorToggleStates}
          useAlternateUnits={useAlternateUnits}
        />
      </Accordion.Panel>
    </Accordion.Item>
  );
}
