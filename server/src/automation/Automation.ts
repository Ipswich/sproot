import { AutomationOperator } from "@sproot/automation/IAutomation";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { OutputList } from "../outputs/list/OutputList";
import { SensorList } from "../sensors/list/SensorList";
import { Conditions } from "./conditions/Conditions";
import { IConditionProperties } from "./conditions/Conditions";

export class Automation {
  id: number;
  name: string;
  operator: AutomationOperator;
  enabled: boolean;
  conditions: Conditions;

  constructor(
    id: number,
    name: string,
    operator: AutomationOperator,
    enabled: boolean,
    sprootDB: ISprootDB,
  ) {
    this.id = id;
    this.name = name;
    this.operator = operator;
    this.enabled = enabled;
    this.conditions = new Conditions(this.id, sprootDB);
  }

  async evaluate(
    sensorList: SensorList,
    outputList: OutputList,
    now: Date,
  ): Promise<{
    result: boolean;
    conditions: {
      allOf: { condition: IConditionProperties; result: boolean }[];
      anyOf: { condition: IConditionProperties; result: boolean }[];
      oneOf: { condition: IConditionProperties; result: boolean }[];
    };
  }> {
    if (!this.enabled) {
      return {
        result: false,
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      };
    }

    await this.conditions.loadAsync();

    return this.conditions.evaluate(this.operator, sensorList, outputList, now);
  }
}
