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
import {
  NotificationActionDeletedEvent,
  NotificationActionUpdatedEvent,
} from "../eventbus/events/actions/NotificationActionEvents";
import {
  OutputActionDeletedEvent,
  OutputActionUpdatedEvent,
} from "../eventbus/events/actions/OutputActionEvents";
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
  #sensorList: SensorList;
  #outputList: OutputList;

  static async createInstanceAsync(
    automationsRepository: IAutomationsRepository,
    eventBus: IEventBus,
    sensorList: SensorList,
    outputList: OutputList,
    timeExpressionResolver: TimeExpressionResolver = TimeExpressionResolver.createNoop(),
    logger: winston.Logger,
  ): Promise<AutomationService> {
    const service = new AutomationService(
      automationsRepository,
      eventBus,
      sensorList,
      outputList,
      timeExpressionResolver,
      logger,
    );
    await service.loadAllAutomationsAsync();
    return service;
  }

  private constructor(
    automationsRepository: IAutomationsRepository,
    eventBus: IEventBus,
    sensorList: SensorList,
    outputList: OutputList,
    timeExpressionResolver: TimeExpressionResolver = TimeExpressionResolver.createNoop(),
    logger: winston.Logger,
  ) {
    this.#automationsRepository = automationsRepository;
    this.#eventBus = eventBus;
    this.#automations = new Map();
    this.#logger = logger;
    this.#timeExpressionResolver = timeExpressionResolver;
    this.#sensorList = sensorList;
    this.#outputList = outputList;
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

  async #reloadAutomationAsync(automationId: number): Promise<void> {
    const automationRecord = (await this.#automationsRepository.getByIdAsync(automationId))[0];
    if (automationRecord == null) {
      this.#automations.delete(automationId);
      return;
    }

    const previousAutomation = this.#automations.get(automationId);
    const nextAutomation = await Automation.createInstanceAsync(
      automationRecord.id,
      automationRecord.name,
      automationRecord.operator,
      automationRecord.enabled,
      this.#automationsRepository.conditions,
      this.#timeExpressionResolver,
    );

    if (previousAutomation != null) {
      nextAutomation.setTriggered(previousAutomation.isTriggered);
    }

    this.#automations.set(automationId, nextAutomation);
  }

  /**
   * Central evaluation entry point - evaluates all automations and emits events.
   */
  async evaluateAllAutomationsAsync(now: Date): Promise<void> {
    // Evaluate each automation once
    const evaluatedAutomations: Array<{
      automation: Automation;
      payload: IAutomationEventPayload;
    }> = [];

    for (const [_automationId, automation] of this.#automations.entries()) {
      if (!automation.enabled) continue;

      const result = await automation.evaluate(this.#sensorList, this.#outputList, now);
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
    await this.#postAutomationChangeFunctionAsync(resultId);
    return resultId;
  }

  async deleteAutomationAsync(id: number) {
    await this.#automationsRepository.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync(id, true);
  }

  async updateAutomationAsync(
    id: number,
    name: string,
    operator: AutomationOperator,
    enabled: boolean,
  ) {
    await this.#automationsRepository.updateAsync(name, operator, id, enabled);
    await this.#postAutomationChangeFunctionAsync(id);
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
    await this.#postAutomationChangeFunctionAsync(automationId);
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
    await this.#postAutomationChangeFunctionAsync(automationId);
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
    await this.#postAutomationChangeFunctionAsync(automationId);
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
    await this.#postAutomationChangeFunctionAsync(automationId);
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
    await this.#postAutomationChangeFunctionAsync(automationId);
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
    await this.#postAutomationChangeFunctionAsync(automationId);
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
    await this.#postAutomationChangeFunctionAsync(automationId);
  }

  async deleteSensorConditionAsync(automationId: number, id: number) {
    await this.#automationsRepository.conditions.sensor.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync(automationId);
  }

  async deleteOutputConditionAsync(automationId: number, id: number) {
    await this.#automationsRepository.conditions.output.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync(automationId);
  }

  async deleteTimeConditionAsync(automationId: number, id: number) {
    await this.#automationsRepository.conditions.time.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync(automationId);
  }

  async deleteWeekdayConditionAsync(automationId: number, id: number) {
    await this.#automationsRepository.conditions.weekday.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync(automationId);
  }

  async deleteMonthConditionAsync(automationId: number, id: number) {
    await this.#automationsRepository.conditions.month.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync(automationId);
  }

  async deleteDateRangeConditionAsync(automationId: number, id: number) {
    await this.#automationsRepository.conditions.dateRange.deleteAsync(id);
    await this.#postAutomationChangeFunctionAsync(automationId);
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
    const action = (
      await this.#automationsRepository.actions.notification.getNotificationActionByIdAsync(result)
    )[0];
    if (action != null) {
      await this.#eventBus.publishAsync(new NotificationActionUpdatedEvent({ action }));
    }
    return result;
  }

  async deleteNotificationActionAsync(notificationActionId: number) {
    const action = (
      await this.#automationsRepository.actions.notification.getNotificationActionByIdAsync(
        notificationActionId,
      )
    )[0];
    await this.#automationsRepository.actions.notification.deleteAsync(notificationActionId);
    if (action != null) {
      await this.#eventBus.publishAsync(
        new NotificationActionDeletedEvent({
          actionId: action.id,
          automationId: action.automationId,
        }),
      );
    }
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
    const action = (await this.#automationsRepository.actions.output.getOutputActionAsync(result))[0];
    if (action != null) {
      await this.#eventBus.publishAsync(new OutputActionUpdatedEvent({ action }));
    }
    return result;
  }

  async deleteOutputActionAsync(outputActionId: number) {
    const action = (
      await this.#automationsRepository.actions.output.getOutputActionAsync(outputActionId)
    )[0];
    await this.#automationsRepository.actions.output.deleteAsync(outputActionId);
    if (action != null) {
      await this.#eventBus.publishAsync(
        new OutputActionDeletedEvent({
          actionId: action.id,
          automationId: action.automationId,
          outputId: action.outputId,
        }),
      );
    }
  }

  async #postAutomationChangeFunctionAsync(
    automationId: number,
    wasDeleted: boolean = false,
  ): Promise<void> {
    if (wasDeleted) {
      this.#automations.delete(automationId);
    } else {
      await this.#reloadAutomationAsync(automationId);
    }

    await this.evaluateAllAutomationsAsync(new Date());
  }
}

export { AutomationService };
