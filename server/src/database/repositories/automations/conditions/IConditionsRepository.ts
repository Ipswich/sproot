import { ISensorConditionsRepository } from "./ISensorConditionsRepository";
import { IOutputConditionsRepository } from "./IOutputConditionsRepository";
import { ITimeConditionsRepository } from "./ITimeConditionsRepository";
import { IWeekdayConditionsRepository } from "./IWeekdayConditionsRepository";
import { IMonthConditionsRepository } from "./IMonthConditionsRepository";
import { IDateRangeConditionsRepository } from "./IDateRangeConditionsRepository";

export type IConditionsRepository = {
  sensor: ISensorConditionsRepository;
  output: IOutputConditionsRepository;
  time: ITimeConditionsRepository;
  weekday: IWeekdayConditionsRepository;
  month: IMonthConditionsRepository;
  dateRange: IDateRangeConditionsRepository;
};
