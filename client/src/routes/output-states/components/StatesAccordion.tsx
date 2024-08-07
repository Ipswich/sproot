import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { Accordion, Badge } from "@mantine/core";
import StateCard from "./StateCard";
import { useEffect, useState } from "react";
import { getOutputsAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import { useQuery } from "@tanstack/react-query";


export default function OutputAccordion() {
  const [outputs, setOutputs] = useState({} as Record<string, IOutputBase>);
  const getOutputsQuery = useQuery({
    queryKey: ["output-states-accordion"],
    queryFn: () => getOutputsAsync()
  });
  
  const updateOutputsAsync = async () => {
    setOutputs((await getOutputsQuery.refetch()).data!);
  };

  useEffect(() => {
    updateOutputsAsync();

    const interval = setInterval(() => {
      updateOutputsAsync();
    }, 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let value = 0;
  const items = Object.keys(outputs).map((key) => {
    value++;
    const output = outputs[key];
    if (!output) {
      return null;
    }

    return (
      <Accordion.Item key={output.name} value={`item-${value}`}>
        <Accordion.Control>
          <Badge size="xl" radius="sm" color={output.color ?? ""}>
            {output.name}
          </Badge>
        </Accordion.Control>
        <Accordion.Panel>
          <StateCard output={output} updateOutputsAsync={updateOutputsAsync} />
        </Accordion.Panel>
      </Accordion.Item>
    );
  });
  

  return ((getOutputsQuery.isPending) ? <p>Loading...</p> : <Accordion>{items}</Accordion>);
}
