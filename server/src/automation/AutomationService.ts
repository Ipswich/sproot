import { EventEmitter } from "events";
import { TRIGGERED_AUTOMATIONS_EVENT } from "../utils/EventConstants";
import { AutomationEvent, AutomationEventPayload } from "./AutomationEvent";
import { Automation } from "./Automation";
import { OutputList } from "../outputs/list/OutputList";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { AutomationOperator } from "@sproot/automation/IAutomation";
import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ConditionTypes";
import { TimeCondition } from "./conditions/TimeCondition";
import { SensorCondition } from "./conditions/SensorCondition";
import { OutputCondition } from "./conditions/OutputCondition";
import { ReadingType } from "@sproot/sensors/ReadingType";
import { WeekdayCondition } from "./conditions/WeekdayCondition";
import { MonthCondition } from "./conditions/MonthCondition";
import { DateRangeCondition } from "./conditions/DateRangeCondition";
import { SensorList } from "../sensors/list/SensorList";

/**
 * Central automation evaluator and event emitter.
 * Loads all automations from the database, evaluates them, and emits events when they trigger.
 */
class AutomationService extends EventEmitter {
  #automations: Map<number, Automation>; // Key: automationId
  #sprootDB: ISprootDB;

  static async createInstanceAsync(sprootDB: ISprootDB): Promise<AutomationService> {
    const service = new AutomationService(sprootDB);
    await service.loadAllAutomationsAsync();
    return service;
  }

  private constructor(sprootDB: ISprootDB) {
    super();
    this.#sprootDB = sprootDB;
    this.#automations = new Map();
  }

  /**
   * Load all automations from the database.
   */
  async loadAllAutomationsAsync(): Promise<void> {
    const rawAutomations = await this.#sprootDB.getAutomationsAsync();
    this.#automations = new Map();

    for (const automation of rawAutomations) {
      this.#automations.set(
        automation.automationId,
        new Automation(
          automation.automationId,
          automation.name,
          automation.operator,
          automation.enabled,
          this.#sprootDB,
        ),
      );
    }
  }

  /**
   * Central evaluation entry point - evaluates all automations and emits events.
   */
  async evaluateAllAutomationsAsync(
    sensorList: SensorList,
    outputList: OutputList,
    now: Date,
  ): Promise<void> {
    // Evaluate each automation once
    const evaluatedAutomations: Array<{
      automation: Automation;
      payload: AutomationEventPayload;
    }> = [];

    for (const [_automationId, automation] of this.#automations.entries()) {
      if (!automation.enabled) continue;

      const result = await automation.evaluate(sensorList, outputList, now);
      if (result.result) {
        evaluatedAutomations.push({
          automation,
          payload: {
            automationId: automation.id,
            automationName: automation.name,
            operator: automation.operator,
            conditions: result.conditions,
          },
        });
      }
    }

    // Emit single AutomationEvent with all triggered automations
    const triggeredAutomationsMap = new Map(
      evaluatedAutomations.map((e) => [e.automation.id, e.payload]),
    );

    if (triggeredAutomationsMap.size > 0) {
      this.emit(TRIGGERED_AUTOMATIONS_EVENT, new AutomationEvent(triggeredAutomationsMap, now));
    }
  }

  // CRUD methods
  async addAutomationAsync(name: string, operator: AutomationOperator): Promise<number> {
    const resultId = await this.#sprootDB.addAutomationAsync(name, operator);
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async deleteAutomationAsync(id: number) {
    await this.#sprootDB.deleteAutomationAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async updateAutomationAsync(
    id: number,
    name: string,
    operator: AutomationOperator,
    enabled: boolean,
  ) {
    await this.#sprootDB.updateAutomationAsync(name, operator, id, enabled);
    await this.#postAutomationChangeFunctionAsync();
  }

  async addSensorConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
    sensorId: number,
    readingType: ReadingType,
  ) {
    const resultId = await this.#sprootDB.addSensorConditionAsync(
      automationId,
      type,
      operator,
      comparisonValue,
      comparisonLookback,
      sensorId,
      readingType,
    );
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async addOutputConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
    outputId: number,
  ) {
    const resultId = await this.#sprootDB.addOutputConditionAsync(
      automationId,
      type,
      operator,
      comparisonValue,
      comparisonLookback,
      outputId,
    );
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async addTimeConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    startTime: string | null | undefined,
    endTime: string | null | undefined,
  ) {
    const resultId = await this.#sprootDB.addTimeConditionAsync(
      automationId,
      type,
      startTime,
      endTime,
    );
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async addWeekdayConditionAsync(automationId: number, type: ConditionGroupType, weekdays: number) {
    const resultId = await this.#sprootDB.addWeekdayConditionAsync(automationId, type, weekdays);
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async addMonthConditionAsync(automationId: number, type: ConditionGroupType, months: number) {
    const resultId = await this.#sprootDB.addMonthConditionAsync(automationId, type, months);
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async addDateRangeConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    startMonth: number,
    startDate: number,
    endMonth: number,
    endDate: number,
  ) {
    const resultId = await this.#sprootDB.addDateRangeConditionAsync(
      automationId,
      type,
      startMonth,
      startDate,
      endMonth,
      endDate,
    );
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async updateConditionAsync(
    automationId: number,
    condition:
      | OutputCondition
      | SensorCondition
      | TimeCondition
      | WeekdayCondition
      | MonthCondition
      | DateRangeCondition,
  ) {
    if (condition instanceof SensorCondition) {
      await this.#sprootDB.updateSensorConditionAsync(automationId, condition);
    } else if (condition instanceof OutputCondition) {
      await this.#sprootDB.updateOutputConditionAsync(automationId, condition);
    } else if (condition instanceof TimeCondition) {
      await this.#sprootDB.updateTimeConditionAsync(automationId, condition);
    } else if (condition instanceof WeekdayCondition) {
      await this.#sprootDB.updateWeekdayConditionAsync(automationId, condition);
    } else if (condition instanceof MonthCondition) {
      await this.#sprootDB.updateMonthConditionAsync(automationId, condition);
    } else if (condition instanceof DateRangeCondition) {
      await this.#sprootDB.updateDateRangeConditionAsync(automationId, condition);
    } else {
      return;
    }
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteSensorConditionAsync(id: number) {
    await this.#sprootDB.deleteSensorConditionAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteOutputConditionAsync(id: number) {
    await this.#sprootDB.deleteOutputConditionAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteTimeConditionAsync(id: number) {
    await this.#sprootDB.deleteTimeConditionAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteWeekdayConditionAsync(id: number) {
    await this.#sprootDB.deleteWeekdayConditionAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteMonthConditionAsync(id: number) {
    await this.#sprootDB.deleteMonthConditionAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteDateRangeConditionAsync(id: number) {
    await this.#sprootDB.deleteDateRangeConditionAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  // Output actions - Maybe extract this to a separate class to trigger outputList to update its in-memory data instead of hitting the DB on every event evaluation?
  addOutputActionAsync(automationId: number, outputId: number, value: number) {
    return this.#sprootDB.addOutputActionAsync(automationId, outputId, value);
  }

  deleteOutputActionAsync(outputActionId: number) {
    return this.#sprootDB.deleteOutputActionAsync(outputActionId);
  }

  #postAutomationChangeFunctionAsync() {
    return this.loadAllAutomationsAsync();
  }
}

export { AutomationService };
