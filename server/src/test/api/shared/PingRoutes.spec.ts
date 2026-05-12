import { assert } from "chai";
import request from "supertest";

import { validateMiddlewareValues } from "../../utils";
import { server } from "../../setup";

describe("Ping Routes", () => {
  describe("GET", () => {
    it("should return 200", async () => {
      const response = await request(server).get("/api/v2/ping").expect(200);
      const content = response.body["content"];
      validateMiddlewareValues(response);
      assert.deepEqual(content, { data: "pong" });
    });
  });
});
