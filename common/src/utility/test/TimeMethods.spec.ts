import { assert } from "chai";
import { isBetweenTimeStamp, isBetweenMonthDate, formatMilitaryTime } from "../TimeMethods";

describe("TimeMethods", function () {
  describe("isBetweenTimeStamp", function () {
    it("should return true when time is between start and end time", function () {
      const now = new Date();
      now.setHours(12, 30, 0, 0);

      assert.isTrue(isBetweenTimeStamp("10:00", "14:00", now));
    });

    it("should return true when time is exactly at start time", function () {
      const now = new Date();
      now.setHours(10, 0, 0, 0);

      assert.isTrue(isBetweenTimeStamp("10:00", "14:00", now));
    });

    it("should return false when time is exactly at end time", function () {
      const now = new Date();
      now.setHours(14, 0, 0, 0);

      assert.isFalse(isBetweenTimeStamp("10:00", "14:00", now));
    });

    it("should handle cross-midnight scenarios (end before start)", function () {
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

    it("should handle different minute values correctly", function () {
      const now = new Date();
      now.setHours(10, 45, 0, 0);

      assert.isTrue(isBetweenTimeStamp("10:30", "11:15", now));
    });

    it("should ignore seconds and milliseconds in comparisons", function () {
      const now = new Date();
      now.setHours(10, 30, 45, 999);

      assert.isTrue(isBetweenTimeStamp("10:00", "11:00", now));
    });

    it("should return false if either start or end time is not provided", function () {
      const now = new Date();
      now.setHours(10, 30, 0, 0);

      assert.isFalse(isBetweenTimeStamp(null, "11:00", now));
      assert.isFalse(isBetweenTimeStamp("", "11:00", now));
      assert.isFalse(isBetweenTimeStamp("10:00", null, now));
      assert.isFalse(isBetweenTimeStamp("10:00", "", now));
      assert.isFalse(isBetweenTimeStamp(null, null, now));
    });

    it("should return false if start or end time is not in HH:MM format", function () {
      const now = new Date();
      now.setHours(10, 30, 0, 0);

      assert.isFalse(isBetweenTimeStamp("10:00", "11:00 AM", now));
      assert.isFalse(isBetweenTimeStamp("10:00", "11:00:00", now));
      assert.isFalse(isBetweenTimeStamp("10:00 AM", "11:00", now));
      assert.isFalse(isBetweenTimeStamp("10:00:00", "11:00", now));
    });
  });

  describe("isBetweenMonthDate", () => {
    it("should return true if now is on or between the start month/day and end month/day", () => {
      const now = new Date();
      now.setMonth(1);
      now.setDate(28);
      assert.isFalse(isBetweenMonthDate(3, 1, 12, 31, now));

      // On start date
      now.setMonth(2);
      now.setDate(1);
      assert.isTrue(isBetweenMonthDate(3, 1, 12, 31, now));

      // Between start and end date
      now.setMonth(5);
      now.setDate(15);
      assert.isTrue(isBetweenMonthDate(3, 1, 12, 31, now));

      // On end date
      now.setMonth(11);
      now.setDate(31);
      assert.isTrue(isBetweenMonthDate(3, 1, 12, 31, now));
    });

    it("should  handle leap years appropriately", () => {
      const now = new Date();
      now.setMonth(1);
      now.setDate(28);
      assert.isTrue(isBetweenMonthDate(2, 28, 3, 1, now));

      now.setDate(29);
      assert.isTrue(isBetweenMonthDate(2, 28, 3, 1, now));

      now.setDate(30);
      assert.isFalse(isBetweenMonthDate(2, 28, 3, 1, now));
    });

    it("should handle wrapping conditions appropriately", () => {
      const now = new Date();
      now.setMonth(9);
      now.setDate(14);
      assert.isFalse(isBetweenMonthDate(10, 15, 2, 20, now));

      now.setMonth(9);
      now.setDate(15);
      assert.isTrue(isBetweenMonthDate(10, 15, 2, 20, now));

      now.setMonth(0);
      now.setDate(1);
      assert.isTrue(isBetweenMonthDate(10, 15, 2, 20, now));

      now.setMonth(1);
      now.setDate(20);
      assert.isTrue(isBetweenMonthDate(10, 15, 2, 20, now));

      now.setMonth(1);
      now.setDate(21);
      assert.isFalse(isBetweenMonthDate(10, 15, 2, 20, now));
    });
  });

  describe("formatMilitaryTime", function () {
    it("should format time correctly", function () {
      assert.equal(formatMilitaryTime("00:00"), "12:00AM");
      assert.equal(formatMilitaryTime("01:30"), "1:30AM");
      assert.equal(formatMilitaryTime("12:00"), "12:00PM");
      assert.equal(formatMilitaryTime("13:15"), "1:15PM");
      assert.equal(formatMilitaryTime("23:45"), "11:45PM");
    });

    it("should return undefined for null or undefined input", function () {
      assert.isUndefined(formatMilitaryTime(null));
      assert.isUndefined(formatMilitaryTime(undefined));
    });

    it("should return the original string if it doesn't match the expected format", function () {
      assert.equal(formatMilitaryTime("invalid"), "invalid");
      assert.equal(formatMilitaryTime("2:00"), "2:00");
      assert.equal(formatMilitaryTime("25:00"), "25:00");
      assert.equal(formatMilitaryTime("10:60"), "10:60");
    });
  });
});
