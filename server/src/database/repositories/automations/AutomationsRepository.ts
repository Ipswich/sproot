import type { IAutomationsRepository } from "./IAutomationsRepository";
import { AutomationOperator } from "@sproot/common/automation/IAutomation";
import { SDBAutomation } from "@sproot/common/database/SDBAutomation";
import { SDBOutputActionView } from "@sproot/common/database/SDBOutputAction";
import { Knex } from "knex";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";
import { OutputActionsRepository } from "./actions/OutputActionsRepository";
import { NotificationActionsRepository } from "./actions/NotificationActionsRepository";
import { SensorConditionsRepository } from "./conditions/SensorConditionsRepository";
import { OutputConditionsRepository } from "./conditions/OutputConditionsRepository";
import { TimeConditionsRepository } from "./conditions/TimeConditionsRepository";
import { WeekdayConditionsRepository } from "./conditions/WeekdayConditionsRepository";
import { MonthConditionsRepository } from "./conditions/MonthConditionsRepository";
import { DateRangeConditionsRepository } from "./conditions/DateRangeConditionsRepository";

export class AutomationsRepository extends BaseKnexRepository implements IAutomationsRepository {
  actions: {
    output: OutputActionsRepository;
    notification: NotificationActionsRepository;
  };
  conditions: {
    sensor: SensorConditionsRepository;
    output: OutputConditionsRepository;
    time: TimeConditionsRepository;
    weekday: WeekdayConditionsRepository;
    month: MonthConditionsRepository;
    dateRange: DateRangeConditionsRepository;
  };

  constructor(connection: Knex) {
    super(connection);
    this.actions = {
      output: new OutputActionsRepository(connection),
      notification: new NotificationActionsRepository(connection),
    };
    this.conditions = {
      sensor: new SensorConditionsRepository(connection),
      output: new OutputConditionsRepository(connection),
      time: new TimeConditionsRepository(connection),
      weekday: new WeekdayConditionsRepository(connection),
      month: new MonthConditionsRepository(connection),
      dateRange: new DateRangeConditionsRepository(connection),
    };
  }

  async getAllAsync(): Promise<SDBAutomation[]> {
    return this.connection("automations").select("*");
  }

  async getByIdAsync(automationId: number): Promise<SDBAutomation[]> {
    return this.connection("automations").where("id", automationId).select("*");
  }

  async addAsync(name: string, operator: AutomationOperator): Promise<number> {
    return this.insertAndGetIdAsync("automations", { name, operator });
  }

  async updateAsync(
    name: string,
    operator: AutomationOperator,
    id: number,
    enabled: boolean,
  ): Promise<void> {
    return this.connection("automations").where("id", id).update({ name, operator, enabled });
  }

  async deleteAsync(automationId: number): Promise<void> {
    return this.connection("automations").where("id", automationId).delete();
  }

  async deleteSensorAutomationConditionsExceptAsync(
    automationId: number,
    exceptConditionIds: number[],
  ): Promise<void> {
    return this.connection("sensor_conditions")
      .where("automation_id", automationId)
      .andWhere("id", "not in", exceptConditionIds)
      .delete();
  }

  async deleteOutputAutomationConditionsExceptAsync(
    automationId: number,
    exceptConditionIds: number[],
  ): Promise<void> {
    return this.connection("output_conditions")
      .where("automation_id", automationId)
      .andWhere("id", "not in", exceptConditionIds)
      .delete();
  }

  async getAutomationsForOutputAsync(outputId: number): Promise<SDBOutputActionView[]> {
    return this.connection("output_actions_view").where("outputId", outputId).select("*");
  }
}
