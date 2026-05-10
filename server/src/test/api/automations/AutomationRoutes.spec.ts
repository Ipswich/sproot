import { assert } from "chai";
import request from "supertest";

import { app, server } from "../../setup";
import { validateMiddlewareValues } from "../../utils";
import { assertContractBadRequest } from "../shared/assertContractBadRequest";

describe("Automation Routes", async () => {
  describe("GET", async () => {
    it("should return 200 and all automations", async () => {
      const response = await request(server).get("/api/v2/automations").expect(200);
      const content = response.body["content"];
      validateMiddlewareValues(response);
      assert.lengthOf(content.data, 2);
      assert.containsAllKeys(content.data[0], ["id", "name", "operator"]);
      assert.containsAllKeys(content.data[1], ["id", "name", "operator"]);
    });

    it("should return 200 and a single automation", async () => {
      const response = await request(server).get("/api/v2/automations/1").expect(200);
      const content = response.body["content"];
      validateMiddlewareValues(response);
      assert.containsAllKeys(content.data, ["id", "name", "operator"]);
    });

    it("should reject invalid path parameters through remaining handler/domain validation", async () => {
      const response = await request(server).get("/api/v2/automations/not-a-number").expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(response.body["error"]["url"], "/api/v2/automations/not-a-number");
      assert.deepEqual(response.body["error"]["details"], ["Invalid or missing automation Id."]);
    });
  });

  describe("Create, Update, Delete", async () => {
    describe("POST", async () => {
      it("should return 201", async () => {
        assert.lengthOf(await app.get("sprootDB").getAutomationsAsync(), 2);
        const response = await request(server)
          .post("/api/v2/automations")
          .send({
            name: "Test Automation",
            operator: "or",
          })
          .expect(201);

        validateMiddlewareValues(response);
        assert.lengthOf(await app.get("sprootDB").getAutomationsAsync(), 3);
        assert.deepInclude(response.body["content"]["data"], {
          name: "Test Automation",
          operator: "or",
        });
      });

      it("should reject missing required fields through contract middleware", async () => {
        const invalidBody = { name: "Missing operator" };
        const response = await request(server)
          .post("/api/v2/automations")
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, "/api/v2/automations", invalidBody);
      });

      it("should reject invalid scalar types through contract middleware", async () => {
        const invalidBody = { name: 123, operator: "or" };
        const response = await request(server)
          .post("/api/v2/automations")
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, "/api/v2/automations", invalidBody);
      });

      it("should reject invalid enum values through contract middleware", async () => {
        const invalidBody = { name: "Invalid operator", operator: "invalid" };
        const response = await request(server)
          .post("/api/v2/automations")
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, "/api/v2/automations", invalidBody);
      });

      it("should reject malformed bodies through contract middleware", async () => {
        const invalidBody: unknown[] = [];
        const response = await request(server)
          .post("/api/v2/automations")
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, "/api/v2/automations", invalidBody);
      });
    });

    describe("PATCH", async () => {
      it("should return 200", async () => {
        assert.equal((await app.get("sprootDB").getAutomationAsync(3))[0].name, "Test Automation");
        const response = await request(server)
          .patch("/api/v2/automations/3")
          .send({
            name: "Test1 Automation",
            operator: "and",
          })
          .expect(200);

        validateMiddlewareValues(response);
        assert.equal((await app.get("sprootDB").getAutomationAsync(3))[0].name, "Test1 Automation");
        assert.deepInclude(response.body["content"]["data"], {
          id: 3,
          name: "Test1 Automation",
          operator: "and",
        });
      });

      it("should reject invalid scalar types through contract middleware", async () => {
        const invalidBody = { enabled: "true" };
        const response = await request(server)
          .patch("/api/v2/automations/3")
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, "/api/v2/automations/3", invalidBody);
      });

      it("should reject invalid enum values through contract middleware", async () => {
        const invalidBody = { operator: "invalid" };
        const response = await request(server)
          .patch("/api/v2/automations/3")
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, "/api/v2/automations/3", invalidBody);
      });

      it("should reject malformed bodies through contract middleware", async () => {
        const invalidBody: unknown[] = [];
        const response = await request(server)
          .patch("/api/v2/automations/3")
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, "/api/v2/automations/3", invalidBody);
      });

      it("should reject invalid path parameters through remaining handler/domain validation", async () => {
        const response = await request(server)
          .patch("/api/v2/automations/not-a-number")
          .send({ name: "Ignored" })
          .expect(400);

        validateMiddlewareValues(response);
        assert.equal(response.body["error"]["name"], "Bad Request");
        assert.equal(response.body["error"]["url"], "/api/v2/automations/not-a-number");
        assert.deepEqual(response.body["error"]["details"], ["Invalid or missing automation Id."]);
      });
    });

    describe("DELETE", async () => {
      it("should return 200", async () => {
        assert.lengthOf(await app.get("sprootDB").getAutomationsAsync(), 3);
        const response = await request(server).delete("/api/v2/automations/3").expect(200);

        validateMiddlewareValues(response);
        assert.lengthOf(await app.get("sprootDB").getAutomationsAsync(), 2);
      });

      it("should reject invalid path parameters through remaining handler/domain validation", async () => {
        const response = await request(server).delete("/api/v2/automations/not-a-number").expect(400);

        validateMiddlewareValues(response);
        assert.equal(response.body["error"]["name"], "Bad Request");
        assert.equal(response.body["error"]["url"], "/api/v2/automations/not-a-number");
        assert.deepEqual(response.body["error"]["details"], ["Invalid or missing automation Id."]);
      });
    });
  });
});