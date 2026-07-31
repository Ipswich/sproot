import { describe, it } from "mocha";
import { assert } from "chai";
import { validateDuration, VALID_DURATION_UNITS } from "../DurationValidation";

describe("DurationValidation", function () {
  describe("validateDuration", function () {
    it("should return valid for '30 days'", function () {
      const result = validateDuration("30 days");
      assert.isTrue(result.valid);
    });

    it("should return valid for '1 hour'", function () {
      const result = validateDuration("1 hour");
      assert.isTrue(result.valid);
    });

    it("should return valid for '2 weeks'", function () {
      const result = validateDuration("2 weeks");
      assert.isTrue(result.valid);
    });

    it("should trim whitespace before validating", function () {
      const result = validateDuration("  30 days  ");
      assert.isTrue(result.valid);
    });

    it("should return invalid for empty string", function () {
      const result = validateDuration("");
      assert.isFalse(result.valid);
      assert.include(result.errors[0], "empty");
    });

    it("should include context in error message for empty string", function () {
      const result = validateDuration("", "sensors.raw_retention");
      assert.isFalse(result.valid);
      assert.include(result.errors[0], "sensors.raw_retention");
      assert.include(result.errors[0], "empty");
    });

    it("should return invalid for malformed string", function () {
      const result = validateDuration("abc");
      assert.isFalse(result.valid);
      assert.include(result.errors[0], "does not match expected format");
    });

    it("should return invalid for zero amount", function () {
      const result = validateDuration("0 days");
      assert.isFalse(result.valid);
      assert.include(result.errors[0], "must be positive");
      assert.include(result.errors[0], "0");
    });

    it("should return invalid for negative amount", function () {
      const result = validateDuration("-5 days");
      assert.isFalse(result.valid);
      assert.include(result.errors[0], "does not match expected format");
    });

    it("should return invalid for unknown unit", function () {
      const result = validateDuration("30 foobars");
      assert.isFalse(result.valid);
      assert.include(result.errors[0], "Unknown time unit");
      assert.include(result.errors[0], "foobars");
    });

    it("should include context in error message for unknown unit", function () {
      const result = validateDuration("30 foobars", "outputs.raw_retention");
      assert.isFalse(result.valid);
      assert.include(result.errors[0], "outputs.raw_retention");
    });

    it("should accept all valid units from VALID_DURATION_UNITS", function () {
      for (const unit of VALID_DURATION_UNITS) {
        const result = validateDuration(`1 ${unit}`);
        assert.isTrue(result.valid, `Expected '1 ${unit}' to be valid`);
      }
    });
  });
});
