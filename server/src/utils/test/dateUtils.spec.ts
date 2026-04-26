import { assert } from "chai";
import { toDbDate, dbToIso, isoToDb } from "../dateUtils";

describe("dateUtils", function () {
  describe("toDbDate", function () {
    it("should format a provided Date as 'YYYY-MM-DD HH:MM:SS' (UTC)", function () {
      const d = new Date(Date.UTC(2020, 0, 2, 3, 4, 5));
      const res = toDbDate(d);
      assert.equal(res, "2020-01-02 03:04:05");
    });

    it("should return a DB datetime string when called without an argument", function () {
      const res = toDbDate();
      assert.match(res, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe("dbToIso", function () {
    it("should convert a DB datetime to an ISO string with Z suffix", function () {
      const db = "2020-01-02 03:04:05";
      const iso = dbToIso(db);
      assert.equal(iso, "2020-01-02T03:04:05Z");
    });

    it("should return null for null or undefined input", function () {
      assert.isNull(dbToIso(null));
      assert.isNull(dbToIso(undefined));
    });
  });

  describe("isoToDb", function () {
    it("should convert an ISO datetime (Z) to DB format", function () {
      const iso = "2020-01-02T03:04:05Z";
      const db = isoToDb(iso);
      assert.equal(db, "2020-01-02 03:04:05");
    });

    it("should return null for null or undefined input", function () {
      assert.isNull(isoToDb(null));
      assert.isNull(isoToDb(undefined));
    });

    it("should round-trip DB -> ISO -> DB unchanged", function () {
      const db = "2021-12-31 23:59:59";
      const iso = dbToIso(db);
      const back = isoToDb(iso);
      assert.equal(back, db);
    });
  });
});
