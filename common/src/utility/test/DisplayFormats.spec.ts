import { assert } from "chai";
import {
  formatDateForChart,
  convertCelsiusToFahrenheit,
  convertFahrenheitToCelsius,
  formatDecimalReadingForDisplay,
} from "../DisplayFormats";

describe("DisplayFormats.ts", function () {
  describe("formatDateForChart", () => {
    it("should format date correctly for AM times", () => {
      const date = new Date("2024-06-15T09:05:00");
      const formatted = formatDateForChart(date);
      assert.strictEqual(formatted, "6/15 9:05 am");
    });

    it("should format date correctly for PM times", () => {
      const date = new Date("2024-06-15T15:30:00");
      const formatted = formatDateForChart(date);
      assert.strictEqual(formatted, "6/15 3:30 pm");
    });

    it("should handle string input", () => {
      const dateString = "2024-06-15T00:00:00";
      const formatted = formatDateForChart(dateString);
      assert.strictEqual(formatted, "6/15 12:00 am");
    });
  });

  describe("formatDecimalReadingForDisplay", () => {
    it("should format decimal reading to three decimal places", () => {
      const input = "3.1415926535";
      const formatted = formatDecimalReadingForDisplay(input);
      assert.strictEqual(formatted, "3.142");
    });

    it("should handle integer input", () => {
      const input = "42";
      const formatted = formatDecimalReadingForDisplay(input);
      assert.strictEqual(formatted, "42.000");
    });
  });

  describe("convertCelsiusToFahrenheit", () => {
    it("should convert Celsius to Fahrenheit correctly", () => {
      const celsius = 25;
      const expectedFahrenheit = 77; // (25 * 9/5) + 32
      const result = convertCelsiusToFahrenheit(celsius);
      assert.strictEqual(result, expectedFahrenheit);
    });

    it("should handle string input", () => {
      const celsius = "0";
      const expectedFahrenheit = 32; // (0 * 9/5) + 32
      const result = convertCelsiusToFahrenheit(celsius);
      assert.strictEqual(result, expectedFahrenheit);
    });

    it("should return undefined for undefined input", () => {
      const result = convertCelsiusToFahrenheit(undefined);
      assert.strictEqual(result, undefined);
    });

    it("should return undefined for null input", () => {
      const result = convertCelsiusToFahrenheit(null);
      assert.strictEqual(result, undefined);
    });
  });

  describe("convertFahrenheitToCelsius", () => {
    it("should convert Fahrenheit to Celsius correctly", () => {
      const fahrenheit = 77;
      const expectedCelsius = 25; // (77 - 32) * 5/9
      const result = convertFahrenheitToCelsius(fahrenheit);
      assert.strictEqual(result, expectedCelsius);
    });

    it("should handle string input", () => {
      const fahrenheit = "32";
      const expectedCelsius = 0; // (32 - 32) * 5/9
      const result = convertFahrenheitToCelsius(fahrenheit);
      assert.strictEqual(result, expectedCelsius);
    });

    it("should return undefined for undefined input", () => {
      const result = convertFahrenheitToCelsius(undefined);
      assert.strictEqual(result, undefined);
    });

    it("should return undefined for null input", () => {
      const result = convertFahrenheitToCelsius(null);
      assert.strictEqual(result, undefined);
    });
  });
});
