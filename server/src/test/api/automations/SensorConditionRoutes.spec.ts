import { assert } from "chai";
import request from "supertest";

import { app, server } from "../../setup";
import { validateMiddlewareValues } from "../../utils";
import { assertContractBadRequest } from "../shared/assertContractBadRequest";

describe("Sensor Condition Routes", () => {
  describe("GET", () => {
    it("should return 200 and all sensor conditions", async () => {
      const response = await request(server)
        .get("/api/v2/automations/1/conditions/sensor")
        .expect(200);
      const content = response.body["content"];

      validateMiddlewareValues(response);
      assert.lengthOf(content.data.oneOf, 2);
    });

    it("should return 200 and a single sensor condition", async () => {
      const response = await request(server)
        .get("/api/v2/automations/1/conditions/sensor/1")
        .expect(200);
      const content = response.body["content"];

      validateMiddlewareValues(response);
      assert.containsAllKeys(content.data, [
        "id",
        "automationId",
        "groupType",
        "operator",
        "comparisonValue",
        "sensorId",
        "readingType",
      ]);
    });

    it("should reject invalid list path parameters through remaining handler/domain validation", async () => {
      const response = await request(server)
        .get("/api/v2/automations/not-a-number/conditions/sensor")
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(
        response.body["error"]["url"],
        "/api/v2/automations/not-a-number/conditions/sensor",
      );
      assert.deepEqual(response.body["error"]["details"], ["Invalid or missing automation Id."]);
    });

    it("should reject invalid item path parameters through remaining handler/domain validation", async () => {
      const response = await request(server)
        .get("/api/v2/automations/1/conditions/sensor/not-a-number")
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(
        response.body["error"]["url"],
        "/api/v2/automations/1/conditions/sensor/not-a-number",
      );
      assert.deepEqual(response.body["error"]["details"], ["Invalid or missing condition Id."]);
    });
  });

  describe("POST", () => {
    it("should return 201", async () => {
      assert.lengthOf(await app.get("sprootDB").getSensorConditionsAsync(1), 2);
      const response = await request(server)
        .post("/api/v2/automations/1/conditions/sensor")
        .send({
          groupType: "oneOf",
          operator: "greater",
          comparisonValue: 20,
          comparisonLookback: 3,
          sensorId: 1,
          readingType: "temperature",
        })
        .expect(201);

      validateMiddlewareValues(response);
      assert.lengthOf(await app.get("sprootDB").getSensorConditionsAsync(1), 3);
      assert.deepInclude(response.body["content"]["data"], {
        groupType: "oneOf",
        operator: "greater",
        comparisonValue: 20,
        sensorId: 1,
        readingType: "temperature",
      });
    });

    it("should reject missing required fields through contract middleware", async () => {
      const invalidBody = {};
      const response = await request(server)
        .post("/api/v2/automations/1/conditions/sensor")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/automations/1/conditions/sensor", invalidBody);
    });

    it("should reject invalid scalar types through contract middleware", async () => {
      const invalidBody = {
        groupType: 123,
        operator: "greater",
        comparisonValue: 20,
        sensorId: 1,
        readingType: "temperature",
      };
      const response = await request(server)
        .post("/api/v2/automations/1/conditions/sensor")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/automations/1/conditions/sensor", invalidBody);
    });

    it("should reject invalid enums through contract middleware", async () => {
      const invalidBody = {
        groupType: "invalid",
        operator: "greater",
        comparisonValue: 20,
        sensorId: 1,
        readingType: "temperature",
      };
      const response = await request(server)
        .post("/api/v2/automations/1/conditions/sensor")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/automations/1/conditions/sensor", invalidBody);
    });

    it("should reject malformed bodies through contract middleware", async () => {
      const invalidBody: unknown[] = [];
      const response = await request(server)
        .post("/api/v2/automations/1/conditions/sensor")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/automations/1/conditions/sensor", invalidBody);
    });

    it("should reject invalid path parameters through remaining handler/domain validation", async () => {
      const response = await request(server)
        .post("/api/v2/automations/not-a-number/conditions/sensor")
        .send({
          groupType: "oneOf",
          operator: "greater",
          comparisonValue: 20,
          sensorId: 1,
          readingType: "temperature",
        })
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(
        response.body["error"]["url"],
        "/api/v2/automations/not-a-number/conditions/sensor",
      );
      assert.deepEqual(response.body["error"]["details"], ["Invalid or missing automation Id."]);
    });
  });

  describe("PATCH", () => {
    it("should return 200", async () => {
      assert.equal((await app.get("sprootDB").getSensorConditionsAsync(1))[2].comparisonValue, 20);
      const response = await request(server)
        .patch("/api/v2/automations/1/conditions/sensor/3")
        .send({
          comparisonValue: 30,
        })
        .expect(200);

      validateMiddlewareValues(response);
      assert.equal((await app.get("sprootDB").getSensorConditionsAsync(1))[2].comparisonValue, 30);
      assert.deepInclude(response.body["content"]["data"], {
        id: 3,
        comparisonValue: 30,
      });
    });

    it("should reject invalid scalar types through contract middleware", async () => {
      const invalidBody = { groupType: 123 };
      const response = await request(server)
        .patch("/api/v2/automations/1/conditions/sensor/3")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/automations/1/conditions/sensor/3", invalidBody);
    });

    it("should reject invalid enums through contract middleware", async () => {
      const invalidBody = { groupType: "invalid" };
      const response = await request(server)
        .patch("/api/v2/automations/1/conditions/sensor/3")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/automations/1/conditions/sensor/3", invalidBody);
    });

    it("should reject malformed bodies through contract middleware", async () => {
      const invalidBody: unknown[] = [];
      const response = await request(server)
        .patch("/api/v2/automations/1/conditions/sensor/3")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/automations/1/conditions/sensor/3", invalidBody);
    });

    it("should reject invalid path parameters through remaining handler/domain validation", async () => {
      const response = await request(server)
        .patch("/api/v2/automations/not-a-number/conditions/sensor/not-a-number")
        .send({ comparisonValue: 30 })
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(
        response.body["error"]["url"],
        "/api/v2/automations/not-a-number/conditions/sensor/not-a-number",
      );
      assert.deepEqual(response.body["error"]["details"], [
        "Invalid or missing automation Id.",
        "Invalid or missing condition Id.",
      ]);
    });
  });

  describe("DELETE", () => {
    it("should return 200", async () => {
      assert.lengthOf(await app.get("sprootDB").getSensorConditionsAsync(1), 3);
      const response = await request(server)
        .delete("/api/v2/automations/1/conditions/sensor/3")
        .expect(200);

      validateMiddlewareValues(response);
      assert.lengthOf(await app.get("sprootDB").getSensorConditionsAsync(1), 2);
    });

    it("should reject invalid path parameters through remaining handler/domain validation", async () => {
      const response = await request(server)
        .delete("/api/v2/automations/not-a-number/conditions/sensor/not-a-number")
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(
        response.body["error"]["url"],
        "/api/v2/automations/not-a-number/conditions/sensor/not-a-number",
      );
      assert.deepEqual(response.body["error"]["details"], [
        "Invalid or missing automation Id.",
        "Invalid or missing condition Id.",
      ]);
    });
  });
});
