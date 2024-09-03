import { OutputList } from "../outputs/list/OutputList";
import { SensorList } from "../sensors/list/SensorList";
import { AutomationOperator, IAutomation } from "@sproot/automation/IAutomation";
import { Conditions } from "./conditions/Conditions";
import { ISprootDB } from "@sproot/sproot-common/src/database/ISprootDB";

export class Automation implements IAutomation {
  id: number;
  name: string;
  value: number;
  operator: AutomationOperator;
  conditions: Conditions

  constructor(
    id: number,
    name: string,
    value: number,
    operator: AutomationOperator,
    sprootDB: ISprootDB
  ) {
    this.id = id;
    this.name = name;
    this.value = value;
    this.operator = operator
    this.conditions = new Conditions(this.id, sprootDB);
  }

  evaluate(sensorList: SensorList, outputList: OutputList, now: Date): number | null {
    return this.conditions.evaluate(this.operator, sensorList, outputList, now) ? this.value : null;
  }
}