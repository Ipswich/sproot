import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { Accordion, Badge } from "@mantine/core";
import OutputCard from "./OutputCard";
import { useEffect, useState } from "react";
import { getOutputsAsync } from "../requests";

interface OutputAccordionProps {
  // chartSeries: { name: string; color: string }[];
  // outputs: Record<string, IOutputBase>;
  // updateOutputsAsync: () => Promise<void>;
  colorList: string[];
}

export default function OutputAccordion({ colorList }: OutputAccordionProps) {
  const [outputs, setOutputs] = useState({} as Record<string, IOutputBase>);
  const updateOutputsAsync = async () => {
    setOutputs((await getOutputsAsync()).outputs);
  };
  useEffect(() => {
    updateOutputsAsync();

    const interval = setInterval(() => {
      updateOutputsAsync();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const outputNames = Object.values(outputs)
    .map((output) => output.name)
    .filter((name) => name !== undefined);
  const chartSeries = outputNames.map((outputName, index) => ({
    name: outputName!,
    color: colorList[index % colorList.length]!,
  }));

  let value = 0;
  const items = Object.keys(outputs).map((key) => {
    value++;
    const output = outputs[key];
    if (!output) {
      return null;
    }
    const seriesData = chartSeries.find(
      (series) => series.name === output.name,
    );
    return (
      <Accordion.Item key={output.name} value={`item-${value}`}>
        <Accordion.Control>
          <Badge size="xl" radius="sm" color={seriesData?.color ?? ""}>
            {output.name}
          </Badge>
        </Accordion.Control>
        <Accordion.Panel>
          <OutputCard output={output} updateOutputsAsync={updateOutputsAsync} />
        </Accordion.Panel>
      </Accordion.Item>
    );
  });

  return <Accordion>{items}</Accordion>;
}
