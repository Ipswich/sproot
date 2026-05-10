import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/sproot-common/dist/api/v2/Responses";
import { assert } from "chai";
import sinon from "sinon";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { getAsync, addAsync, updateAsync, deleteAsync } from "../handlers/JournalTagHandlers";
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

describe("JournalTagHandlers.ts tests", () => {
  describe("getAsync", () => {
    it("should return 200 and tags", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r1" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.resolves([{ id: 1, name: "t", color: null }]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { journalTagManager: { getTagsAsync: () => sprootDB.getJournalTagsAsync() } }
              : undefined,
        },
      } as unknown as Request;

      const success = (await getAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.exists(success.content);
      assert.isArray(success.content.data);
      assert.deepEqual(success.content.data, [{ id: 1, name: "t", color: null }]);
    });

    it("should return 503 when DB fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r1" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.rejects(new Error("boom"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { journalTagManager: { getTagsAsync: () => sprootDB.getJournalTagsAsync() } }
              : undefined,
          originalUrl: "/api/v2/journal/tags",
        },
      } as unknown as Request;

      const error = (await getAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      const err = error.error;
      assert.equal(err.name, "Service Unavailable");
      assert.isArray(err.details);
      assert.include(err.details[0], "boom");
    });
  });

  describe("addAsync", () => {
    it("should return 201 and the created tag", async () => {
      const mockResponse = makeRes({ body: { name: "tag1", color: "#fff" } });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addJournalTagAsync.resolves(5);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  journalTagManager: {
                    createTagAsync: (n: string, c: string | null) =>
                      sprootDB.addJournalTagAsync(n, c),
                  },
                }
              : undefined,
        },
        body: { name: "tag1", color: "#fff" },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.exists(success.content);
      assert.isObject(success.content.data);
      assert.deepEqual(success.content.data, { id: 5, name: "tag1", color: "#fff" });
    });

    it("should return 400 when remaining tag field validation fails", async () => {
      const mockResponse = makeRes({ body: { name: "", color: "#123456".repeat(6) } });
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        body: { name: "", color: "#123456".repeat(6) },
        originalUrl: "/api/v2/tags/journals",
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, [
        "Valid tag name is required.",
        "Valid tag color is required.",
      ]);
    });

    it("should consume validated create body instead of raw req.body", async () => {
      const mockResponse = makeRes({ body: { name: "validated-tag", color: "#abc" } });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addJournalTagAsync.resolves(6);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  journalTagManager: {
                    createTagAsync: (n: string, c: string | null) =>
                      sprootDB.addJournalTagAsync(n, c),
                  },
                }
              : undefined,
        },
        body: { name: "raw-tag", color: "#def" },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.deepEqual(success.content?.data, { id: 6, name: "validated-tag", color: "#abc" });
      assert.isTrue(sprootDB.addJournalTagAsync.calledOnceWithExactly("validated-tag", "#abc"));
    });

    it("should return 503 when DB fails", async () => {
      const mockResponse = makeRes({ body: { name: "x" } });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addJournalTagAsync.rejects(new Error("add fail"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  journalTagManager: {
                    createTagAsync: (n: string, c: string | null) =>
                      sprootDB.addJournalTagAsync(n, c),
                  },
                }
              : undefined,
          originalUrl: "/api/v2/journal/tags",
        },
        body: { name: "x" },
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      const err = error.error;
      assert.equal(err.name, "Service Unavailable");
      assert.isArray(err.details);
      assert.include(err.details[0], "add fail");
    });
  });

  describe("updateAsync", () => {
    it("should return 400 for invalid id param", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r4" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        params: { tagId: "a" },
        originalUrl: "/api/v2/journal/tags/a",
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.error.name, "Bad Request");
    });

    it("should return 404 when tag not found", async () => {
      const mockResponse = makeRes({ body: {} });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { journalTagManager: { getTagsAsync: () => sprootDB.getJournalTagsAsync() } }
              : undefined,
        },
        params: { tagId: "2" },
        body: {},
        originalUrl: "/api/v2/journal/tags/2",
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.error.name, "Not Found");
    });

    it("should return 200 and the updated tag", async () => {
      const mockResponse = makeRes({ body: { name: "new", color: "#000" } });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.resolves([{ id: 3, name: "old", color: null }]);
      sprootDB.updateJournalTagAsync.resolves();

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  journalTagManager: {
                    getTagsAsync: () => sprootDB.getJournalTagsAsync(),
                    updateTagAsync: (t: any) => sprootDB.updateJournalTagAsync(t),
                  },
                }
              : undefined,
        },
        params: { tagId: "3" },
        body: { name: "new", color: "#000" },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.exists(success.content);
      assert.isObject(success.content.data);
      assert.deepEqual(success.content.data, { id: 3, name: "new", color: "#000" });
    });

    it("should consume validated update body instead of raw req.body", async () => {
      const mockResponse = makeRes({ body: { name: "validated-update", color: "#222" } });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.resolves([{ id: 8, name: "old", color: null }]);
      sprootDB.updateJournalTagAsync.resolves();

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  journalTagManager: {
                    getTagsAsync: () => sprootDB.getJournalTagsAsync(),
                    updateTagAsync: (t: any) => sprootDB.updateJournalTagAsync(t),
                  },
                }
              : undefined,
        },
        params: { tagId: "8" },
        body: { name: "raw-update", color: "#333" },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.deepEqual(success.content?.data, { id: 8, name: "validated-update", color: "#222" });
      assert.isTrue(
        sprootDB.updateJournalTagAsync.calledOnceWithExactly({
          id: 8,
          name: "validated-update",
          color: "#222",
        })
      );
    });

    it("should return 503 when DB update fails", async () => {
      const mockResponse = makeRes({ body: { name: "y" } });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.resolves([{ id: 4, name: "x", color: null }]);
      sprootDB.updateJournalTagAsync.rejects(new Error("update fail"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  journalTagManager: {
                    getTagsAsync: () => sprootDB.getJournalTagsAsync(),
                    updateTagAsync: (t: any) => sprootDB.updateJournalTagAsync(t),
                  },
                }
              : undefined,
          originalUrl: "/api/v2/journal/tags/4",
        },
        params: { tagId: "4" },
        body: { name: "y" },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      const err = error.error;
      assert.equal(err.name, "Service Unavailable");
      assert.isArray(err.details);
      assert.include(err.details[0], "update fail");
    });
  });

  describe("deleteAsync", () => {
    it("should return 400 for invalid id param", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r7" } },
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
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r7" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalTagsAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? { journalTagManager: { getTagsAsync: () => sprootDB.getJournalTagsAsync() } }
              : undefined,
        },
        params: { tagId: "9" },
        originalUrl: "/api/v2/journal/tags/9",
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
    });

    it("should return 200 and delete the tag", async () => {
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
                    getTagsAsync: () => sprootDB.getJournalTagsAsync(),
                    deleteTagAsync: (id: number) => sprootDB.deleteJournalTagAsync(id),
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
                    getTagsAsync: () => sprootDB.getJournalTagsAsync(),
                    deleteTagAsync: (id: number) => sprootDB.deleteJournalTagAsync(id),
                  },
                }
              : undefined,
          originalUrl: "/api/v2/journal/tags/11",
        },
        params: { tagId: "11" },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      const err = error.error;
      assert.equal(err.name, "Service Unavailable");
      assert.isArray(err.details);
      assert.include(err.details[0], "del fail");
    });
  });
});
