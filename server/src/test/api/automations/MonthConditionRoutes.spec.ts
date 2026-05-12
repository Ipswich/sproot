import { assert } from "chai";
import request from "supertest";

import { app, server } from "../../setup";
import { validateMiddlewareValues } from "../../utils";
import { assertContractBadRequest } from "../shared/assertContractBadRequest";

describe("Month Condition Routes", () => {
  describe("GET", () => {
    it("should return 200 and all month conditions", async () => {
      const response = await request(server)
        .get("/api/v2/automations/1/conditions/month")
        .expect(200);
      const content = response.body["content"];

      validateMiddlewareValues(response);
      assert.lengthOf(content.data.oneOf, 2);
    });

    it("should return 200 and a single month condition", async () => {
      const response = await request(server)
        .get("/api/v2/automations/1/conditions/month/1")
        .expect(200);
      const content = response.body["content"];

      validateMiddlewareValues(response);
      assert.containsAllKeys(content.data, ["id", "automationId", "groupType", "months"]);
    });

    it("should reject invalid list path parameters through remaining handler/domain validation", async () => {
      const response = await request(server)
        .get("/api/v2/automations/not-a-number/conditions/month")
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(
        response.body["error"]["url"],
        "/api/v2/automations/not-a-number/conditions/month",
      );
      assert.deepEqual(response.body["error"]["details"], ["Invalid or missing automation Id."]);
    });

    it("should reject invalid item path parameters through remaining handler/domain validation", async () => {
      const response = await request(server)
        .get("/api/v2/automations/1/conditions/month/not-a-number")
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(
        response.body["error"]["url"],
        "/api/v2/automations/1/conditions/month/not-a-number",
      );
      assert.deepEqual(response.body["error"]["details"], ["Invalid or missing condition Id."]);
    });
  });

  describe("POST", () => {
    it("should return 201", async () => {
      assert.lengthOf(await app.get("sprootDB").getMonthConditionsAsync(1), 2);
      const response = await request(server)
        .post("/api/v2/automations/1/conditions/month")
        .send({
          groupType: "oneOf",
          months: 13,
        })
        .expect(201);

      validateMiddlewareValues(response);
      assert.lengthOf(await app.get("sprootDB").getMonthConditionsAsync(1), 3);
      assert.deepInclude(response.body["content"]["data"], {
        groupType: "oneOf",
        months: 13,
      });
    });

    it("should reject missing required fields through contract middleware", async () => {
      const invalidBody = {};
      const response = await request(server)
        .post("/api/v2/automations/1/conditions/month")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/automations/1/conditions/month", invalidBody);
    });

    it("should reject invalid scalar types through contract middleware", async () => {
      const invalidBody = {
        groupType: 123,
        months: 13,
      };
      const response = await request(server)
        .post("/api/v2/automations/1/conditions/month")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/automations/1/conditions/month", invalidBody);
    });

    it("should reject invalid enums through contract middleware", async () => {
      const invalidBody = {
        groupType: "invalid",
        months: 13,
      };
      const response = await request(server)
        .post("/api/v2/automations/1/conditions/month")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/automations/1/conditions/month", invalidBody);
    });

    it("should reject malformed bodies through contract middleware", async () => {
      const invalidBody: unknown[] = [];
      const response = await request(server)
        .post("/api/v2/automations/1/conditions/month")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/automations/1/conditions/month", invalidBody);
    });

    it("should reject invalid path parameters through remaining handler/domain validation", async () => {
      const response = await request(server)
        .post("/api/v2/automations/not-a-number/conditions/month")
        .send({
          groupType: "oneOf",
          months: 13,
        })
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(
        response.body["error"]["url"],
        "/api/v2/automations/not-a-number/conditions/month",
      );
      assert.deepEqual(response.body["error"]["details"], ["Invalid or missing automation Id."]);
    });
  });

  describe("PATCH", () => {
    it("should return 200", async () => {
      assert.equal((await app.get("sprootDB").getMonthConditionsAsync(1))[2].months, 13);
      const response = await request(server)
        .patch("/api/v2/automations/1/conditions/month/3")
        .send({
          months: 14,
        })
        .expect(200);

      validateMiddlewareValues(response);
      assert.equal((await app.get("sprootDB").getMonthConditionsAsync(1))[2].months, 14);
      assert.deepInclude(response.body["content"]["data"], {
        id: 3,
        months: 14,
      });
    });

    it("should reject invalid scalar types through contract middleware", async () => {
      const invalidBody = { groupType: 123 };
      const response = await request(server)
        .patch("/api/v2/automations/1/conditions/month/3")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/automations/1/conditions/month/3", invalidBody);
    });

    it("should reject invalid enums through contract middleware", async () => {
      const invalidBody = { groupType: "invalid" };
      const response = await request(server)
        .patch("/api/v2/automations/1/conditions/month/3")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/automations/1/conditions/month/3", invalidBody);
    });

    it("should reject malformed bodies through contract middleware", async () => {
      const invalidBody: unknown[] = [];
      const response = await request(server)
        .patch("/api/v2/automations/1/conditions/month/3")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/automations/1/conditions/month/3", invalidBody);
    });

    it("should reject invalid path parameters through remaining handler/domain validation", async () => {
      const response = await request(server)
        .patch("/api/v2/automations/not-a-number/conditions/month/not-a-number")
        .send({ months: 14 })
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(
        response.body["error"]["url"],
        "/api/v2/automations/not-a-number/conditions/month/not-a-number",
      );
      assert.deepEqual(response.body["error"]["details"], [
        "Invalid or missing automation Id.",
        "Invalid or missing condition Id.",
      ]);
    });
  });

  describe("DELETE", () => {
    it("should return 200", async () => {
      assert.lengthOf(await app.get("sprootDB").getMonthConditionsAsync(1), 3);
      const response = await request(server)
        .delete("/api/v2/automations/1/conditions/month/3")
        .expect(200);

      validateMiddlewareValues(response);
      assert.lengthOf(await app.get("sprootDB").getMonthConditionsAsync(1), 2);
    });

    it("should reject invalid path parameters through remaining handler/domain validation", async () => {
      const response = await request(server)
        .delete("/api/v2/automations/not-a-number/conditions/month/not-a-number")
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(
        response.body["error"]["url"],
        "/api/v2/automations/not-a-number/conditions/month/not-a-number",
      );
      assert.deepEqual(response.body["error"]["details"], [
        "Invalid or missing automation Id.",
        "Invalid or missing condition Id.",
      ]);
    });
  });
});
