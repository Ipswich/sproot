import { IAutomationEventPayload } from "@sproot/automation/IAutomationEventPayload";
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
import winston from "winston";
import { IEventBus } from "../eventbus/IEventBus";
import { AutomationsTriggeredEvent } from "../eventbus/events/automations/AutomationsTriggeredEvent";
import { OutputActionsModifiedEvent } from "../eventbus/events/actions/OutputActionsModifiedEvent";
import { NotificationActionsModifiedEvent } from "../eventbus/events/actions/NotificationActionsModifiedEvent";

/**
 * Central automation evaluator and event emitter.
 * Loads all automations from the database, evaluates them, and emits events when they trigger.
 */
class AutomationService {
  #automations: Map<number, Automation>; // Key: automationId
  #sprootDB: ISprootDB;
  #eventBus: IEventBus;
  #logger: winston.Logger;

  static async createInstanceAsync(
    sprootDB: ISprootDB,
    eventBus: IEventBus,
    logger: winston.Logger,
  ): Promise<AutomationService> {
    const service = new AutomationService(sprootDB, eventBus, logger);
    await service.loadAllAutomationsAsync();
    return service;
  }

  private constructor(sprootDB: ISprootDB, eventBus: IEventBus, logger: winston.Logger) {
    this.#sprootDB = sprootDB;
    this.#eventBus = eventBus;
    this.#automations = new Map();
    this.#logger = logger;
  }

  /**
   * Load all automations from the database.
   */
  async loadAllAutomationsAsync(): Promise<void> {
    try {
      const rawAutomations = await this.#sprootDB.automations.getAllAsync();
      this.#automations = new Map();

      const promises = rawAutomations.map(async (automation) => {
        const automationInstance = await Automation.createInstanceAsync(
          automation.id,
          automation.name,
          automation.operator,
          automation.enabled,
          this.#sprootDB,
        );
        return [automation.id, automationInstance] as [number, Automation];
      });

      const automationEntries = await Promise.all(promises);
      this.#automations = new Map(automationEntries);
    } catch (error) {
      this.#logger.error(`Error loading automations from database: ${error}`);
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
      payload: IAutomationEventPayload;
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

    await this.#eventBus.publishAsync(new AutomationsTriggeredEvent(triggeredAutomationsMap, now));
  }

  // CRUD methods
  async addAutomationAsync(name: string, operator: AutomationOperator): Promise<number> {
    const resultId = await this.#sprootDB.automations.addAsync(name, operator);
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async deleteAutomationAsync(id: number) {
    await this.#sprootDB.automations.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async updateAutomationAsync(
    id: number,
    name: string,
    operator: AutomationOperator,
    enabled: boolean,
  ) {
    await this.#sprootDB.automations.updateAsync(name, operator, id, enabled);
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
  ): Promise<number> {
    const resultId = await this.#sprootDB.conditions.sensor.addAsync(
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
  ): Promise<number> {
    const resultId = await this.#sprootDB.conditions.output.addAsync(
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
  ): Promise<number> {
    const resultId = await this.#sprootDB.conditions.time.addAsync(
      automationId,
      type,
      startTime,
      endTime,
    );
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async addWeekdayConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    weekdays: number,
  ): Promise<number> {
    const resultId = await this.#sprootDB.conditions.weekday.addAsync(automationId, type, weekdays);
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async addMonthConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    months: number,
  ): Promise<number> {
    const resultId = await this.#sprootDB.conditions.month.addAsync(automationId, type, months);
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
  ): Promise<number> {
    const resultId = await this.#sprootDB.conditions.dateRange.addAsync(
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
      await this.#sprootDB.conditions.sensor.updateAsync(automationId, condition);
    } else if (condition instanceof OutputCondition) {
      await this.#sprootDB.conditions.output.updateAsync(automationId, condition);
    } else if (condition instanceof TimeCondition) {
      await this.#sprootDB.conditions.time.updateAsync(automationId, condition);
    } else if (condition instanceof WeekdayCondition) {
      await this.#sprootDB.conditions.weekday.updateAsync(automationId, condition);
    } else if (condition instanceof MonthCondition) {
      await this.#sprootDB.conditions.month.updateAsync(automationId, condition);
    } else if (condition instanceof DateRangeCondition) {
      await this.#sprootDB.conditions.dateRange.updateAsync(automationId, condition);
    } else {
      return;
    }
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteSensorConditionAsync(id: number) {
    await this.#sprootDB.conditions.sensor.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteOutputConditionAsync(id: number) {
    await this.#sprootDB.conditions.output.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteTimeConditionAsync(id: number) {
    await this.#sprootDB.conditions.time.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteWeekdayConditionAsync(id: number) {
    await this.#sprootDB.conditions.weekday.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteMonthConditionAsync(id: number) {
    await this.#sprootDB.conditions.month.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteDateRangeConditionAsync(id: number) {
    await this.#sprootDB.conditions.dateRange.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  // Notification actions
  async addNotificationActionAsync(
    automationId: number,
    subject: string,
    content: string,
  ): Promise<number> {
    const result = await this.#sprootDB.automations.addNotificationActionAsync(
      automationId,
      subject,
      content,
    );
    await this.#eventBus.publishAsync(new NotificationActionsModifiedEvent({}));
    return result;
  }

  async deleteNotificationActionAsync(notificationActionId: number) {
    await this.#sprootDB.automations.deleteNotificationActionAsync(notificationActionId);
    await this.#eventBus.publishAsync(new NotificationActionsModifiedEvent({}));
  }

  // Output actions
  async addOutputActionAsync(
    automationId: number,
    outputId: number,
    value: number,
  ): Promise<number> {
    const result = await this.#sprootDB.automations.addOutputActionAsync(
      automationId,
      outputId,
      value,
    );
    await this.#eventBus.publishAsync(new OutputActionsModifiedEvent({}));
    return result;
  }

  async deleteOutputActionAsync(outputActionId: number) {
    await this.#sprootDB.automations.deleteOutputActionAsync(outputActionId);
    await this.#eventBus.publishAsync(new OutputActionsModifiedEvent({}));
  }

  #postAutomationChangeFunctionAsync() {
    return this.loadAllAutomationsAsync();
  }
}

export { AutomationService };
