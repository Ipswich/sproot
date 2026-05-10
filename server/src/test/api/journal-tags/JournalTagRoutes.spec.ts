import { assert } from "chai";
import request from "supertest";

import { server } from "../../setup";
import { validateMiddlewareValues } from "../../utils";
import { assertContractBadRequest } from "../shared/assertContractBadRequest";

describe("Journal Tag Routes", () => {
  let createdId: number;

  describe("POST", () => {
    it("should return 201 and create a journal tag", async () => {
      const response = await request(server)
        .post("/api/v2/tags/journals")
        .send({ name: "APITest Journal Tag", color: "#ff0000" })
        .expect(201);

      validateMiddlewareValues(response);
      const content = response.body["content"];
      assert.lengthOf(Object.keys(content.data), 3);
      assert.containsAllKeys(content.data, ["id", "name", "color"]);
      assert.isNumber(content.data.id);
      assert.equal(content.data.name, "APITest Journal Tag");
      assert.equal(content.data.color, "#ff0000");
      createdId = content.data.id;
    });

    it("should reject missing required fields through contract middleware", async () => {
      const invalidBody = { color: "#ff0000" };
      const response = await request(server)
        .post("/api/v2/tags/journals")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/tags/journals", invalidBody);
    });

    it("should reject invalid scalar types through contract middleware", async () => {
      const invalidBody = { name: 123, color: "#ff0000" };
      const response = await request(server)
        .post("/api/v2/tags/journals")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/tags/journals", invalidBody);
    });

    it("should reject malformed bodies through contract middleware", async () => {
      const invalidBody: unknown[] = [];
      const response = await request(server)
        .post("/api/v2/tags/journals")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/tags/journals", invalidBody);
    });

    it("should reject empty tag names through remaining handler/domain validation", async () => {
      const response = await request(server)
        .post("/api/v2/tags/journals")
        .send({ name: "", color: "#ff0000" })
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(response.body["error"]["url"], "/api/v2/tags/journals");
      assert.deepEqual(response.body["error"]["details"], ["Valid tag name is required."]);
    });

    it("should reject oversized tag fields through remaining handler/domain validation", async () => {
      const response = await request(server)
        .post("/api/v2/tags/journals")
        .send({ name: "x".repeat(33), color: "#ff0000".repeat(5) })
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(response.body["error"]["url"], "/api/v2/tags/journals");
      assert.deepEqual(response.body["error"]["details"], [
        "Valid tag name is required.",
        "Valid tag color is required.",
      ]);
    });
  });

  describe("GET", () => {
    it("should return 200 and list journal tags", async () => {
      const response = await request(server).get("/api/v2/tags/journals").expect(200);
      validateMiddlewareValues(response);
      const content = response.body["content"];
      assert.isArray(content.data);
      const found = content.data.find((t: any) => t.id === createdId);
      assert.isObject(found);
      assert.lengthOf(Object.keys(found), 3);
      assert.deepInclude(found, {
        id: createdId,
        name: "APITest Journal Tag",
        color: "#ff0000",
      });
    });
  });

  describe("PATCH", () => {
    it("should return 200 and update a journal tag", async () => {
      const response = await request(server)
        .patch(`/api/v2/tags/journals/${createdId}`)
        .send({ name: "APITest Journal Tag Updated", color: "#00ff00" })
        .expect(200);

      validateMiddlewareValues(response);
      const content = response.body["content"];
      assert.lengthOf(Object.keys(content.data), 3);
      assert.containsAllKeys(content.data, ["id", "name", "color"]);
      assert.equal(content.data.id, createdId);
      assert.equal(content.data.name, "APITest Journal Tag Updated");
      assert.equal(content.data.color, "#00ff00");
    });

    it("should reject malformed bodies through contract middleware", async () => {
      const invalidBody: unknown[] = [];
      const response = await request(server)
        .patch(`/api/v2/tags/journals/${createdId}`)
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, `/api/v2/tags/journals/${createdId}`, invalidBody);
    });

    it("should reject invalid scalar types through contract middleware", async () => {
      const invalidBody = { name: 123 };
      const response = await request(server)
        .patch(`/api/v2/tags/journals/${createdId}`)
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, `/api/v2/tags/journals/${createdId}`, invalidBody);
    });

    it("should reject invalid path parameters through remaining handler/domain validation", async () => {
      const response = await request(server)
        .patch("/api/v2/tags/journals/not-a-number")
        .send({ name: "Ignored" })
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(response.body["error"]["url"], "/api/v2/tags/journals/not-a-number");
      assert.deepEqual(response.body["error"]["details"], ["Valid tag ID is required."]);
    });
  });

  describe("DELETE", () => {
    it("should return 200 and delete a journal tag", async () => {
      const deleteResponse = await request(server)
        .delete(`/api/v2/tags/journals/${createdId}`)
        .expect(200);
      validateMiddlewareValues(deleteResponse);
      assert.equal(deleteResponse.body.content.data, `Journal tag with ID ${createdId} deleted.`);

      const list = await request(server).get("/api/v2/tags/journals").expect(200);
      validateMiddlewareValues(list);
      const content = list.body["content"];
      const found = content.data.find((t: any) => t.id === createdId);
      assert.isUndefined(found);
    });
  });
});