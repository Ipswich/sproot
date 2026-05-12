import { AutomationOperator } from "@sproot/automation/IAutomation";
import { IConditionProperties } from "@sproot/automation/IConditionProperties";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { OutputList } from "../outputs/list/OutputList";
import { SensorList } from "../sensors/list/SensorList";
import { Conditions } from "./conditions/Conditions";

export class Automation {
  id: number;
  name: string;
  operator: AutomationOperator;
  enabled: boolean;
  conditions: Conditions;

  private constructor(
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

  static async createInstanceAsync(
    id: number,
    name: string,
    operator: AutomationOperator,
    enabled: boolean,
    sprootDB: ISprootDB,
  ): Promise<Automation> {
    const automation = new Automation(id, name, operator, enabled, sprootDB);
    await automation.conditions.loadAsync();
    return automation;
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

    return this.conditions.evaluate(this.operator, sensorList, outputList, now);
  }
}
