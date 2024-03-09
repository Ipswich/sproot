import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { Accordion } from "@mantine/core";
import OutputCard from "./OutputCard";

interface OutputAccordionProps {
  outputs: Record<string, IOutputBase>;
  updateOutputsAsync: () => Promise<void>;
}

export default function OutputAccordion({
  outputs,
  updateOutputsAsync,
}: OutputAccordionProps) {
  let firstOutput = Object.keys(outputs)[0]
    ? outputs[Object.keys(outputs)[0]!]?.name ?? ""
    : "";
  const items = Object.keys(outputs).map((key) => {
    const output = outputs[key];
    if (!output) {
      return null;
    }
    if (firstOutput === "") {
      firstOutput = output.name ?? "";
    }
    return (
      <Accordion.Item key={output.name} value={output.name ?? ""}>
        <Accordion.Control>{output.name}</Accordion.Control>
        <Accordion.Panel>
          <OutputCard output={output} updateOutputsAsync={updateOutputsAsync} />
        </Accordion.Panel>
      </Accordion.Item>
    );
  });
  return <Accordion defaultValue={firstOutput}>{items}</Accordion>;
}
