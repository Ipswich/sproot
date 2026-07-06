import { parseIntervalToMinutes } from "../rawDataQueryHelpers";
import { assert } from "chai";

describe("parseIntervalToMinutes", () => {
  it("parses '1m' to 1", () => {
    assert.equal(parseIntervalToMinutes("1m"), 1);
  });

  it("parses '15m' to 15", () => {
    assert.equal(parseIntervalToMinutes("15m"), 15);
  });

  it("parses '1h' to 60", () => {
    assert.equal(parseIntervalToMinutes("1h"), 60);
  });

  it("parses '4h' to 240", () => {
    assert.equal(parseIntervalToMinutes("4h"), 240);
  });

  it("parses '1d' to 1440", () => {
    assert.equal(parseIntervalToMinutes("1d"), 1440);
  });

  it("parses '15 minutes' to 15", () => {
    assert.equal(parseIntervalToMinutes("15 minutes"), 15);
  });

  it("parses '1 hour' to 60", () => {
    assert.equal(parseIntervalToMinutes("1 hour"), 60);
  });

  it("parses '4 hours' to 240", () => {
    assert.equal(parseIntervalToMinutes("4 hours"), 240);
  });

  it("parses '1 day' to 1440", () => {
    assert.equal(parseIntervalToMinutes("1 day"), 1440);
  });

  it("parses bare numbers as minutes", () => {
    assert.equal(parseIntervalToMinutes("30"), 30);
  });

  it("throws on empty string", () => {
    assert.throw(() => parseIntervalToMinutes(""), /Unable to parse interval/);
  });

  it("throws on invalid string", () => {
    assert.throw(() => parseIntervalToMinutes("asdf"), /Unable to parse interval/);
  });

  it("handles case-insensitive units", () => {
    assert.equal(parseIntervalToMinutes("15 MINUTES"), 15);
    assert.equal(parseIntervalToMinutes("1 HOUR"), 60);
    assert.equal(parseIntervalToMinutes("1 DAY"), 1440);
  });
});
