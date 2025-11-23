import { OutputList } from "../../outputs/list/OutputList.js";
import { SensorList } from "../../sensors/list/SensorList.js";
import { AutomationOperator, IAutomation } from "@sproot/automation/IAutomation.js";
import { Conditions } from "../conditions/Conditions.js";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB.js";

export class OutputAutomation implements IAutomation {
  id: number;
  name: string;
  value: number;
  operator: AutomationOperator;
  enabled: boolean;
  conditions: Conditions;

  constructor(
    id: number,
    name: string,
    value: number,
    operator: AutomationOperator,
    enabled: boolean,
    sprootDB: ISprootDB,
  ) {
    this.id = id;
    this.name = name;
    this.value = value;
    this.operator = operator;
    this.enabled = enabled;
    this.conditions = new Conditions(this.id, sprootDB);
  }

  evaluate(sensorList: SensorList, outputList: OutputList, now: Date): number | null {
    if (!this.enabled) {
      return null;
    }

    return this.conditions.evaluate(this.operator, sensorList, outputList, now) ? this.value : null;
  }
}
