import { IAutomationEventPayload } from "@sproot/automation/IAutomationEventPayload";
import { Automation } from "./Automation";
import { OutputList } from "../outputs/list/OutputList";
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
import type { IAutomationsRepository } from "../database/repositories/automations/IAutomationsRepository";
import { OutputActionPrecedence } from "@sproot/common/automation/OutputActionPrecedence";
import { TimeConditionPhaseAnchorType } from "@sproot/common/automation/ITimeCondition";
import { TimeExpressionResolver } from "./conditions/TimeExpressionResolver";

/**
 * Central automation evaluator and event emitter.
 * Loads all automations from the database, evaluates them, and emits events when they trigger.
 */
class AutomationService {
  #automations: Map<number, Automation>; // Key: automationId
  #automationsRepository: IAutomationsRepository;
  #eventBus: IEventBus;
  #logger: winston.Logger;
  #timeExpressionResolver: TimeExpressionResolver;

  static async createInstanceAsync(
    automationsRepository: IAutomationsRepository,
    eventBus: IEventBus,
    logger: winston.Logger,
    timeExpressionResolver: TimeExpressionResolver = TimeExpressionResolver.createNoop(),
  ): Promise<AutomationService> {
    const service = new AutomationService(
      automationsRepository,
      eventBus,
      logger,
      timeExpressionResolver,
    );
    await service.loadAllAutomationsAsync();
    return service;
  }

  private constructor(
    automationsRepository: IAutomationsRepository,
    eventBus: IEventBus,
    logger: winston.Logger,
    timeExpressionResolver: TimeExpressionResolver = TimeExpressionResolver.createNoop(),
  ) {
    this.#automationsRepository = automationsRepository;
    this.#eventBus = eventBus;
    this.#automations = new Map();
    this.#logger = logger;
    this.#timeExpressionResolver = timeExpressionResolver;
  }

  get timeExpressionResolver(): TimeExpressionResolver {
    return this.#timeExpressionResolver;
  }

  getAutomations(): Automation[] {
    return Array.from(this.#automations.values());
  }

  /**
   * Load all automations from the database.
   */
  async loadAllAutomationsAsync(): Promise<void> {
    try {
      const previousAutomations = this.#automations;
      const rawAutomations = await this.#automationsRepository.getAllAsync();
      this.#automations = new Map();

      const promises = rawAutomations.map(async (automation) => {
        const automationInstance = await Automation.createInstanceAsync(
          automation.id,
          automation.name,
          automation.operator,
          automation.enabled,
          this.#automationsRepository.conditions,
          this.#timeExpressionResolver,
        );

        const previousAutomation = previousAutomations.get(automation.id);
        if (previousAutomation != null) {
          automationInstance.setTriggered(previousAutomation.isTriggered);
        }

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
    const resultId = await this.#automationsRepository.addAsync(name, operator);
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async deleteAutomationAsync(id: number) {
    await this.#automationsRepository.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async updateAutomationAsync(
    id: number,
    name: string,
    operator: AutomationOperator,
    enabled: boolean,
  ) {
    await this.#automationsRepository.updateAsync(name, operator, id, enabled);
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
    const resultId = await this.#automationsRepository.conditions.sensor.addAsync(
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
    const resultId = await this.#automationsRepository.conditions.output.addAsync(
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
    repeatInterval: number | null | undefined,
    repeatDuration: number | null | undefined,
    phaseAnchorType: TimeConditionPhaseAnchorType | null | undefined,
    phaseAnchorValue: string | null | undefined,
  ): Promise<number> {
    const resultId = await this.#automationsRepository.conditions.time.addAsync(
      automationId,
      type,
      startTime,
      endTime,
      repeatInterval,
      repeatDuration,
      phaseAnchorType,
      phaseAnchorValue,
    );
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async addWeekdayConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    weekdays: number,
  ): Promise<number> {
    const resultId = await this.#automationsRepository.conditions.weekday.addAsync(
      automationId,
      type,
      weekdays,
    );
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async addMonthConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    months: number,
  ): Promise<number> {
    const resultId = await this.#automationsRepository.conditions.month.addAsync(
      automationId,
      type,
      months,
    );
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
    const resultId = await this.#automationsRepository.conditions.dateRange.addAsync(
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
      await this.#automationsRepository.conditions.sensor.updateAsync(automationId, condition);
    } else if (condition instanceof OutputCondition) {
      await this.#automationsRepository.conditions.output.updateAsync(automationId, condition);
    } else if (condition instanceof TimeCondition) {
      await this.#automationsRepository.conditions.time.updateAsync(automationId, condition);
    } else if (condition instanceof WeekdayCondition) {
      await this.#automationsRepository.conditions.weekday.updateAsync(automationId, condition);
    } else if (condition instanceof MonthCondition) {
      await this.#automationsRepository.conditions.month.updateAsync(automationId, condition);
    } else if (condition instanceof DateRangeCondition) {
      await this.#automationsRepository.conditions.dateRange.updateAsync(automationId, condition);
    } else {
      return;
    }
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteSensorConditionAsync(id: number) {
    await this.#automationsRepository.conditions.sensor.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteOutputConditionAsync(id: number) {
    await this.#automationsRepository.conditions.output.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteTimeConditionAsync(id: number) {
    await this.#automationsRepository.conditions.time.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteWeekdayConditionAsync(id: number) {
    await this.#automationsRepository.conditions.weekday.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteMonthConditionAsync(id: number) {
    await this.#automationsRepository.conditions.month.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteDateRangeConditionAsync(id: number) {
    await this.#automationsRepository.conditions.dateRange.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  // Notification actions
  async addNotificationActionAsync(
    automationId: number,
    subject: string,
    content: string,
  ): Promise<number> {
    const result = await this.#automationsRepository.actions.notification.addAsync(
      automationId,
      subject,
      content,
    );
    await this.#eventBus.publishAsync(new NotificationActionsModifiedEvent({}));
    return result;
  }

  async deleteNotificationActionAsync(notificationActionId: number) {
    await this.#automationsRepository.actions.notification.deleteAsync(notificationActionId);
    await this.#eventBus.publishAsync(new NotificationActionsModifiedEvent({}));
  }

  // Output actions
  async addOutputActionAsync(
    automationId: number,
    outputId: number,
    value: number,
    precedence: OutputActionPrecedence,
  ): Promise<number> {
    const result = await this.#automationsRepository.actions.output.addAsync(
      automationId,
      outputId,
      value,
      precedence,
    );
    await this.#eventBus.publishAsync(new OutputActionsModifiedEvent({}));
    return result;
  }

  async deleteOutputActionAsync(outputActionId: number) {
    await this.#automationsRepository.actions.output.deleteAsync(outputActionId);
    await this.#eventBus.publishAsync(new OutputActionsModifiedEvent({}));
  }

  #postAutomationChangeFunctionAsync() {
    return this.loadAllAutomationsAsync();
  }
}

export { AutomationService };
