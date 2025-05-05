import { OutputList } from "../../outputs/list/OutputList";
import { SensorList } from "../../sensors/list/SensorList";
import { AutomationOperator, IAutomation } from "@sproot/automation/IAutomation";
import { Conditions } from "../conditions/Conditions";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

export class OutputAutomation implements IAutomation {
  id: number;
  name: string;
  value: number;
  operator: AutomationOperator;
  lastRunTime: Date | null;
  conditions: Conditions;
  sprootDB: ISprootDB;

  constructor(
    id: number,
    name: string,
    value: number,
    operator: AutomationOperator,
    lastRunTime: Date | null,
    sprootDB: ISprootDB,
  ) {
    this.id = id;
    this.name = name;
    this.value = value;
    this.operator = operator;
    this.lastRunTime = lastRunTime ?? null;
    this.conditions = new Conditions(this.id, sprootDB);
    this.sprootDB = sprootDB;
  }

  async evaluateAsync(
    sensorList: SensorList,
    outputList: OutputList,
    now: Date,
  ): Promise<number | null> {
    const returnValue = this.conditions.evaluate(
      this.operator,
      sensorList,
      outputList,
      now,
      this.lastRunTime,
    )
      ? this.value
      : null;
    if (returnValue != null) {
      await this.sprootDB.updateAutomationAsync(this.name, this.operator, this.id, now);
    }
    return returnValue;
  }
}
