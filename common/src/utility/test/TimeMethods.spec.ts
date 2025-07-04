import { assert } from "chai";
import { isBetweenTimeStamp } from "../TimeMethods";

describe("TimeMethods", () => {
  describe("isBetweenTimeStamp", () => {
    it("should return true when time is between start and end time", () => {
      const now = new Date();
      now.setHours(12, 30, 0, 0);

      assert.isTrue(isBetweenTimeStamp("10:00", "14:00", now));
    });

    it("should return true when time is exactly at start time", () => {
      const now = new Date();
      now.setHours(10, 0, 0, 0);

      assert.isTrue(isBetweenTimeStamp("10:00", "14:00", now));
    });

    it("should return false when time is exactly at end time", () => {
      const now = new Date();
      now.setHours(14, 0, 0, 0);

      assert.isFalse(isBetweenTimeStamp("10:00", "14:00", now));
    });

    it("should handle cross-midnight scenarios (end before start)", () => {
      // Test time after start time (evening)
      const evening = new Date();
      evening.setHours(22, 0, 0, 0);
      assert.isTrue(isBetweenTimeStamp("21:00", "05:00", evening));

      // Test time before end time (early morning)
      const morning = new Date();
      morning.setHours(4, 0, 0, 0);
      assert.isTrue(isBetweenTimeStamp("21:00", "05:00", morning));

      // Test time outside the range
      const afternoon = new Date();
      afternoon.setHours(14, 0, 0, 0);
      assert.isFalse(isBetweenTimeStamp("21:00", "05:00", afternoon));
    });

    it("should handle different minute values correctly", () => {
      const now = new Date();
      now.setHours(10, 45, 0, 0);

      assert.isTrue(isBetweenTimeStamp("10:30", "11:15", now));
    });

    it("should ignore seconds and milliseconds in comparisons", () => {
      const now = new Date();
      now.setHours(10, 30, 45, 999);

      assert.isTrue(isBetweenTimeStamp("10:00", "11:00", now));
    });

    it("should return false if either start or end time is not provided", () => {
      const now = new Date();
      now.setHours(10, 30, 0, 0);

      assert.isFalse(isBetweenTimeStamp(null, "11:00", now));
      assert.isFalse(isBetweenTimeStamp("", "11:00", now));
      assert.isFalse(isBetweenTimeStamp("10:00", null, now));
      assert.isFalse(isBetweenTimeStamp("10:00", "", now));
      assert.isFalse(isBetweenTimeStamp(null, null, now));
    });

    it("should return false if start or end time is not in HH:MM format", () => {
      const now = new Date();
      now.setHours(10, 30, 0, 0);

      assert.isFalse(isBetweenTimeStamp("10:00", "11:00 AM", now));
      assert.isFalse(isBetweenTimeStamp("10:00", "11:00:00", now));
      assert.isFalse(isBetweenTimeStamp("10:00 AM", "11:00", now));
      assert.isFalse(isBetweenTimeStamp("10:00:00", "11:00", now));
    });
  });
});
