import { assert } from "chai";
import request from "supertest";

import { app, server } from "../../setup";
import { validateMiddlewareValues } from "../../utils";
import { assertContractBadRequest } from "../shared/assertContractBadRequest";

describe("Notification Action Routes", async () => {
  describe("GET", async () => {
    it("should return 200 and all notifications", async () => {
      const response = await request(server).get("/api/v2/notification-actions").expect(200);
      const content = response.body["content"];

      validateMiddlewareValues(response);
      assert.lengthOf(content.data, 3);
      for (let index = 0; index < content.data.length; index++) {
        assert.containsAllKeys(content.data[index], ["id", "automationId", "subject", "content"]);
      }
    });

    it("should return 200 and all notifications by automationID", async () => {
      const response = await request(server)
        .get("/api/v2/notification-actions?automationId=1")
        .expect(200);
      const content = response.body["content"];

      validateMiddlewareValues(response);
      assert.lengthOf(content.data, 2);
      assert.containsAllKeys(content.data[0], ["id", "automationId", "subject", "content"]);
      assert.containsAllKeys(content.data[1], ["id", "automationId", "subject", "content"]);
    });

    it("should preserve non-numeric automationId query behavior", async () => {
      const response = await request(server)
        .get("/api/v2/notification-actions?automationId=not-a-number")
        .expect(200);
      const content = response.body["content"];

      validateMiddlewareValues(response);
      assert.lengthOf(content.data, 3);
    });

    it("should return 200 and a single notification", async () => {
      const response = await request(server).get("/api/v2/notification-actions/1").expect(200);
      const content = response.body["content"];

      validateMiddlewareValues(response);
      assert.containsAllKeys(content.data, ["id", "automationId", "subject", "content"]);
      assert.equal(content.data.subject, "Test Notification 1");
      assert.equal(content.data.content, "Test Content 1");
    });

    it("should reject invalid path parameters through remaining handler/domain validation", async () => {
      const response = await request(server)
        .get("/api/v2/notification-actions/not-a-number")
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(response.body["error"]["url"], "/api/v2/notification-actions/not-a-number");
      assert.deepEqual(response.body["error"]["details"], [
        "Invalid or missing notification action Id.",
      ]);
    });
  });

  describe("POST", async () => {
    it("should return 201", async () => {
      assert.lengthOf(await app.get("sprootDB").getNotificationActionsAsync(), 3);
      const response = await request(server)
        .post("/api/v2/notification-actions")
        .send({
          automationId: 1,
          subject: "New Test Notification",
          content: "New Test Content",
        })
        .expect(201);

      validateMiddlewareValues(response);
      assert.lengthOf(await app.get("sprootDB").getNotificationActionsAsync(), 4);
      assert.deepInclude(response.body["content"]["data"], {
        automationId: 1,
        subject: "New Test Notification",
        content: "New Test Content",
      });
    });

    it("should reject missing required fields through contract middleware", async () => {
      const invalidBody = {};
      const response = await request(server)
        .post("/api/v2/notification-actions")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/notification-actions", invalidBody);
    });

    it("should reject invalid scalar types through contract middleware", async () => {
      const invalidBody = {
        automationId: "1",
        subject: 123,
        content: false,
      };
      const response = await request(server)
        .post("/api/v2/notification-actions")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/notification-actions", invalidBody);
    });

    it("should reject malformed bodies through contract middleware", async () => {
      const invalidBody: unknown[] = [];
      const response = await request(server)
        .post("/api/v2/notification-actions")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/notification-actions", invalidBody);
    });

    it("should reject empty subject and content through remaining handler/domain validation", async () => {
      const response = await request(server)
        .post("/api/v2/notification-actions")
        .send({
          automationId: 1,
          subject: "",
          content: "   ",
        })
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(response.body["error"]["url"], "/api/v2/notification-actions");
      assert.deepEqual(response.body["error"]["details"], [
        "Subject is required.",
        "Content is required.",
      ]);
    });
  });

  describe("DELETE", async () => {
    it("should return 200", async () => {
      assert.lengthOf(await app.get("sprootDB").getNotificationActionsAsync(), 4);
      const response = await request(server).delete("/api/v2/notification-actions/4").expect(200);

      validateMiddlewareValues(response);
      assert.lengthOf(await app.get("sprootDB").getNotificationActionsAsync(), 3);
    });

    it("should reject invalid path parameters through remaining handler/domain validation", async () => {
      const response = await request(server)
        .delete("/api/v2/notification-actions/not-a-number")
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(response.body["error"]["url"], "/api/v2/notification-actions/not-a-number");
      assert.deepEqual(response.body["error"]["details"], [
        "Invalid or missing notification action Id.",
      ]);
    });
  });
});
