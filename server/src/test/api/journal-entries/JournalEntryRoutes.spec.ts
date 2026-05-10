import { assert } from "chai";
import request from "supertest";

import { server } from "../../setup";
import { validateMiddlewareValues } from "../../utils";
import { assertContractBadRequest } from "../shared/assertContractBadRequest";

describe("Journal Entry Routes", () => {
  let journalId: number;
  let entryId: number;

  before(async () => {
    const resp = await request(server)
      .post("/api/v2/journals")
      .send({ title: "Entries Journal", archived: false })
      .expect(201);
    journalId = resp.body.content.data.id;
  });

  describe("Journal Route Entries", () => {
    describe("POST", () => {
      it("should return 201 and create an entry", async () => {
        const response = await request(server)
          .post(`/api/v2/journals/${journalId}/entries`)
          .send({ content: "Entry content", title: "Entry Title" })
          .expect(201);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.lengthOf(Object.keys(content.data), 6);
        assert.containsAllKeys(content.data, ["id", "journalId", "content", "createdAt"]);
        assert.equal(content.data.journalId, journalId);
        assert.equal(content.data.title, "Entry Title");
        assert.equal(content.data.content, "Entry content");
        assert.match(content.data.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        assert.match(content.data.editedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        entryId = content.data.id;
      });

      it("should reject missing required fields through contract middleware", async () => {
        const invalidBody = { journalId: 999, title: "Path/body should not be merged" };
        const response = await request(server)
          .post(`/api/v2/journals/${journalId}/entries`)
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, `/api/v2/journals/${journalId}/entries`, invalidBody);
      });

      it("should reject invalid scalar types through contract middleware", async () => {
        const invalidBody = { content: true, title: "Entry Title" };
        const response = await request(server)
          .post(`/api/v2/journals/${journalId}/entries`)
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, `/api/v2/journals/${journalId}/entries`, invalidBody);
      });

      it("should reject malformed bodies through contract middleware", async () => {
        const invalidBody: unknown[] = [];
        const response = await request(server)
          .post(`/api/v2/journals/${journalId}/entries`)
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, `/api/v2/journals/${journalId}/entries`, invalidBody);
      });

      it("should reject remaining handler-owned create validation", async () => {
        const response = await request(server)
          .post(`/api/v2/journals/${journalId}/entries`)
          .send({ content: "", title: "x".repeat(65) })
          .expect(400);

        validateMiddlewareValues(response);
        assert.equal(response.body["error"]["name"], "Bad Request");
        assert.equal(response.body["error"]["url"], `/api/v2/journals/${journalId}/entries`);
        assert.deepEqual(response.body["error"]["details"], [
          "Journal Entry content is required.",
          "Journal Entry title cannot exceed 64 characters.",
        ]);
      });
    });

    describe("GET", () => {
      it("should return 200 and list entries for a journal", async () => {
        const response = await request(server)
          .get(`/api/v2/journals/${journalId}/entries`)
          .expect(200);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.isArray(content.data);
        const found = content.data.find((e: any) => e.entry.id === entryId);
        assert.isObject(found);
        assert.lengthOf(Object.keys(found.entry), 6);
        assert.equal(found.entry.journalId, journalId);
        assert.equal(found.entry.title, "Entry Title");
        assert.equal(found.entry.content, "Entry content");
      });

      it("should return 200 and list entries for a journal (no content in response)", async () => {
        const response = await request(server)
          .get(`/api/v2/journals/${journalId}/entries?withContent=false`)
          .expect(200);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.isArray(content.data);
        const found = content.data.find((e: any) => e.entry.id === entryId);
        assert.isObject(found);
        assert.lengthOf(Object.keys(found.entry), 5);
        assert.equal(found.entry.journalId, journalId);
        assert.equal(found.entry.title, "Entry Title");
        assert.isUndefined(found.entry.content);
      });

      it("should reject invalid withContent values through contract middleware", async () => {
        const response = await request(server)
          .get(`/api/v2/journals/${journalId}/entries?withContent=not-a-boolean`)
          .expect(400);

        validateMiddlewareValues(response);
        assert.equal(response.body["error"]["name"], "Bad Request");
        assert.equal(
          response.body["error"]["url"],
          `/api/v2/journals/${journalId}/entries?withContent=not-a-boolean`
        );
        assert.equal(response.body["error"]["request"]["query"]["withContent"], "not-a-boolean");
        assert.isArray(response.body["error"]["details"]);
        assert.isNotEmpty(response.body["error"]["details"]);
      });
    });
  });

  describe("Entry Routes", () => {
    describe("GET", () => {
      it("should return 200 and a single entry by id", async () => {
        const response = await request(server).get(`/api/v2/entries/${entryId}`).expect(200);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.isArray(content.data);
        assert.lengthOf(Object.keys(content.data[0].entry), 6);
        assert.equal(content.data[0].entry.id, entryId);
        assert.equal(content.data[0].entry.journalId, journalId);
        assert.equal(content.data[0].entry.title, "Entry Title");
        assert.equal(content.data[0].entry.content, "Entry content");
      });

      it("should return 200 and a single entry by id (no content property with response)", async () => {
        const response = await request(server)
          .get(`/api/v2/entries/${entryId}?withContent=false`)
          .expect(200);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.isArray(content.data);
        assert.lengthOf(Object.keys(content.data[0].entry), 5);
        assert.equal(content.data[0].entry.id, entryId);
        assert.equal(content.data[0].entry.journalId, journalId);
        assert.equal(content.data[0].entry.title, "Entry Title");
        assert.isUndefined(content.data[0].entry.content);
      });

      it("should reject invalid withContent values by entry id through contract middleware", async () => {
        const response = await request(server)
          .get(`/api/v2/entries/${entryId}?withContent=not-a-boolean`)
          .expect(400);

        validateMiddlewareValues(response);
        assert.equal(response.body["error"]["name"], "Bad Request");
        assert.equal(
          response.body["error"]["url"],
          `/api/v2/entries/${entryId}?withContent=not-a-boolean`
        );
        assert.equal(response.body["error"]["request"]["query"]["withContent"], "not-a-boolean");
        assert.isArray(response.body["error"]["details"]);
        assert.isNotEmpty(response.body["error"]["details"]);
      });
    });

    describe("PATCH", () => {
      it("should return 200 and update the entry", async () => {
        const response = await request(server)
          .patch(`/api/v2/entries/${entryId}`)
          .send({ content: "Updated content", title: "Updated Title" })
          .expect(200);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.lengthOf(Object.keys(content.data), 6);
        assert.equal(content.data.id, entryId);
        assert.equal(content.data.journalId, journalId);
        assert.equal(content.data.title, "Updated Title");
        assert.equal(content.data.content, "Updated content");
      });

      it("should reject malformed bodies through contract middleware", async () => {
        const invalidBody: unknown[] = [];
        const response = await request(server)
          .patch(`/api/v2/entries/${entryId}`)
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, `/api/v2/entries/${entryId}`, invalidBody);
      });

      it("should reject invalid scalar types through contract middleware", async () => {
        const invalidBody = { title: true };
        const response = await request(server)
          .patch(`/api/v2/entries/${entryId}`)
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, `/api/v2/entries/${entryId}`, invalidBody);
      });

      it("should reject invalid path parameters through remaining handler/domain validation", async () => {
        const response = await request(server)
          .patch("/api/v2/entries/not-a-number")
          .send({ content: "Ignored" })
          .expect(400);

        validateMiddlewareValues(response);
        assert.equal(response.body["error"]["name"], "Bad Request");
        assert.equal(response.body["error"]["url"], "/api/v2/entries/not-a-number");
        assert.deepEqual(response.body["error"]["details"], ["Valid Journal Entry ID is required."]);
      });

      it("should preserve omitted PATCH fields", async () => {
        const response = await request(server)
          .patch(`/api/v2/entries/${entryId}`)
          .send({ title: "Title Only Update" })
          .expect(200);

        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.equal(content.data.id, entryId);
        assert.equal(content.data.journalId, journalId);
        assert.equal(content.data.title, "Title Only Update");
        assert.equal(content.data.content, "Updated content");
      });

      it("should allow nullable fields to be cleared intentionally", async () => {
        const response = await request(server)
          .patch(`/api/v2/entries/${entryId}`)
          .send({ title: null })
          .expect(200);

        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.equal(content.data.id, entryId);
        assert.equal(content.data.journalId, journalId);
        assert.isNull(content.data.title);
        assert.equal(content.data.content, "Updated content");
      });
    });

    describe("DELETE", () => {
      it("should return 200 and delete the entry", async () => {
        const deleteResponse = await request(server)
          .delete(`/api/v2/entries/${entryId}`)
          .expect(200);
        validateMiddlewareValues(deleteResponse);
        assert.equal(
          deleteResponse.body.content.data,
          `Journal Entry with ID ${entryId} successfully deleted.`
        );

        const resp = await request(server)
          .get(`/api/v2/journals/${journalId}/entries`)
          .expect(200);
        validateMiddlewareValues(resp);
        const content = resp.body["content"];
        const found = content.data.find((e: any) => e.id === entryId);
        assert.isUndefined(found);
      });
    });

    describe("Tags", () => {
      let localEntryId: number;
      let entryTagId: number;

      it("should create an entry tag and apply it to an entry", async () => {
        const tagResp = await request(server)
          .post("/api/v2/tags/entries")
          .send({ name: "API Entry Tag", color: "#654321" })
          .expect(201);
        validateMiddlewareValues(tagResp);
        assert.lengthOf(Object.keys(tagResp.body.content.data), 3);
        entryTagId = tagResp.body.content.data.id;
        assert.deepInclude(tagResp.body.content.data, {
          id: entryTagId,
          name: "API Entry Tag",
          color: "#654321",
        });

        const entryResponse = await request(server)
          .post(`/api/v2/journals/${journalId}/entries`)
          .send({ content: "Entry to Tag", title: "Tagged Entry" })
          .expect(201);
        validateMiddlewareValues(entryResponse);
        assert.lengthOf(Object.keys(entryResponse.body.content.data), 6);
        localEntryId = entryResponse.body.content.data.id;
        assert.equal(entryResponse.body.content.data.title, "Tagged Entry");
        assert.equal(entryResponse.body.content.data.content, "Entry to Tag");

        const tagAddResponse = await request(server)
          .put(`/api/v2/entries/${localEntryId}/tags`)
          .send({ tagId: String(entryTagId) })
          .expect(200);
        validateMiddlewareValues(tagAddResponse);
        assert.equal(
          tagAddResponse.body.content.data,
          `Tag with ID ${entryTagId} successfully added to Journal Entry with ID ${localEntryId}.`
        );

        const getResp = await request(server).get(`/api/v2/entries/${localEntryId}`).expect(200);
        validateMiddlewareValues(getResp);
        const row = getResp.body.content.data[0];
        assert.lengthOf(Object.keys(row.entry), 6);
        assert.isArray(row.tags);
        const found = row.tags.find((t: any) => t.id === entryTagId);
        assert.isObject(found);
        assert.lengthOf(Object.keys(found), 3);
        assert.deepInclude(found, {
          id: entryTagId,
          name: "API Entry Tag",
          color: "#654321",
        });
      });

      it("should reject invalid attach-tag scalar types through contract middleware", async () => {
        const invalidBody = { tagId: 123 };
        const response = await request(server)
          .put(`/api/v2/entries/${localEntryId}/tags`)
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, `/api/v2/entries/${localEntryId}/tags`, invalidBody);
      });

      it("should remove the tag from the entry", async () => {
        const deleteResponse = await request(server)
          .delete(`/api/v2/entries/${localEntryId}/tags/${entryTagId}`)
          .expect(200);
        validateMiddlewareValues(deleteResponse);
        assert.equal(
          deleteResponse.body.content.data,
          `Tag with ID ${entryTagId} successfully removed from Journal Entry with ID ${localEntryId}.`
        );

        const getResp = await request(server).get(`/api/v2/entries/${localEntryId}`).expect(200);
        validateMiddlewareValues(getResp);
        const row = getResp.body.content.data[0];
        assert.lengthOf(Object.keys(row.entry), 6);
        assert.isArray(row.tags);
        const found = row.tags.find((t: any) => t.id === entryTagId);
        assert.isUndefined(found);
      });
    });
  });
});