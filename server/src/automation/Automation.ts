import { AutomationOperator } from "@sproot/automation/IAutomation";
import { IConditionProperties } from "@sproot/automation/IConditionProperties";
import { OutputList } from "../outputs/list/OutputList";
import { SensorList } from "../sensors/list/SensorList";
import { Conditions } from "./conditions/Conditions";
import { TimeExpressionResolver } from "./conditions/TimeExpressionResolver";
import type { IConditionsRepository } from "../database/repositories/automations/conditions/IConditionsRepository";

export class Automation {
  id: number;
  name: string;
  operator: AutomationOperator;
  enabled: boolean;
  conditions: Conditions;
  #isTriggered = false;

  private constructor(
    id: number,
    name: string,
    operator: AutomationOperator,
    enabled: boolean,
    conditionsRepository: IConditionsRepository,
    timeExpressionResolver: TimeExpressionResolver = TimeExpressionResolver.createNoop(),
  ) {
    this.id = id;
    this.name = name;
    this.operator = operator;
    this.enabled = enabled;
    this.conditions = new Conditions(this.id, conditionsRepository, timeExpressionResolver);
  }

  static async createInstanceAsync(
    id: number,
    name: string,
    operator: AutomationOperator,
    enabled: boolean,
    conditionsRepository: IConditionsRepository,
    timeExpressionResolver: TimeExpressionResolver = TimeExpressionResolver.createNoop(),
  ): Promise<Automation> {
    const automation = new Automation(
      id,
      name,
      operator,
      enabled,
      conditionsRepository,
      timeExpressionResolver,
    );
    await automation.conditions.loadAsync();
    return automation;
  }

  get isTriggered(): boolean {
    return this.#isTriggered;
  }

  setTriggered(isTriggered: boolean): void {
    this.#isTriggered = isTriggered;
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
      this.#isTriggered = false;
      return {
        result: false,
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      };
    }

    const evaluation = await this.conditions.evaluate(this.operator, sensorList, outputList, now);
    this.#isTriggered = evaluation.result;
    return evaluation;
  }
}
