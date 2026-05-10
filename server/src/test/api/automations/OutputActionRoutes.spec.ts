import { assert } from "chai";
import request from "supertest";

import { app, server } from "../../setup";
import { validateMiddlewareValues } from "../../utils";
import { assertContractBadRequest } from "../shared/assertContractBadRequest";

describe("Output Action Routes", async () => {
  describe("GET", async () => {
    it("should return 200 and all output actions", async () => {
      const response = await request(server).get("/api/v2/output-actions").expect(200);
      const content = response.body["content"];

      validateMiddlewareValues(response);
      assert.lengthOf(content.data, 5);
      for (let index = 0; index < content.data.length; index++) {
        assert.containsAllKeys(content.data[index], ["id", "automationId", "outputId", "value"]);
      }
    });

    it("should return 200 and all output actions by automationID", async () => {
      const response = await request(server)
        .get("/api/v2/output-actions?automationId=2")
        .expect(200);
      const content = response.body["content"];

      validateMiddlewareValues(response);
      assert.lengthOf(content.data, 3);
      assert.containsAllKeys(content.data[0], ["id", "automationId", "outputId", "value"]);
      assert.containsAllKeys(content.data[1], ["id", "automationId", "outputId", "value"]);
      assert.containsAllKeys(content.data[2], ["id", "automationId", "outputId", "value"]);
    });

    it("should preserve non-numeric automationId query behavior", async () => {
      const response = await request(server)
        .get("/api/v2/output-actions?automationId=not-a-number")
        .expect(200);
      const content = response.body["content"];

      validateMiddlewareValues(response);
      assert.lengthOf(content.data, 5);
    });

    it("should return 200 and a single output action", async () => {
      const response = await request(server).get("/api/v2/output-actions/1").expect(200);
      const content = response.body["content"];

      validateMiddlewareValues(response);
      assert.containsAllKeys(content.data, ["id", "automationId", "outputId", "value"]);
    });

    it("should reject invalid path parameters through remaining handler/domain validation", async () => {
      const response = await request(server).get("/api/v2/output-actions/not-a-number").expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(response.body["error"]["url"], "/api/v2/output-actions/not-a-number");
      assert.deepEqual(response.body["error"]["details"], ["Invalid or missing outputAction Id."]);
    });
  });

  describe("POST", async () => {
    it("should return 201", async () => {
      assert.lengthOf(await app.get("sprootDB").getOutputActionsAsync(), 5);
      const response = await request(server)
        .post("/api/v2/output-actions")
        .send({
          automationId: 1,
          outputId: 1,
          value: 100,
        })
        .expect(201);

      validateMiddlewareValues(response);
      assert.lengthOf(await app.get("sprootDB").getOutputActionsAsync(), 6);
      assert.deepInclude(response.body["content"]["data"], {
        automationId: 1,
        outputId: 1,
        value: 100,
      });
    });

    it("should reject missing required fields through contract middleware", async () => {
      const invalidBody = {};
      const response = await request(server)
        .post("/api/v2/output-actions")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/output-actions", invalidBody);
    });

    it("should reject invalid scalar types through contract middleware", async () => {
      const invalidBody = {
        automationId: "1",
        outputId: "1",
        value: "100",
      };
      const response = await request(server)
        .post("/api/v2/output-actions")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/output-actions", invalidBody);
    });

    it("should reject malformed bodies through contract middleware", async () => {
      const invalidBody: unknown[] = [];
      const response = await request(server)
        .post("/api/v2/output-actions")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/output-actions", invalidBody);
    });

    it("should reject out-of-range values through remaining handler/domain validation", async () => {
      const response = await request(server)
        .post("/api/v2/output-actions")
        .send({
          automationId: 1,
          outputId: 1,
          value: -1,
        })
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(response.body["error"]["url"], "/api/v2/output-actions");
      assert.deepEqual(response.body["error"]["details"], ["Value must be between 0 and 100."]);
    });

    it("should reject missing outputs through remaining handler/domain validation", async () => {
      const response = await request(server)
        .post("/api/v2/output-actions")
        .send({
          automationId: 1,
          outputId: 999,
          value: 50,
        })
        .expect(404);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Not Found");
      assert.equal(response.body["error"]["url"], "/api/v2/output-actions");
      assert.deepEqual(response.body["error"]["details"], ["Output not found."]);
    });
  });

  describe("DELETE", async () => {
    it("should return 200", async () => {
      assert.lengthOf(await app.get("sprootDB").getOutputActionsAsync(), 6);
      const response = await request(server).delete("/api/v2/output-actions/6").expect(200);

      validateMiddlewareValues(response);
      assert.lengthOf(await app.get("sprootDB").getOutputActionsAsync(), 5);
    });

    it("should reject invalid path parameters through remaining handler/domain validation", async () => {
      const response = await request(server).delete("/api/v2/output-actions/not-a-number").expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(response.body["error"]["url"], "/api/v2/output-actions/not-a-number");
      assert.deepEqual(response.body["error"]["details"], ["Invalid or missing output action Id."]);
    });
  });
});