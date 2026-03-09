import { Request, Response } from "express";
import { assert } from "chai";
import sinon from "sinon";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { getAsync, addAsync, updateAsync, deleteAsync } from "../handlers/JournalEntryTagHandlers";
import { ErrorResponse, SuccessResponse } from "@sproot/sproot-common/dist/api/v2/Responses";
import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";

describe("JournalEntryTagHandlers.ts tests", () => {
  describe("getAsync", () => {
    it("returns 200 with entry tags", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er1" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.resolves([{ id: 1, name: "et", color: null }]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { entryTagManager: { getTags: () => sprootDB.getJournalEntryTagsAsync() } }
              : undefined,
        },
      } as unknown as Request;

      const success = (await getAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.deepEqual(success.content?.data, [{ id: 1, name: "et", color: null }]);
    });

    it("returns 503 when DB fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er1" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.rejects(new Error("boom2"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { entryTagManager: { getTags: () => sprootDB.getJournalEntryTagsAsync() } }
              : undefined,
          originalUrl: "/api/v2/journal/entries/tags",
        },
      } as unknown as Request;

      const error = (await getAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.error.name, "Internal Server Error");
      assert.include((error.error.details as string[])[0], "boom2");
    });
  });

  describe("addAsync", () => {
    it("creates entry tag and returns 201", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er2" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addJournalEntryTagAsync.resolves(7);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    createTag: (n: string, c: string | null) =>
                      sprootDB.addJournalEntryTagAsync(n, c),
                  },
                }
              : undefined,
        },
        body: { name: "etag", color: null },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.deepEqual(success.content?.data, { id: 7, name: "etag", color: null });
    });

    it("returns 400 when name missing", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er2" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        body: {},
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
    });

    it("returns 503 when DB fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er3" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addJournalEntryTagAsync.rejects(new Error("addFail2"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    createTag: (n: string, c: string | null) =>
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
      assert.equal(error.error.name, "Internal Server Error");
      assert.include((error.error.details as string[])[0], "addFail2");
    });
  });

  describe("updateAsync", () => {
    it("returns 400 when body missing id", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er4" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        body: {},
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
    });

    it("returns 404 when not found", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er4" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { entryTagManager: { getTags: () => sprootDB.getJournalEntryTagsAsync() } }
              : undefined,
        },
        body: { id: 2 },
        originalUrl: "/api/v2/journal/entries/tags",
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
    });

    it("updates and returns 200", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er5" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.resolves([{ id: 3, name: "old", color: null }]);
      sprootDB.updateJournalEntryTagAsync.resolves();

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTags: () => sprootDB.getJournalEntryTagsAsync(),
                    updateTag: (t: SDBJournalEntryTag) => sprootDB.updateJournalEntryTagAsync(t),
                  },
                }
              : undefined,
        },
        body: { id: 3, name: "n", color: "#111" },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.deepEqual(success.content?.data, { id: 3, name: "n", color: "#111" });
    });

    it("returns 503 when update fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er6" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.resolves([{ id: 4, name: "a", color: null }]);
      sprootDB.updateJournalEntryTagAsync.rejects(new Error("updFail"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTags: () => sprootDB.getJournalEntryTagsAsync(),
                    updateTag: (t: SDBJournalEntryTag) => sprootDB.updateJournalEntryTagAsync(t),
                  },
                }
              : undefined,
          originalUrl: "/api/v2/journal/entries/tags",
        },
        body: { id: 4, name: "b" },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.error.name, "Internal Server Error");
      assert.include((error.error.details as string[])[0], "updFail");
    });
  });

  describe("deleteAsync", () => {
    it("returns 400 when body.id missing", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er7" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        body: {},
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
    });

    it("returns 404 when not found", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er7" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryTagsAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { entryTagManager: { getTags: () => sprootDB.getJournalEntryTagsAsync() } }
              : undefined,
        },
        body: { id: 9 },
        originalUrl: "/api/v2/journal/entries/tags",
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
    });

    it("deletes and returns 200", async () => {
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
                    getTags: () => sprootDB.getJournalEntryTagsAsync(),
                    deleteTag: (id: number) => sprootDB.deleteJournalEntryTagAsync(id),
                  },
                }
              : undefined,
        },
        body: { id: 10 },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
    });

    it("returns 503 when delete fails", async () => {
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
                    getTags: () => sprootDB.getJournalEntryTagsAsync(),
                    deleteTag: (id: number) => sprootDB.deleteJournalEntryTagAsync(id),
                  },
                }
              : undefined,
          originalUrl: "/api/v2/journal/entries/tags",
        },
        body: { id: 11 },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.error.name, "Internal Server Error");
      assert.include((error.error.details as string[])[0], "delFail2");
    });
  });
});
