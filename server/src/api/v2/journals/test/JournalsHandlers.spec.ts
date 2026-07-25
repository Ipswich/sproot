import { Request, Response } from "express";
import { assert } from "chai";
import sinon from "sinon";
import { IJournalsRepository } from "@sproot/common/database/journals/IJournalsRepository";
import JournalManager from "../../../../journals/managers/JournalManager";
import { SuccessResponse, ErrorResponse } from "@sproot/common/api/v2/Responses";
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

  function stubJournalsMethods(sprootDB: any) {
    const journals: IJournalsRepository = {
      getAllAsync: async () => [],
      getByIdAsync: async () => [],
      addAsync: async () => 0,
      updateAsync: async () => {},
      deleteAsync: async () => {},
      getJournalTagsAsync: async () => [],
      addJournalTagAsync: async () => 0,
      updateJournalTagAsync: async () => {},
      deleteJournalTagAsync: async () => {},
      getJournalTagLookupsAsync: async () => [],
      addJournalTagLookupAsync: async () => 0,
      deleteJournalTagLookupAsync: async () => {},
      getJournalEntriesAsync: async () => [],
      getJournalEntryAsync: async () => [],
      addJournalEntryAsync: async () => 0,
      updateJournalEntryAsync: async () => {},
      deleteJournalEntryAsync: async () => {},
      getJournalEntryTagsAsync: async () => [],
      addJournalEntryTagAsync: async () => 0,
      updateJournalEntryTagAsync: async () => {},
      deleteJournalEntryTagAsync: async () => {},
      getJournalEntryTagLookupsAsync: async () => [],
      addJournalEntryTagLookupAsync: async () => 0,
      deleteJournalEntryTagLookupAsync: async () => {},
    };
    sprootDB.journals = journals;
    const methodNames = Object.getOwnPropertyNames(journals).filter(
      (name) => typeof (journals as any)[name] === "function",
    );
    for (const name of methodNames) {
      sinon.stub(sprootDB.journals, name as any);
    }
  }

  describe("getAsync", () => {
    it("should return 200 with journals", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r1" } },
      } as unknown as Response;

      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);

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
      (sprootDB.journals.getAllAsync as sinon.SinonStub).resolves(journals);
      (sprootDB.journals.getJournalTagsAsync as sinon.SinonStub).resolves([
        { id: 3, name: "x", color: null },
      ]);
      (sprootDB.journals.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);

      const journalManager = new JournalManager(sprootDB.journals);
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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.getJournalTagsAsync as sinon.SinonStub).resolves([
        { id: 9, name: "tag", color: null },
      ]);
      (sprootDB.journals.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);

      const journalManager = new JournalManager(sprootDB.journals);
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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
      (sprootDB.journals.getAllAsync as sinon.SinonStub).rejects(new Error("boom"));
      const journalManager = new JournalManager(sprootDB.journals);
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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
      (sprootDB.journals.addAsync as sinon.SinonStub).resolves(7);
      const journalManager = new JournalManager(sprootDB.journals);

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
      assert.includeMembers(error.error.details, [
        "Journal name is required and cannot exceed 64 characters.",
      ]);
    });

    it("should return 503 when DB fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "r7" } },
      } as unknown as Response;
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
      (sprootDB.journals.addAsync as sinon.SinonStub).rejects(new Error("create fail"));
      const journalManager = new JournalManager(sprootDB.journals);
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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves([]);
      const journalManager = new JournalManager(sprootDB.journals);
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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
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
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves(existing);
      (sprootDB.journals.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      const journalManager = new JournalManager(sprootDB.journals);

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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
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
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves(existing);
      (sprootDB.journals.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.updateAsync as sinon.SinonStub).resolves();
      const journalManager = new JournalManager(sprootDB.journals);

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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
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
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves(existing);
      (sprootDB.journals.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.updateAsync as sinon.SinonStub).rejects(new Error("update fail"));
      const journalManager = new JournalManager(sprootDB.journals);

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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves([]);
      const journalManager = new JournalManager(sprootDB.journals);
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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
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
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves(existing);
      (sprootDB.journals.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.deleteAsync as sinon.SinonStub).resolves();
      const journalManager = new JournalManager(sprootDB.journals);

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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
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
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves(existing);
      (sprootDB.journals.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.deleteAsync as sinon.SinonStub).rejects(new Error("del fail"));
      const journalManager = new JournalManager(sprootDB.journals);
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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves([]);
      const journalManager = new JournalManager(sprootDB.journals);
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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
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
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves(journals);
      (sprootDB.journals.getJournalTagsAsync as sinon.SinonStub).resolves([
        { id: 2, name: "x", color: null },
      ]);
      (sprootDB.journals.getJournalTagLookupsAsync as sinon.SinonStub).resolves([
        { journalId: 5, tagId: 2 },
      ]);
      const journalManager = new JournalManager(sprootDB.journals);
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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
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
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves(journals);
      (sprootDB.journals.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.addJournalTagLookupAsync as sinon.SinonStub).resolves(1);
      const journalManager = new JournalManager(sprootDB.journals);
      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  journalManager,
                  journalTagManager: {
                    getTagsAsync: async () => [{ id: 3, name: "x", color: null }],
                  },
                }
              : undefined,
        },
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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
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
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves(journals);
      (sprootDB.journals.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.addJournalTagLookupAsync as sinon.SinonStub).rejects(
        new Error("addtag fail"),
      );
      const journalManager = new JournalManager(sprootDB.journals);
      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  journalManager,
                  journalTagManager: {
                    getTagsAsync: async () => [{ id: 9, name: "tag", color: null }],
                  },
                }
              : undefined,
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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves([]);
      const journalManager = new JournalManager(sprootDB.journals);
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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
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
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves(existing);
      (sprootDB.journals.getJournalTagsAsync as sinon.SinonStub).resolves([]);
      (sprootDB.journals.getJournalTagLookupsAsync as sinon.SinonStub).resolves([]);
      const journalManager = new JournalManager(sprootDB.journals);
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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
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
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves(journals);
      (sprootDB.journals.getJournalTagsAsync as sinon.SinonStub).resolves([
        { id: 4, name: "tag", color: null },
      ]);
      (sprootDB.journals.getJournalTagLookupsAsync as sinon.SinonStub).resolves([
        { journalId: 3, tagId: 4 },
      ]);
      (sprootDB.journals.deleteJournalTagLookupAsync as sinon.SinonStub).resolves();
      const journalManager = new JournalManager(sprootDB.journals);
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
      const sprootDB = createMockSprootDB();
      stubJournalsMethods(sprootDB);
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
      (sprootDB.journals.getByIdAsync as sinon.SinonStub).resolves(journals);
      (sprootDB.journals.getJournalTagsAsync as sinon.SinonStub).resolves([
        { id: 6, name: "tag", color: null },
      ]);
      (sprootDB.journals.getJournalTagLookupsAsync as sinon.SinonStub).resolves([
        { journalId: 11, tagId: 6 },
      ]);
      (sprootDB.journals.deleteJournalTagLookupAsync as sinon.SinonStub).rejects(
        new Error("rem fail"),
      );
      const journalManager = new JournalManager(sprootDB.journals);
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

