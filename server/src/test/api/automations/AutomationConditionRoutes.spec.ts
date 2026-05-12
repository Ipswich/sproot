import { assert } from "chai";
import request from "supertest";

import { server } from "../../setup";
import { validateMiddlewareValues } from "../../utils";

describe("Automation Condition Routes", async () => {
  describe("GET", async () => {
    it("should return 200 and all conditions", async () => {
      const response = await request(server).get("/api/v2/automations/1/conditions").expect(200);
      const content = response.body["content"];
      validateMiddlewareValues(response);
      assert.lengthOf(content.data.sensor.oneOf, 2);
      assert.lengthOf(content.data.output.oneOf, 2);
      assert.lengthOf(content.data.time.oneOf, 2);
      assert.lengthOf(content.data.weekday.oneOf, 2);
      assert.lengthOf(content.data.month.oneOf, 2);
    });
  });
});
