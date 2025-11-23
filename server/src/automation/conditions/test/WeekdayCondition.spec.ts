import { WeekdayCondition } from "../WeekdayCondition.js";

import { assert } from "chai";

describe("WeekdayCondition.ts tests", () => {
  describe("evaluate", () => {
    it("should return true if now's integer date is within the provided number", () => {
      // Sunday
      const now = new Date("2020-01-06T00:00:00Z");

      // No days
      let weekdayCondition = new WeekdayCondition(1, "allOf", 0);
      assert.isFalse(weekdayCondition.evaluate(now), "No days");

      // Sunday
      weekdayCondition = new WeekdayCondition(1, "allOf", 1);
      assert.isTrue(weekdayCondition.evaluate(now), "Sunday");

      // Sunday and Tuesday
      weekdayCondition = new WeekdayCondition(1, "allOf", 5);
      assert.isTrue(weekdayCondition.evaluate(now), "Sunday and Tuesday");

      // Just Tuesday
      weekdayCondition = new WeekdayCondition(1, "allOf", 4);
      assert.isFalse(weekdayCondition.evaluate(now), "Just Tuesday");
    });
  });
});