const createMockSprootDB = (): any => {
  const stub = () => sinon.stub();
  return {
    sensors: {
      getAllAsync: stub(),
      getByIdAsync: stub(),
      getDS18B20AddressesAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      updateSensorCalibrationAsync: stub(),
      deleteAsync: stub(),
      addSensorReadingAsync: stub(),
      getSensorReadingsAsync: stub(),
      getBucketedSensorReadingsAsync: stub(),
      getDataAsync: stub(),
    },
    outputs: {
      getAllAsync: stub(),
      getByIdAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
      updateLastOutputStateAsync: stub(),
      getLastOutputStateAsync: stub(),
      addOutputStateAsync: stub(),
      getOutputStatesAsync: stub(),
      getBucketedOutputStatesAsync: stub(),
      getDataAsync: stub(),
    },
    subcontrollers: {
      getAllAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
    },
    automations: {
      getAllAsync: stub(),
      getByIdAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
    },
    actions: {
      output: {
        getAllAsync: stub(),
        getAsync: stub(),
        addAsync: stub(),
        getOutputActionAsync: stub(),
        getActionsByOutputIdAsync: stub(),
        updateAsync: stub(),
      },
      notification: {
        getAllAsync: stub(),
        getAsync: stub(),
        addAsync: stub(),
        getNotificationActionByIdAsync: stub(),
        updateAsync: stub(),
      },
    },
    conditions: {
      sensor: {
        getAsync: stub(),
        addAsync: stub(),
        updateAsync: stub(),
        deleteAsync: stub(),
      },
      output: {
        getAsync: stub(),
        addAsync: stub(),
        updateAsync: stub(),
        deleteAsync: stub(),
      },
      time: {
        getAsync: stub(),
        addAsync: stub(),
        updateAsync: stub(),
        deleteAsync: stub(),
      },
      weekday: {
        getAsync: stub(),
        addAsync: stub(),
        updateAsync: stub(),
        deleteAsync: stub(),
      },
      month: {
        getAsync: stub(),
        addAsync: stub(),
        updateAsync: stub(),
        deleteAsync: stub(),
      },
      dateRange: {
        getAsync: stub(),
        addAsync: stub(),
        updateAsync: stub(),
        deleteAsync: stub(),
      },
    },
    camera: {
      getAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
    },
    users: {
      getByIdAsync: stub(),
      addAsync: stub(),
    },
    deviceZones: {
      getAllAsync: stub(),
      getByIdAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
    },
    system: {
      getAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
    },
    journals: {
      getAllAsync: stub(),
      getByIdAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
      getJournalTagsAsync: stub(),
      addJournalTagAsync: stub(),
      updateJournalTagAsync: stub(),
      deleteJournalTagAsync: stub(),
      getJournalTagLookupsAsync: stub(),
      addJournalTagLookupAsync: stub(),
      deleteJournalTagLookupAsync: stub(),
      getJournalEntriesAsync: stub(),
      getJournalEntryAsync: stub(),
      addJournalEntryAsync: stub(),
      updateJournalEntryAsync: stub(),
      deleteJournalEntryAsync: stub(),
      getJournalEntryTagsAsync: stub(),
      addJournalEntryTagAsync: stub(),
      updateJournalEntryTagAsync: stub(),
      deleteJournalEntryTagAsync: stub(),
      getJournalEntryTagLookupsAsync: stub(),
      addJournalEntryTagLookupAsync: stub(),
      deleteJournalEntryTagLookupAsync: stub(),
    },
  } as any;
};
