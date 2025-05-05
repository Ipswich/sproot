import { TimeCondition } from "../TimeCondition";

import { assert } from "chai";

describe("TimeCondition.ts tests", () => {
  describe("evaluate", () => {
    it("should always return true (no startTime or endTime)", () => {
      const timeCondition = new TimeCondition(1, "allOf");
      const now = new Date();
      assert.isTrue(timeCondition.evaluate(now, null));

      now.setHours(10);
      assert.isTrue(timeCondition.evaluate(now, null));

      now.setHours(22);
      assert.isTrue(timeCondition.evaluate(now, null));
    });

    it("should return true if now is between startTime and endTime", () => {
      const timeCondition = new TimeCondition(1, "allOf", "10:00", "12:00");
      const now = new Date();
      now.setHours(9);
      now.setMinutes(0);
      assert.isFalse(timeCondition.evaluate(now, null));

      //inclusive start
      now.setHours(10);
      assert.isTrue(timeCondition.evaluate(now, null));

      now.setHours(11);
      assert.isTrue(timeCondition.evaluate(now, null));

      //exclusive end
      now.setHours(12);
      assert.isFalse(timeCondition.evaluate(now, null));

      const wrappingTimeCondition = new TimeCondition(1, "allOf", "22:00", "02:00");
      now.setHours(21);
      assert.isFalse(wrappingTimeCondition.evaluate(now, null));

      //inclusive start
      now.setHours(22);
      assert.isTrue(wrappingTimeCondition.evaluate(now, null));

      now.setHours(23);
      assert.isTrue(wrappingTimeCondition.evaluate(now, null));

      //exclusive end
      now.setHours(2);
      assert.isFalse(wrappingTimeCondition.evaluate(now, null));
    });

    it("should return true if startTime is now (only startTime)", () => {
      const timeCondition = new TimeCondition(1, "allOf", "10:09");
      const now = new Date();
      now.setHours(10);

      now.setMinutes(8);
      assert.isFalse(timeCondition.evaluate(now, null));

      now.setMinutes(9);
      assert.isTrue(timeCondition.evaluate(now, null));

      now.setMinutes(10);
      assert.isFalse(timeCondition.evaluate(now, null));
    });

    it("should return false if startTime or endTime is not in the correct format", () => {
      const timeCondition = new TimeCondition(1, "allOf", "10:00");
      const now = new Date();
      now.setHours(10);
      now.setMinutes(0);

      timeCondition.startTime = "10:0";
      assert.isFalse(timeCondition.evaluate(now, null));

      timeCondition.startTime = "10:00";
      timeCondition.endTime = "12:0";
      assert.isFalse(timeCondition.evaluate(now, null));
    });

    it("should handle 'every X minutes' case when startTime is null and endTime is a number of minutes", () => {
      // Create a condition that should run every 30 minutes
      const timeCondition = new TimeCondition(1, "allOf", null, "30");
      const now = new Date();

      // When lastRunTime is null, it should return true
      assert.isTrue(timeCondition.evaluate(now, null));

      // When less than required minutes have passed
      const recentRunTime = new Date(now.getTime() - 20 * 60000); // 20 minutes ago
      assert.isFalse(timeCondition.evaluate(now, recentRunTime));

      // When exactly required minutes have passed
      const exactRunTime = new Date(now.getTime() - 30 * 60000); // 30 minutes ago
      assert.isTrue(timeCondition.evaluate(now, exactRunTime));

      // When more than required minutes have passed
      const oldRunTime = new Date(now.getTime() - 45 * 60000); // 45 minutes ago
      assert.isTrue(timeCondition.evaluate(now, oldRunTime));

      // When endTime is not a valid number
      const invalidCondition = new TimeCondition(1, "allOf", null, "invalid");
      assert.isFalse(invalidCondition.evaluate(now, recentRunTime));
    });
  });
});
