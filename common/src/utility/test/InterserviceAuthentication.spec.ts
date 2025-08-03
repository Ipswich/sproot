import { assert } from "chai";
import { generateInterserviceAuthenticationToken } from "../InterserviceAuthentication";

describe("InterserviceAuthentication.ts tests", function () {
  describe("generateInterserviceAuthenticationToken", function () {
    it("should generate a consistent token for the same key and time", function () {
      const key = "test-key";
      const now = new Date("2023-01-01T12:15:00Z");
      const token1 = generateInterserviceAuthenticationToken(key, now);
      const token2 = generateInterserviceAuthenticationToken(key, now);
      assert.strictEqual(token1, token2, "Tokens should match for the same key and time");
    });

    it("should generate different tokens for different keys", function () {
      const key1 = "test-key-1";
      const key2 = "test-key-2";
      const now = new Date("2023-01-01T12:15:00Z");
      const token1 = generateInterserviceAuthenticationToken(key1, now);
      const token2 = generateInterserviceAuthenticationToken(key2, now);
      assert.notStrictEqual(token1, token2, "Tokens should differ for different keys");
    });

    it("should generate different tokens for different times", function () {
      const key = "test-key";
      const now1 = new Date("2023-01-01T12:15:00Z");
      const now2 = new Date("2023-01-01T13:15:00Z");
      const token1 = generateInterserviceAuthenticationToken(key, now1);
      const token2 = generateInterserviceAuthenticationToken(key, now2);

      assert.notStrictEqual(token1, token2, "Tokens should differ for different times");
    });

    it("should round time down to the nearest hour (truncate minutes)", function () {
      const key = "test-key";
      const now = new Date("2023-01-01T12:59:00Z");
      const token = generateInterserviceAuthenticationToken(key, now);
      const roundedTime = new Date("2023-01-01T12:00:00Z");
      const expectedToken = generateInterserviceAuthenticationToken(key, roundedTime);
      assert.strictEqual(token, expectedToken, "Token should match for rounded-down time");
    });
  });
});
