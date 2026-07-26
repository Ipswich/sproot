import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/common/api/v2/Responses";
import { assert } from "chai";
import sinon from "sinon";
import { IJournalTagsRepository } from "@sproot/common/database/journals/tags/IJournalTagsRepository";
import JournalTagManager from "../../../../journals/managers/JournalTagManager";
import { getAsync, addAsync, updateAsync, deleteAsync } from "../handlers/JournalTagHandlers";

function createMockJournalTagsRepo(): IJournalTagsRepository {
  const stub = () => sinon.stub();
  return {
    getTagsAsync: stub(),
    addTagAsync: stub(),
    updateTagAsync: stub(),
    deleteTagAsync: stub(),
    getLookupsAsync: stub(),
    addLookupAsync: stub(),
    deleteLookupAsync: stub(),
  };
}

describe("JournalTagHandlers.ts tests", () => {
  describe("getAsync", () => {
    it("should return 200 and tags", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r1" } },
      } as unknown as Response;
      const mockJournalTagsRepo = createMockJournalTagsRepo();
      const journalTagManager = new JournalTagManager(mockJournalTagsRepo);
      (mockJournalTagsRepo.getTagsAsync as sinon.SinonStub).resolves([
        { id: 1, name: "t", color: null },
      ]);

      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalTagManager } : undefined),
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
      const mockJournalTagsRepo = createMockJournalTagsRepo();
      const journalTagManager = new JournalTagManager(mockJournalTagsRepo);
      (mockJournalTagsRepo.getTagsAsync as sinon.SinonStub).rejects(new Error("boom"));

      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalTagManager } : undefined),
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
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r2" } },
      } as unknown as Response;
      const mockJournalTagsRepo = createMockJournalTagsRepo();
      const journalTagManager = new JournalTagManager(mockJournalTagsRepo);
      (mockJournalTagsRepo.addTagAsync as sinon.SinonStub).resolves(5);

      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalTagManager } : undefined),
        },
        body: { name: "tag1", color: "#fff" },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.exists(success.content);
      assert.isObject(success.content.data);
      assert.deepEqual(success.content.data, { id: 5, name: "tag1", color: "#fff" });
    });

    it("should return 400 when name missing", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r2" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        body: {},
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.error.name, "Bad Request");
    });

    it("should return 503 when DB fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r3" } },
      } as unknown as Response;
      const mockJournalTagsRepo = createMockJournalTagsRepo();
      const journalTagManager = new JournalTagManager(mockJournalTagsRepo);
      (mockJournalTagsRepo.addTagAsync as sinon.SinonStub).rejects(new Error("add fail"));

      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalTagManager } : undefined),
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
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r4" } },
      } as unknown as Response;
      const mockJournalTagsRepo = createMockJournalTagsRepo();
      const journalTagManager = new JournalTagManager(mockJournalTagsRepo);
      (mockJournalTagsRepo.getTagsAsync as sinon.SinonStub).resolves([]);

      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalTagManager } : undefined),
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
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r5" } },
      } as unknown as Response;
      const mockJournalTagsRepo = createMockJournalTagsRepo();
      const journalTagManager = new JournalTagManager(mockJournalTagsRepo);
      (mockJournalTagsRepo.getTagsAsync as sinon.SinonStub).resolves([
        { id: 3, name: "old", color: null },
      ]);
      (mockJournalTagsRepo.updateTagAsync as sinon.SinonStub).resolves();

      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalTagManager } : undefined),
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

    it("should return 503 when DB update fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r6" } },
      } as unknown as Response;
      const mockJournalTagsRepo = createMockJournalTagsRepo();
      const journalTagManager = new JournalTagManager(mockJournalTagsRepo);
      (mockJournalTagsRepo.getTagsAsync as sinon.SinonStub).resolves([
        { id: 4, name: "x", color: null },
      ]);
      (mockJournalTagsRepo.updateTagAsync as sinon.SinonStub).rejects(new Error("update fail"));

      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalTagManager } : undefined),
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
      const mockJournalTagsRepo = createMockJournalTagsRepo();
      const journalTagManager = new JournalTagManager(mockJournalTagsRepo);
      (mockJournalTagsRepo.getTagsAsync as sinon.SinonStub).resolves([]);

      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalTagManager } : undefined),
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
      const mockJournalTagsRepo = createMockJournalTagsRepo();
      const journalTagManager = new JournalTagManager(mockJournalTagsRepo);
      (mockJournalTagsRepo.getTagsAsync as sinon.SinonStub).resolves([
        { id: 10, name: "t", color: null },
      ]);
      (mockJournalTagsRepo.deleteTagAsync as sinon.SinonStub).resolves();

      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalTagManager } : undefined),
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
      const mockJournalTagsRepo = createMockJournalTagsRepo();
      const journalTagManager = new JournalTagManager(mockJournalTagsRepo);
      (mockJournalTagsRepo.getTagsAsync as sinon.SinonStub).resolves([
        { id: 11, name: "t", color: null },
      ]);
      (mockJournalTagsRepo.deleteTagAsync as sinon.SinonStub).rejects(new Error("del fail"));

      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalTagManager } : undefined),
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
