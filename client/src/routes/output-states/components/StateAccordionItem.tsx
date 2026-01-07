import { useSortable } from "@dnd-kit/sortable";
import { Accordion, Badge, Group } from "@mantine/core";
import { IOutputBase } from "@sproot/outputs/IOutputBase";
import StateCard from "./StateCard";
import { CSS } from "@dnd-kit/utilities";
import { IconGripVertical } from "@tabler/icons-react";

interface StateAccordionItemProps {
  output: IOutputBase;
  updateOutputsAsync: () => Promise<void>;
}

export default function StateAccordionItem({
  output,
  updateOutputsAsync,
}: StateAccordionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id: output.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Accordion.Item
        key={output.id}
        id={String(output.id)}
        value={`item-${output.id}`}
      >
        <Accordion.Control>
          <Group>
            <div ref={setActivatorNodeRef} {...attributes} {...listeners}>
              <IconGripVertical color={"lightgray"} />
            </div>
            <Badge size="xl" radius="sm" color={output.color}>
              {output.name}
            </Badge>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <StateCard output={output} updateOutputsAsync={updateOutputsAsync} />
        </Accordion.Panel>
      </Accordion.Item>
    </div>
  );
}
