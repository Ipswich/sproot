import { RowDataPacket } from "mysql2";
import { ConditionGroupType } from "../automation/ICondition";

type SDBTimeAutomationCondition = RowDataPacket & {
  id: number;
  automationId: number;
  type: ConditionGroupType;
  startTime: string | null;
  endTime: string | null;
};

export type { SDBTimeAutomationCondition };