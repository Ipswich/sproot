import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { Accordion } from "@mantine/core";
import OutputCard from "./OutputCard";

interface OutputAccordionProps {
  chartSeries: { name: string; color: string }[];
  outputs: Record<string, IOutputBase>;
  updateOutputsAsync: () => Promise<void>;
}

export default function OutputAccordion({
  // chartSeries,
  outputs,
  updateOutputsAsync,
}: OutputAccordionProps) {
  let value = 0;
  const items = Object.keys(outputs).map((key) => {
    value++;
    const output = outputs[key];
    if (!output) {
      return null;
    }
    // const seriesData = chartSeries.find((series) => series.name === output.name);
    return (
      <Accordion.Item key={output.name} value={`item-${value}`}>
        <Accordion.Control>{output.name}</Accordion.Control>
        <Accordion.Panel>
          <OutputCard output={output} updateOutputsAsync={updateOutputsAsync} />
        </Accordion.Panel>
      </Accordion.Item>
    );
  });

  return <Accordion defaultValue={"item-1"}>{items}</Accordion>;
}
