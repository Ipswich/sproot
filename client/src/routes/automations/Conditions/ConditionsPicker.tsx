import { Fragment } from "react/jsx-runtime";
import { Flex, Select } from "@mantine/core";
import { useState } from "react";

export default function ConditionsPicker() {
  const [conditionType, setConditionType] = useState<string | null>("Sensor");

  return (
    <Fragment>
      <Flex>
        <Select
          label="Condition Type"
          value={conditionType}
          data={["Sensor", "Time", "Output"]}
          onChange={(value) => setConditionType(value)}
        >
        </Select>
      </Flex>
      {updateDisplayedCondition(conditionType)}
    </Fragment>
  );
}

function updateDisplayedCondition(conditionType: string | null) {
  switch (conditionType) {
    case "Sensor":
      return "SENSOR!"//<SensorCondition />;
    case "Time":
      return "TIME!"//<TimeCondition />;
    case "Output":
      return "OUTPUT!"//<OutputCondition />;
  }
  return <></>
}