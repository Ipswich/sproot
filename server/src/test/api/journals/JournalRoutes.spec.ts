import { assert } from "chai";
import request from "supertest";

import { server } from "../../setup";
import { validateMiddlewareValues } from "../../utils";
import { assertContractBadRequest } from "../shared/assertContractBadRequest";

describe("Journal Routes", () => {
  let journalId: number;

  describe("POST", () => {
    it("should return 201 and create a journal", async () => {
      const response = await request(server)
        .post("/api/v2/journals")
        .send({ title: "API Test Journal", description: "desc", archived: false })
        .expect(201);
      validateMiddlewareValues(response);
      const content = response.body["content"];
      assert.lengthOf(Object.keys(content.data), 9);
      assert.containsAllKeys(content.data, [
        "id",
        "title",
        "description",
        "icon",
        "color",
        "archived",
        "archivedAt",
        "createdAt",
        "editedAt",
      ]);
      assert.isNumber(content.data.id);
      assert.equal(content.data.title, "API Test Journal");
      assert.equal(content.data.description, "desc");
      assert.isFalse(content.data.archived);
      assert.isNull(content.data.icon);
      assert.isNull(content.data.color);
      assert.isNull(content.data.archivedAt);
      assert.match(content.data.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      assert.match(content.data.editedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      journalId = content.data.id;
    });

    it("should reject missing required fields through contract middleware", async () => {
      const invalidBody = { description: "desc" };
      const response = await request(server).post("/api/v2/journals").send(invalidBody).expect(400);

      assertContractBadRequest(response, "/api/v2/journals", invalidBody);
    });

    it("should reject invalid scalar types through contract middleware", async () => {
      const invalidBody = { title: 123, description: "desc" };
      const response = await request(server).post("/api/v2/journals").send(invalidBody).expect(400);

      assertContractBadRequest(response, "/api/v2/journals", invalidBody);
    });

    it("should reject malformed bodies through contract middleware", async () => {
      const invalidBody: unknown[] = [];
      const response = await request(server).post("/api/v2/journals").send(invalidBody).expect(400);

      assertContractBadRequest(response, "/api/v2/journals", invalidBody);
    });

    it("should reject empty or oversized titles through remaining handler/domain validation", async () => {
      const response = await request(server)
        .post("/api/v2/journals")
        .send({ title: "".padEnd(65, "x") })
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(response.body["error"]["url"], "/api/v2/journals");
      assert.deepEqual(response.body["error"]["details"], [
        "Journal name is required and cannot exceed 64 characters.",
      ]);
    });
  });

  describe("GET", () => {
    it("should return 200 and list journals", async () => {
      const response = await request(server).get("/api/v2/journals").expect(200);
      validateMiddlewareValues(response);
      const content = response.body["content"];
      assert.isArray(content.data);
      const found = content.data.find((j: any) => (j.journal ? j.journal.id : j.id) === journalId);
      assert.isObject(found);
      assert.lengthOf(Object.keys(found), 2);

      const journal = found.journal ?? found;
      assert.lengthOf(Object.keys(journal), 9);
      assert.equal(journal.id, journalId);
      assert.equal(journal.title, "API Test Journal");
      assert.equal(journal.description, "desc");
      assert.isFalse(journal.archived);
    });

    it("should return 200 and a single journal by id", async () => {
      const response = await request(server).get(`/api/v2/journals/${journalId}`).expect(200);
      validateMiddlewareValues(response);
      const content = response.body["content"];
      assert.isArray(content.data);
      const first = content.data[0];
      assert.lengthOf(Object.keys(first), 2);
      const journal = first.journal ?? first;
      assert.lengthOf(Object.keys(journal), 9);
      assert.equal(journal.id, journalId);
      assert.equal(journal.title, "API Test Journal");
      assert.equal(journal.description, "desc");
      assert.isFalse(journal.archived);
    });
  });

  describe("PATCH", () => {
    it("should return 200 and update the journal", async () => {
      const getResp = await request(server).get(`/api/v2/journals/${journalId}`).expect(200);
      const existing = getResp.body.content.data[0].journal || getResp.body.content.data[0];
      const response = await request(server)
        .patch(`/api/v2/journals/${journalId}`)
        .send({ title: "API Test Journal Updated", archived: existing.archived })
        .expect(200);
      validateMiddlewareValues(response);
      const content = response.body["content"];
      assert.lengthOf(Object.keys(content.data), 9);
      assert.equal(content.data.id, journalId);
      assert.equal(content.data.title, "API Test Journal Updated");
      assert.equal(content.data.description, "desc");
      assert.isFalse(content.data.archived);
    });

    it("should reject malformed bodies through contract middleware", async () => {
      const invalidBody: unknown[] = [];
      const response = await request(server)
        .patch(`/api/v2/journals/${journalId}`)
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, `/api/v2/journals/${journalId}`, invalidBody);
    });

    it("should reject invalid scalar types through contract middleware", async () => {
      const invalidBody = { archived: "false" };
      const response = await request(server)
        .patch(`/api/v2/journals/${journalId}`)
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, `/api/v2/journals/${journalId}`, invalidBody);
    });

    it("should reject invalid path parameters through remaining handler/domain validation", async () => {
      const response = await request(server)
        .patch("/api/v2/journals/not-a-number")
        .send({ title: "Ignored" })
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(response.body["error"]["url"], "/api/v2/journals/not-a-number");
      assert.deepEqual(response.body["error"]["details"], ["Valid Journal ID is required."]);
    });

    it("should support partial PATCH updates for nullable fields", async () => {
      const response = await request(server)
        .patch(`/api/v2/journals/${journalId}`)
        .send({ description: null })
        .expect(200);

      validateMiddlewareValues(response);
      const content = response.body["content"];
      assert.equal(content.data.id, journalId);
      assert.equal(content.data.title, "API Test Journal Updated");
      assert.isNull(content.data.description);
      assert.isFalse(content.data.archived);
    });

    it("should reject archive-state changes on already archived journals through remaining handler/domain validation", async () => {
      const archiveResponse = await request(server)
        .patch(`/api/v2/journals/${journalId}`)
        .send({ archived: true })
        .expect(200);
      validateMiddlewareValues(archiveResponse);
      assert.isTrue(archiveResponse.body.content.data.archived);

      const response = await request(server)
        .patch(`/api/v2/journals/${journalId}`)
        .send({ archived: true })
        .expect(400);

      validateMiddlewareValues(response);
      assert.equal(response.body["error"]["name"], "Bad Request");
      assert.equal(response.body["error"]["url"], `/api/v2/journals/${journalId}`);
      assert.deepEqual(response.body["error"]["details"], [
        "Journal is archived; archive must be false to make changes.",
      ]);
    });
  });

  describe("DELETE", () => {
    it("should return 200 and delete the journal", async () => {
      const deleteResponse = await request(server)
        .delete(`/api/v2/journals/${journalId}`)
        .expect(200);
      validateMiddlewareValues(deleteResponse);
      assert.equal(
        deleteResponse.body.content.data,
        `Journal with ID ${journalId} successfully deleted.`
      );

      const list = await request(server).get("/api/v2/journals").expect(200);
      validateMiddlewareValues(list);
      const content = list.body["content"];
      const found = content.data.find((j: any) => (j.journal ? j.journal.id : j.id) === journalId);
      assert.isUndefined(found);
    });
  });

  describe("Tags", () => {
    let tagId: number;
    let taggedJournalId: number;

    it("should create a journal tag and apply it to a journal", async () => {
      const tagResp = await request(server)
        .post("/api/v2/tags/journals")
        .send({ name: "API Journal Tag", color: "#123456" })
        .expect(201);
      validateMiddlewareValues(tagResp);
      assert.lengthOf(Object.keys(tagResp.body.content.data), 3);
      tagId = tagResp.body.content.data.id;
      assert.deepInclude(tagResp.body.content.data, {
        id: tagId,
        name: "API Journal Tag",
        color: "#123456",
      });

      const journalResponse = await request(server)
        .post("/api/v2/journals")
        .send({ title: "Journal To Tag", archived: false })
        .expect(201);
      validateMiddlewareValues(journalResponse);
      assert.lengthOf(Object.keys(journalResponse.body.content.data), 9);
      taggedJournalId = journalResponse.body.content.data.id;
      assert.equal(journalResponse.body.content.data.title, "Journal To Tag");

      const tagAddResponse = await request(server)
        .put(`/api/v2/journals/${taggedJournalId}/tags`)
        .send({ tagId: String(tagId) })
        .expect(200);
      validateMiddlewareValues(tagAddResponse);
      assert.equal(
        tagAddResponse.body.content.data,
        `Tag with ID ${tagId} added to journal with ID ${taggedJournalId}.`
      );

      const getResp = await request(server).get(`/api/v2/journals/${taggedJournalId}`).expect(200);
      validateMiddlewareValues(getResp);
      const journalRow = getResp.body.content.data[0];
      assert.lengthOf(Object.keys(journalRow), 2);
      assert.lengthOf(Object.keys(journalRow.journal), 9);
      assert.isArray(journalRow.tags);
      const found = journalRow.tags.find((t: any) => t.id === tagId);
      assert.isObject(found);
      assert.lengthOf(Object.keys(found), 3);
      assert.deepInclude(found, {
        id: tagId,
        name: "API Journal Tag",
        color: "#123456",
      });
    });

    it("should reject invalid attach-tag scalar types through contract middleware", async () => {
      const invalidBody = { tagId: 123 };
      const response = await request(server)
        .put(`/api/v2/journals/${taggedJournalId}/tags`)
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, `/api/v2/journals/${taggedJournalId}/tags`, invalidBody);
    });

    it("should remove the tag from the journal", async () => {
      const deleteResponse = await request(server)
        .delete(`/api/v2/journals/${taggedJournalId}/tags/${tagId}`)
        .expect(200);
      validateMiddlewareValues(deleteResponse);
      assert.equal(
        deleteResponse.body.content.data,
        `Tag with ID ${tagId} removed from journal with ID ${taggedJournalId}.`
      );

      const getResp = await request(server).get(`/api/v2/journals/${taggedJournalId}`).expect(200);
      validateMiddlewareValues(getResp);
      const journalRow = getResp.body.content.data[0];
      assert.lengthOf(Object.keys(journalRow), 2);
      assert.lengthOf(Object.keys(journalRow.journal), 9);
      assert.isArray(journalRow.tags);
      const found = journalRow.tags.find((t: any) => t.id === tagId);
      assert.isUndefined(found);
    });
  });
});