import { Request, Response } from "express";
import { assert } from "chai";
import sinon from "sinon";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { getAsync, addAsync, updateAsync, deleteAsync } from "../handlers/JournalTagHandlers";

describe("JournalTagHandlers.ts tests", () => {
  describe("getAsync", () => {
    it("returns 200 with tags", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r1" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.resolves([{ id: 1, name: "t", color: null }]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { journalTagManager: { getTags: () => sprootDB.getJournalTagsAsync() } }
              : undefined,
        },
      } as unknown as Request;

      const success = (await getAsync(mockRequest, mockResponse)) as any;
      assert.equal(success.statusCode, 200);
      assert.deepEqual(success.content?.data, [{ id: 1, name: "t", color: null }]);
    });

    it("returns 503 when DB fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r1" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.rejects(new Error("boom"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { journalTagManager: { getTags: () => sprootDB.getJournalTagsAsync() } }
              : undefined,
          originalUrl: "/api/v2/journal/tags",
        },
      } as unknown as Request;

      const error = (await getAsync(mockRequest, mockResponse)) as any;
      assert.equal(error.statusCode, 503);
      assert.equal(error.error.name, "Service Unavailable");
      assert.include((error.error.details as string[])[0], "boom");
    });
  });

  describe("addAsync", () => {
    it("creates tag and returns 201", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r2" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addJournalTagAsync.resolves(5);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  journalTagManager: {
                    createTag: (n: string, c: string | null) => sprootDB.addJournalTagAsync(n, c),
                  },
                }
              : undefined,
        },
        body: { name: "tag1", color: "#fff" },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as any;
      assert.equal(success.statusCode, 201);
      assert.deepEqual(success.content?.data, { id: 5, name: "tag1", color: "#fff" });
    });

    it("returns 400 when name missing", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r2" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        body: {},
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as any;
      assert.equal(error.statusCode, 400);
      assert.equal(error.error.name, "Bad Request");
    });

    it("returns 503 when DB fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r3" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addJournalTagAsync.rejects(new Error("add fail"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  journalTagManager: {
                    createTag: (n: string, c: string | null) => sprootDB.addJournalTagAsync(n, c),
                  },
                }
              : undefined,
          originalUrl: "/api/v2/journal/tags",
        },
        body: { name: "x" },
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as any;
      assert.equal(error.statusCode, 503);
      assert.equal(error.error.name, "Service Unavailable");
      assert.include((error.error.details as string[])[0], "add fail");
    });
  });

  describe("updateAsync", () => {
    it("returns 400 for invalid id param", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r4" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        params: { tagId: "a" },
        originalUrl: "/api/v2/journal/tags/a",
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as any;
      assert.equal(error.statusCode, 400);
      assert.equal(error.error.name, "Bad Request");
    });

    it("returns 404 when tag not found", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r4" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { journalTagManager: { getTags: () => sprootDB.getJournalTagsAsync() } }
              : undefined,
        },
        params: { tagId: "2" },
        body: {},
        originalUrl: "/api/v2/journal/tags/2",
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as any;
      assert.equal(error.statusCode, 404);
      assert.equal(error.error.name, "Not Found");
    });

    it("updates and returns 200", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r5" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.resolves([{ id: 3, name: "old", color: null }]);
      sprootDB.updateJournalTagAsync.resolves();

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  journalTagManager: {
                    getTags: () => sprootDB.getJournalTagsAsync(),
                    updateTag: (t: any) => sprootDB.updateJournalTagAsync(t),
                  },
                }
              : undefined,
        },
        params: { tagId: "3" },
        body: { name: "new", color: "#000" },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as any;
      assert.equal(success.statusCode, 200);
      assert.deepEqual(success.content?.data, { id: 3, name: "new", color: "#000" });
    });

    it("returns 503 when DB update fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r6" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.resolves([{ id: 4, name: "x", color: null }]);
      sprootDB.updateJournalTagAsync.rejects(new Error("update fail"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  journalTagManager: {
                    getTags: () => sprootDB.getJournalTagsAsync(),
                    updateTag: (t: any) => sprootDB.updateJournalTagAsync(t),
                  },
                }
              : undefined,
          originalUrl: "/api/v2/journal/tags/4",
        },
        params: { tagId: "4" },
        body: { name: "y" },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as any;
      assert.equal(error.statusCode, 503);
      assert.equal(error.error.name, "Service Unavailable");
      assert.include((error.error.details as string[])[0], "update fail");
    });
  });

  describe("deleteAsync", () => {
    it("returns 400 for invalid id param", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r7" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        params: { tagId: "x" },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as any;
      assert.equal(error.statusCode, 400);
    });

    it("returns 404 when not found", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r7" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { journalTagManager: { getTags: () => sprootDB.getJournalTagsAsync() } }
              : undefined,
        },
        params: { tagId: "9" },
        originalUrl: "/api/v2/journal/tags/9",
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as any;
      assert.equal(error.statusCode, 404);
    });

    it("deletes and returns 200", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r8" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.resolves([{ id: 10, name: "t", color: null }]);
      sprootDB.deleteJournalTagAsync.resolves();

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  journalTagManager: {
                    getTags: () => sprootDB.getJournalTagsAsync(),
                    deleteTag: (id: number) => sprootDB.deleteJournalTagAsync(id),
                  },
                }
              : undefined,
        },
        params: { tagId: "10" },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as any;
      assert.equal(success.statusCode, 200);
    });

    it("returns 503 when delete fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r9" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.resolves([{ id: 11, name: "t", color: null }]);
      sprootDB.deleteJournalTagAsync.rejects(new Error("del fail"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  journalTagManager: {
                    getTags: () => sprootDB.getJournalTagsAsync(),
                    deleteTag: (id: number) => sprootDB.deleteJournalTagAsync(id),
                  },
                }
              : undefined,
          originalUrl: "/api/v2/journal/tags/11",
        },
        params: { tagId: "11" },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as any;
      assert.equal(error.statusCode, 503);
      assert.equal(error.error.name, "Service Unavailable");
      assert.include((error.error.details as string[])[0], "del fail");
    });
  });
});
