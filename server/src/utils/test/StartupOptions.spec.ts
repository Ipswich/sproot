import { assert } from "chai";
import { parseStartupOptions } from "../StartupOptions";

describe("StartupOptions", () => {
  describe("parseStartupOptions", () => {
    it("returns defaults when no flags are provided", () => {
      const result = parseStartupOptions([]);

      assert.deepEqual(result, {
        resetAuthenticationUsersOnStartup: false,
      });
    });

    it("recognizes the short reset flag", () => {
      const result = parseStartupOptions(["--reset-authentication-users"]);

      assert.isTrue(result.resetAuthenticationUsersOnStartup);
    });

    it("recognizes the explicit startup reset flag", () => {
      const result = parseStartupOptions([
        "node",
        "dist/index.js",
        "--reset-authentication-users-on-startup",
      ]);

      assert.isTrue(result.resetAuthenticationUsersOnStartup);
    });
  });
});