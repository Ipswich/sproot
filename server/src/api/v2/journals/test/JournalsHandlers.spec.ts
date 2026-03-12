import { Request, Response } from "express";
import { assert } from "chai";
import sinon from "sinon";
import { MockSprootDB, ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import JournalManager from "../../../../journals/managers/JournalManager";
import { SuccessResponse, ErrorResponse } from "@sproot/sproot-common/dist/api/v2/Responses";
import {
  getAsync,
  addAsync,
  updateAsync,
  deleteAsync,
  addTagAsync,
  removeTagAsync,
} from "../handlers/JournalsHandlers";

describe("JournalsHandlers.ts tests", () => {
  afterEach(() => sinon.restore());

  describe("getAsync", () => {
    it("should return 200 with journals", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r1" } },
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const journals = [
        {
          id: 1,
          title: "j",
          description: null,
          icon: null,
          color: null,
          archived: false,
          archivedAt: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
        },
      ];
      (sprootDB.getJournalsAsync as sinon.SinonStub).resolves(journals);
      (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);

      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? { journalManager } : undefined) },
        params: {},
      } as unknown as Request;

      const success = (await getAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.isArray(success.content?.data);
      assert.strictEqual((success.content?.data as Array<any>)[0].journal.id, 1);
    });

    it("should return 400 for invalid id param", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r2" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        params: { journalId: "x" },
        originalUrl: "/api/v2/journals/x",
      } as unknown as Request;

      const error = (await getAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.error.name, "Bad Request");
      assert.includeMembers(error.error.details, ["Valid Journal ID is required."]);
    });

    it("should return 404 when specific journal not found", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r3" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves([]);
      (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);

      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? { journalManager } : undefined) },
        params: { journalId: "9" },
        originalUrl: "/api/v2/journals/9",
      } as unknown as Request;

      const error = (await getAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.error.name, "Not Found");
      assert.includeMembers(error.error.details, [`Journal with ID 9 not found.`]);
    });

    it("should return 503 when DB fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r4" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      (sprootDB.getJournalsAsync as sinon.SinonStub).rejects(new Error("boom"));
      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? { journalManager } : undefined) },
        originalUrl: "/api/v2/journals",
        params: {},
      } as unknown as Request;

      const error = (await getAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.error.name, "Service Unavailable");
      assert.include(error.error.details[0], "boom");
    });
  });

  describe("addAsync", () => {
    it("should return 201 and the created journal", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r5" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      (sprootDB.addJournalAsync as sinon.SinonStub).resolves(7);
      const journalManager = new JournalManager(sprootDB as ISprootDB);

      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? { journalManager } : undefined) },
        body: { title: "New Journal", description: "d", icon: null, color: null },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.content?.data.id, 7);
      assert.equal(success.content?.data.title, "New Journal");
    });

    it("should return 400 when title missing", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r6" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        body: {},
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.error.name, "Bad Request");
      assert.includeMembers(error.error.details, ["Journal name is required."]);
    });

    it("should return 503 when DB fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r7" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      (sprootDB.addJournalAsync as sinon.SinonStub).rejects(new Error("create fail"));
      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? { journalManager } : undefined) },
        body: { title: "x" },
        originalUrl: "/api/v2/journals",
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.error.name, "Service Unavailable");
      assert.include(error.error.details[0], "create fail");
    });
  });

  describe("updateAsync", () => {
    it("should return 400 for invalid id param", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r8" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        params: { journalId: "a" },
        originalUrl: "/api/v2/journals/a",
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.error.name, "Bad Request");
      assert.includeMembers(error.error.details, ["Valid Journal ID is required."]);
    });

    it("should return 404 when journal not found", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r9" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves([]);
      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? { journalManager } : undefined) },
        params: { journalId: "5" },
        body: {},
        originalUrl: "/api/v2/journals/5",
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.includeMembers(error.error.details, [`Journal with ID 5 not found.`]);
    });

    it("should return 400 when trying to change archived journal", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r10" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const existing = [
        {
          id: 6,
          title: "t",
          description: null,
          icon: null,
          color: null,
          archived: true,
          archivedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
        },
      ];
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves(existing);
      (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      const journalManager = new JournalManager(sprootDB as ISprootDB);

      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? { journalManager } : undefined) },
        params: { journalId: "6" },
        body: { archived: true },
        originalUrl: "/api/v2/journals/6",
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.error.name, "Bad Request");
      assert.includeMembers(error.error.details, [
        "Journal is archived; archive must be false to make changes.",
      ]);
    });

    it("should return 200 and the updated journal", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r11" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const existing = [
        {
          id: 8,
          title: "old",
          description: null,
          icon: null,
          color: null,
          archived: false,
          archivedAt: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
        },
      ];
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves(existing);
      (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.updateJournalAsync as sinon.SinonStub).resolves();
      const journalManager = new JournalManager(sprootDB as ISprootDB);

      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? { journalManager } : undefined) },
        params: { journalId: "8" },
        body: { title: "new" },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.content?.data.title, "new");
    });

    it("should return 503 when update fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r12" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const existing = [
        {
          id: 12,
          title: "x",
          description: null,
          icon: null,
          color: null,
          archived: false,
          archivedAt: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
        },
      ];
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves(existing);
      (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.updateJournalAsync as sinon.SinonStub).rejects(new Error("update fail"));
      const journalManager = new JournalManager(sprootDB as ISprootDB);

      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? { journalManager } : undefined) },
        params: { journalId: "12" },
        body: { title: "y" },
        originalUrl: "/api/v2/journals/12",
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.error.name, "Service Unavailable");
      assert.include(error.error.details[0], "update fail");
    });
  });

  describe("deleteAsync", () => {
    it("should return 400 for invalid id param", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r13" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        params: { journalId: "x" },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.includeMembers(error.error.details, ["Valid Journal ID is required."]);
    });

    it("should return 404 when not found", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r14" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves([]);
      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? { journalManager } : undefined) },
        params: { journalId: "2" },
        originalUrl: "/api/v2/journals/2",
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.includeMembers(error.error.details, [`Journal with ID 2 not found.`]);
    });

    it("should return 200 and delete the journal", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r15" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const existing = [
        {
          id: 3,
          title: "t",
          description: null,
          icon: null,
          color: null,
          archived: false,
          archivedAt: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
        },
      ];
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves(existing);
      (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.deleteJournalAsync as sinon.SinonStub).resolves();
      const journalManager = new JournalManager(sprootDB as ISprootDB);

      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? { journalManager } : undefined) },
        params: { journalId: "3" },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.include(success.content?.data as string, "successfully deleted");
    });

    it("should return 503 when delete fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r16" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const existing = [
        {
          id: 4,
          title: "t",
          description: null,
          icon: null,
          color: null,
          archived: false,
          archivedAt: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
        },
      ];
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves(existing);
      (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.deleteJournalAsync as sinon.SinonStub).rejects(new Error("del fail"));
      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalManager } : undefined),
          originalUrl: "/api/v2/journals/4",
        },
        params: { journalId: "4" },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.error.name, "Service Unavailable");
      assert.include(error.error.details[0], "del fail");
    });
  });

  describe("addTagAsync", () => {
    it("should return 400 when missing params for addTagAsync", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r17" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        params: {},
        body: {},
      } as unknown as Request;

      const error = (await addTagAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.includeMembers(error.error.details, [
        "Valid Journal ID is required.",
        "Valid tag ID is required.",
      ]);
    });

    it("should return 404 when journal not found for addTagAsync", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r18" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves([]);
      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalManager } : undefined),
          originalUrl: "/api/v2/journals/1/tags",
        },
        params: { journalId: "1" },
        body: { tagId: 2 },
      } as unknown as Request;

      const error = (await addTagAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.includeMembers(error.error.details, [`Journal with ID 1 not found.`]);
    });

    it("should return 200 when tag already present", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r19" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const journals = [
        {
          id: 5,
          title: "t",
          description: null,
          icon: null,
          color: null,
          archived: false,
          archivedAt: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
        },
      ];
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves(journals);
      (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves([
        { id: 2, name: "x", color: null },
      ]);
      (sprootDB.getJournalTagLookupsAsync as sinon.SinonStub).resolves([
        { journalId: 5, tagId: 2 },
      ]);
      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? { journalManager } : undefined) },
        params: { journalId: "5" },
        body: { tagId: 2 },
      } as unknown as Request;

      const success = (await addTagAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.include(success.content?.data as string, "already has tag");
    });

    it("should return 200 and add the tag to the journal", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r20" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const journals = [
        {
          id: 6,
          title: "t",
          description: null,
          icon: null,
          color: null,
          archived: false,
          archivedAt: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
        },
      ];
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves(journals);
      (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.addJournalTagLookupAsync as sinon.SinonStub).resolves(1);
      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? { journalManager } : undefined) },
        params: { journalId: "6" },
        body: { tagId: 3 },
      } as unknown as Request;

      const success = (await addTagAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.include(success.content?.data as string, "added to journal");
    });

    it("should return 503 when addTag fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r21" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const journals = [
        {
          id: 7,
          title: "t",
          description: null,
          icon: null,
          color: null,
          archived: false,
          archivedAt: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
        },
      ];
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves(journals);
      (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.addJournalTagLookupAsync as sinon.SinonStub).rejects(new Error("addtag fail"));
      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalManager } : undefined),
          originalUrl: "/api/v2/journals/7/tags",
        },
        params: { journalId: "7" },
        body: { tagId: 9 },
      } as unknown as Request;

      const error = (await addTagAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.error.name, "Service Unavailable");
      assert.include(error.error.details[0], "addtag fail");
    });
  });

  describe("removeTagAsync", () => {
    it("should return 400 when missing params for removeTagAsync", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r22" } },
      } as unknown as Response;
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? {} : undefined) },
        params: { journalId: "x", tagId: "y" },
      } as unknown as Request;

      const error = (await removeTagAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.includeMembers(error.error.details, [
        "Valid Journal ID is required.",
        "Valid tag ID is required.",
      ]);
    });

    it("should return 404 when journal not found for removeTagAsync", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r23" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves([]);
      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalManager } : undefined),
          originalUrl: "/api/v2/journals/1/tags/2",
        },
        params: { journalId: "1", tagId: "2" },
      } as unknown as Request;

      const error = (await removeTagAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.includeMembers(error.error.details, [`Journal with ID 1 not found.`]);
    });

    it("should return 404 when tag not attached for removeTagAsync", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r24" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const existing = [
        {
          id: 2,
          title: "t",
          description: null,
          icon: null,
          color: null,
          archived: false,
          archivedAt: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
        },
      ];
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves(existing);
      (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalManager } : undefined),
          originalUrl: "/api/v2/journals/2/tags/9",
        },
        params: { journalId: "2", tagId: "9" },
      } as unknown as Request;

      const error = (await removeTagAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.includeMembers(error.error.details, [
        `Journal with ID 2 does not have tag with ID 9 and cannot be removed.`,
      ]);
    });

    it("should return 200 and remove the tag from the journal", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r25" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const journals = [
        {
          id: 3,
          title: "t",
          description: null,
          icon: null,
          color: null,
          archived: false,
          archivedAt: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
        },
      ];
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves(journals);
      (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves([
        { id: 4, name: "tag", color: null },
      ]);
      (sprootDB.getJournalTagLookupsAsync as sinon.SinonStub).resolves([
        { journalId: 3, tagId: 4 },
      ]);
      (sprootDB.deleteJournalTagLookupAsync as sinon.SinonStub).resolves();
      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: { get: (k: string) => (k === "journalService" ? { journalManager } : undefined) },
        params: { journalId: "3", tagId: "4" },
      } as unknown as Request;

      const success = (await removeTagAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.include(success.content?.data as string, "removed from journal");
    });

    it("should return 503 when removeTag fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r26" } },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const journals = [
        {
          id: 11,
          title: "t",
          description: null,
          icon: null,
          color: null,
          archived: false,
          archivedAt: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
        },
      ];
      (sprootDB.getJournalAsync as sinon.SinonStub).resolves(journals);
      (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves([
        { id: 6, name: "tag", color: null },
      ]);
      (sprootDB.getJournalTagLookupsAsync as sinon.SinonStub).resolves([
        { journalId: 11, tagId: 6 },
      ]);
      (sprootDB.deleteJournalTagLookupAsync as sinon.SinonStub).rejects(new Error("rem fail"));
      const journalManager = new JournalManager(sprootDB as ISprootDB);
      const mockRequest = {
        app: {
          get: (k: string) => (k === "journalService" ? { journalManager } : undefined),
          originalUrl: "/api/v2/journals/11/tags/6",
        },
        params: { journalId: "11", tagId: "6" },
      } as unknown as Request;

      const error = (await removeTagAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.error.name, "Service Unavailable");
      assert.include(error.error.details[0], "rem fail");
    });
  });
});
