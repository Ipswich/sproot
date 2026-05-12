import { Request, Response } from "express";
import { assert } from "chai";
import sinon from "sinon";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { getAsync, addAsync, updateAsync, deleteAsync } from "../handlers/JournalEntryTagHandlers";
import { ErrorResponse, SuccessResponse } from "@sproot/sproot-common/dist/api/v2/Responses";
import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";
import { setValidatedContractRequestData } from "../../../validation/validateRequest";

function makeRes(validatedRequestData?: Record<string, unknown>): Response {
  const response = {
    locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "test" } },
  } as unknown as Response;

  if (validatedRequestData) {
    setValidatedContractRequestData(response, validatedRequestData);
  }

  return response;
}

describe("JournalEntryTagHandlers.ts tests", () => {
  describe("getAsync", () => {
    it("should return 200 and entry tags", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er1" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.resolves([{ id: 1, name: "et", color: null }]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { entryTagManager: { getTagsAsync: () => sprootDB.getJournalEntryTagsAsync() } }
              : undefined,
        },
      } as unknown as Request;

      const success = (await getAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.exists(success.content);
      assert.isArray(success.content.data);
      assert.deepEqual(success.content.data, [{ id: 1, name: "et", color: null }]);
    });

    it("should return 503 when DB fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er1" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.rejects(new Error("boom2"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { entryTagManager: { getTagsAsync: () => sprootDB.getJournalEntryTagsAsync() } }
              : undefined,
          originalUrl: "/api/v2/journal/entries/tags",
        },
      } as unknown as Request;

      const error = (await getAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      const err = error.error;
      assert.equal(err.name, "Service Unavailable");
      assert.isArray(err.details);
      assert.include(err.details[0], "boom2");
    });
  });

  describe("addAsync", () => {
    it("should return 201 and the created entry tag", async () => {
      const mockResponse = makeRes({ body: { name: "etag", color: null } });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addJournalEntryTagAsync.resolves(7);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    createTagAsync: (n: string, c: string | null) =>
                      sprootDB.addJournalEntryTagAsync(n, c),
                  },
                }
              : undefined,
        },
        body: { name: "etag", color: null },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.exists(success.content);
      assert.isObject(success.content.data);
      assert.deepEqual(success.content.data, { id: 7, name: "etag", color: null });
    });

    it("should return 400 when remaining tag field validation fails", async () => {
      const mockResponse = makeRes({ body: { name: "", color: "#123456".repeat(6) } });
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        body: { name: "", color: "#123456".repeat(6) },
        originalUrl: "/api/v2/tags/entries",
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.deepEqual(error.error.details, [
        "Valid tag name is required.",
        "Valid tag color is required.",
      ]);
    });

    it("should consume validated create body instead of raw req.body", async () => {
      const mockResponse = makeRes({ body: { name: "validated-entry-tag", color: "#abc" } });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addJournalEntryTagAsync.resolves(12);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    createTagAsync: (n: string, c: string | null) =>
                      sprootDB.addJournalEntryTagAsync(n, c),
                  },
                }
              : undefined,
        },
        body: { name: "raw-entry-tag", color: "#def" },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.deepEqual(success.content?.data, {
        id: 12,
        name: "validated-entry-tag",
        color: "#abc",
      });
      assert.isTrue(
        sprootDB.addJournalEntryTagAsync.calledOnceWithExactly("validated-entry-tag", "#abc"),
      );
    });

    it("should return 503 when DB fails", async () => {
      const mockResponse = makeRes({ body: { name: "n" } });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addJournalEntryTagAsync.rejects(new Error("addFail2"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    createTagAsync: (n: string, c: string | null) =>
                      sprootDB.addJournalEntryTagAsync(n, c),
                  },
                }
              : undefined,
          originalUrl: "/api/v2/journal/entries/tags",
        },
        body: { name: "n" },
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      const err = error.error;
      assert.equal(err.name, "Service Unavailable");
      assert.isArray(err.details);
      assert.include(err.details[0], "addFail2");
    });
  });

  describe("updateAsync", () => {
    it("should return 400 when body missing id", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er4" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        params: { tagId: "x" },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
    });

    it("should return 404 when tag not found", async () => {
      const mockResponse = makeRes({ body: {} });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { entryTagManager: { getTagsAsync: () => sprootDB.getJournalEntryTagsAsync() } }
              : undefined,
        },
        params: { tagId: "2" },
        body: {},
        originalUrl: "/api/v2/journal/entries/tags",
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
    });

    it("should return 200 and the updated entry tag", async () => {
      const mockResponse = makeRes({ body: { name: "n", color: "#111" } });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.resolves([{ id: 3, name: "old", color: null }]);
      sprootDB.updateJournalEntryTagAsync.resolves();

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTagsAsync: () => sprootDB.getJournalEntryTagsAsync(),
                    updateTagAsync: (t: SDBJournalEntryTag) =>
                      sprootDB.updateJournalEntryTagAsync(t),
                  },
                }
              : undefined,
        },
        params: { tagId: "3" },
        body: { name: "n", color: "#111" },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.exists(success.content);
      assert.isObject(success.content.data);
      assert.deepEqual(success.content.data, { id: 3, name: "n", color: "#111" });
    });

    it("should consume validated update body instead of raw req.body", async () => {
      const mockResponse = makeRes({ body: { name: "validated-update", color: "#222" } });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.resolves([{ id: 14, name: "old", color: null }]);
      sprootDB.updateJournalEntryTagAsync.resolves();

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTagsAsync: () => sprootDB.getJournalEntryTagsAsync(),
                    updateTagAsync: (t: SDBJournalEntryTag) =>
                      sprootDB.updateJournalEntryTagAsync(t),
                  },
                }
              : undefined,
        },
        params: { tagId: "14" },
        body: { name: "raw-update", color: "#333" },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.deepEqual(success.content?.data, {
        id: 14,
        name: "validated-update",
        color: "#222",
      });
      assert.isTrue(
        sprootDB.updateJournalEntryTagAsync.calledOnceWithExactly({
          id: 14,
          name: "validated-update",
          color: "#222",
        }),
      );
    });

    it("should return 503 when update fails", async () => {
      const mockResponse = makeRes({ body: { name: "b" } });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.resolves([{ id: 4, name: "a", color: null }]);
      sprootDB.updateJournalEntryTagAsync.rejects(new Error("updFail"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTagsAsync: () => sprootDB.getJournalEntryTagsAsync(),
                    updateTagAsync: (t: SDBJournalEntryTag) =>
                      sprootDB.updateJournalEntryTagAsync(t),
                  },
                }
              : undefined,
          originalUrl: "/api/v2/journal/entries/tags",
        },
        params: { tagId: "4" },
        body: { name: "b" },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      const err = error.error;
      assert.equal(err.name, "Service Unavailable");
      assert.isArray(err.details);
      assert.include(err.details[0], "updFail");
    });
  });

  describe("deleteAsync", () => {
    it("should return 400 when body.id missing", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er7" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        params: { tagId: "x" },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
    });

    it("should return 404 when tag not found", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er7" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { entryTagManager: { getTagsAsync: () => sprootDB.getJournalEntryTagsAsync() } }
              : undefined,
        },
        params: { tagId: "9" },
        originalUrl: "/api/v2/journal/entries/tags",
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
    });

    it("should return 200 and delete the entry tag", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er8" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.resolves([{ id: 10, name: "t", color: null }]);
      sprootDB.deleteJournalEntryTagAsync.resolves();

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTagsAsync: () => sprootDB.getJournalEntryTagsAsync(),
                    deleteTagAsync: (id: number) => sprootDB.deleteJournalEntryTagAsync(id),
                  },
                }
              : undefined,
        },
        params: { tagId: "10" },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
    });

    it("should return 503 when delete fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er9" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.resolves([{ id: 11, name: "t", color: null }]);
      sprootDB.deleteJournalEntryTagAsync.rejects(new Error("delFail2"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTagsAsync: () => sprootDB.getJournalEntryTagsAsync(),
                    deleteTagAsync: (id: number) => sprootDB.deleteJournalEntryTagAsync(id),
                  },
                }
              : undefined,
          originalUrl: "/api/v2/journal/entries/tags",
        },
        params: { tagId: "11" },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      const err = error.error;
      assert.equal(err.name, "Service Unavailable");
      assert.isArray(err.details);
      assert.include(err.details[0], "delFail2");
    });
  });
});
