import { DateRangeCondition } from "../DateRangeCondition";

import { assert } from "chai";

describe("DateRangeCondition.ts tests", () => {
  describe("evaluate", () => {
    it("should return true if now is between the start month/day and end month/day", () => {
      const dateRangeCondition = new DateRangeCondition(1, "allOf", 3, 1, 12, 31);
      const now = new Date();
      now.setMonth(2);
      now.setDate(28);
      assert.isFalse(dateRangeCondition.evaluate(now));

      const leapYearDateRangeCondition = new DateRangeCondition(1, "allOf", 2, 28, 3, 1);
      now.setMonth(1);
      now.setDate(28);
      assert.isTrue(leapYearDateRangeCondition.evaluate(now));

      now.setDate(29);
      assert.isTrue(leapYearDateRangeCondition.evaluate(now));

      now.setDate(30);
      assert.isFalse(leapYearDateRangeCondition.evaluate(now));

      const wrappingTimeCondition = new DateRangeCondition(1, "allOf", 10, 15, 2, 20);
      now.setMonth(9);
      now.setDate(14);
      assert.isFalse(wrappingTimeCondition.evaluate(now));

      now.setMonth(9);
      now.setDate(15);
      assert.isTrue(wrappingTimeCondition.evaluate(now));

      now.setMonth(0);
      now.setDate(1);
      assert.isTrue(wrappingTimeCondition.evaluate(now));

      now.setMonth(1);
      now.setDate(20);
      assert.isTrue(wrappingTimeCondition.evaluate(now));

      now.setMonth(1);
      now.setDate(21);
      assert.isFalse(wrappingTimeCondition.evaluate(now));
    });
  });
});