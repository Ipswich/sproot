import { IConditionsRepository } from "@sproot/common/dist/database/automations/conditions/IConditionsRepository";
import { Knex } from "knex";
import { DateRangeConditionsRepository } from "./conditions/DateRangeConditionsRepository";
import { MonthConditionsRepository } from "./conditions/MonthConditionsRepository";
import { OutputConditionsRepository } from "./conditions/OutputConditionsRepository";
import { SensorConditionsRepository } from "./conditions/SensorConditionsRepository";
import { TimeConditionsRepository } from "./conditions/TimeConditionsRepository";
import { WeekdayConditionsRepository } from "./conditions/WeekdayConditionsRepository";

export class ConditionsRepository implements IConditionsRepository {
  sensor: SensorConditionsRepository;
  output: OutputConditionsRepository;
  time: TimeConditionsRepository;
  weekday: WeekdayConditionsRepository;
  month: MonthConditionsRepository;
  dateRange: DateRangeConditionsRepository;

  constructor(connection: Knex) {
    this.sensor = new SensorConditionsRepository(connection);
    this.output = new OutputConditionsRepository(connection);
    this.time = new TimeConditionsRepository(connection);
    this.weekday = new WeekdayConditionsRepository(connection);
    this.month = new MonthConditionsRepository(connection);
    this.dateRange = new DateRangeConditionsRepository(connection);
  }
}
