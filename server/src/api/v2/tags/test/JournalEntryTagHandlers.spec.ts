import { Request, Response } from "express";
import { assert } from "chai";
import sinon from "sinon";
import { IJournalsRepository } from "@sproot/common/database/journals/IJournalsRepository";
import { getAsync, addAsync, updateAsync, deleteAsync } from "../handlers/JournalEntryTagHandlers";
import { ErrorResponse, SuccessResponse } from "@sproot/common/api/v2/Responses";
import { SDBJournalEntryTag } from "@sproot/common/database/SDBJournalEntryTag";

const createMockJournalsRepo = (): IJournalsRepository => ({
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
});

function stubJournals(journals: IJournalsRepository) {
  const methodNames = [
    "getAllAsync",
    "getByIdAsync",
    "addAsync",
    "updateAsync",
    "deleteAsync",
    "getJournalTagsAsync",
    "addJournalTagAsync",
    "updateJournalTagAsync",
    "deleteJournalTagAsync",
    "getJournalTagLookupsAsync",
    "addJournalTagLookupAsync",
    "deleteJournalTagLookupAsync",
    "getJournalEntriesAsync",
    "getJournalEntryAsync",
    "addJournalEntryAsync",
    "updateJournalEntryAsync",
    "deleteJournalEntryAsync",
    "getJournalEntryTagsAsync",
    "addJournalEntryTagAsync",
    "updateJournalEntryTagAsync",
    "deleteJournalEntryTagAsync",
    "getJournalEntryTagLookupsAsync",
    "addJournalEntryTagLookupAsync",
    "deleteJournalEntryTagLookupAsync",
  ];
  for (const name of methodNames) {
    sinon.stub(journals, name as any);
  }
}

describe("JournalEntryTagHandlers.ts tests", () => {
  describe("getAsync", () => {
    it("should return 200 and entry tags", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er1" } },
      } as unknown as Response;
      const journals = createMockJournalsRepo();
      stubJournals(journals);
      (journals.getJournalEntryTagsAsync as sinon.SinonStub).resolves([
        { id: 1, name: "et", color: null },
      ]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTagsAsync: () => journals.getJournalEntryTagsAsync(),
                  },
                }
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
      const journals = createMockJournalsRepo();
      stubJournals(journals);
      (journals.getJournalEntryTagsAsync as sinon.SinonStub).rejects(new Error("boom2"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTagsAsync: () => journals.getJournalEntryTagsAsync(),
                  },
                }
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
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er2" } },
      } as unknown as Response;
      const journals = createMockJournalsRepo();
      stubJournals(journals);
      (journals.addJournalEntryTagAsync as sinon.SinonStub).resolves(7);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    createTagAsync: (n: string, c: string | null) =>
                      journals.addJournalEntryTagAsync(n, c),
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

    it("should return 400 when name missing", async () => {
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

    it("should return 503 when DB fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er3" } },
      } as unknown as Response;
      const journals = createMockJournalsRepo();
      stubJournals(journals);
      (journals.addJournalEntryTagAsync as sinon.SinonStub).rejects(new Error("addFail2"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    createTagAsync: (n: string, c: string | null) =>
                      journals.addJournalEntryTagAsync(n, c),
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
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er4" } },
      } as unknown as Response;
      const journals = createMockJournalsRepo();
      stubJournals(journals);
      (journals.getJournalEntryTagsAsync as sinon.SinonStub).resolves([]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTagsAsync: () => journals.getJournalEntryTagsAsync(),
                  },
                }
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
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er5" } },
      } as unknown as Response;
      const journals = createMockJournalsRepo();
      stubJournals(journals);
      (journals.getJournalEntryTagsAsync as sinon.SinonStub).resolves([
        { id: 3, name: "old", color: null },
      ]);
      (journals.updateJournalEntryTagAsync as sinon.SinonStub).resolves();

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTagsAsync: () => journals.getJournalEntryTagsAsync(),
                    updateTagAsync: (t: SDBJournalEntryTag) =>
                      journals.updateJournalEntryTagAsync(t),
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

    it("should return 503 when update fails", async () => {
      const mockResponse = {
        locals: { defaultProperties: { timestamp: new Date().toISOString(), requestId: "er6" } },
      } as unknown as Response;
      const journals = createMockJournalsRepo();
      stubJournals(journals);
      (journals.getJournalEntryTagsAsync as sinon.SinonStub).resolves([
        { id: 4, name: "a", color: null },
      ]);
      (journals.updateJournalEntryTagAsync as sinon.SinonStub).rejects(new Error("updFail"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTagsAsync: () => journals.getJournalEntryTagsAsync(),
                    updateTagAsync: (t: SDBJournalEntryTag) =>
                      journals.updateJournalEntryTagAsync(t),
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
      const journals = createMockJournalsRepo();
      stubJournals(journals);
      (journals.getJournalEntryTagsAsync as sinon.SinonStub).resolves([]);

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTagsAsync: () => journals.getJournalEntryTagsAsync(),
                  },
                }
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
      const journals = createMockJournalsRepo();
      stubJournals(journals);
      (journals.getJournalEntryTagsAsync as sinon.SinonStub).resolves([
        { id: 10, name: "t", color: null },
      ]);
      (journals.deleteJournalEntryTagAsync as sinon.SinonStub).resolves();

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTagsAsync: () => journals.getJournalEntryTagsAsync(),
                    deleteTagAsync: (id: number) => journals.deleteJournalEntryTagAsync(id),
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
      const journals = createMockJournalsRepo();
      stubJournals(journals);
      (journals.getJournalEntryTagsAsync as sinon.SinonStub).resolves([
        { id: 11, name: "t", color: null },
      ]);
      (journals.deleteJournalEntryTagAsync as sinon.SinonStub).rejects(new Error("delFail2"));

      const mockRequest = {
        app: {
          get: (k: string) =>
            k === "journalService"
              ? {
                  entryTagManager: {
                    getTagsAsync: () => journals.getJournalEntryTagsAsync(),
                    deleteTagAsync: (id: number) => journals.deleteJournalEntryTagAsync(id),
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
