import { assert } from "chai";
import sinon from "sinon";
import { Request, Response } from "express";
import { SuccessResponse, ErrorResponse } from "@sproot/common/api/v2/Responses";
import { IJournalRepository } from "@sproot/common/database/journals/IJournalRepository";
import { IJournalTagsRepository } from "@sproot/common/database/journals/tags/IJournalTagsRepository";
import { IEntriesRepository } from "@sproot/common/database/journals/entries/IEntriesRepository";
import { IEntryTagsRepository } from "@sproot/common/database/journals/tags/IEntryTagsRepository";
import { SDBJournalEntry } from "@sproot/common/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/common/database/SDBJournalEntryTag";
import JournalService from "../../../../journals/JournalService";

import {
  getByJournalIdAsync,
  getByEntryIdAsync,
  addAsync,
  updateAsync,
  deleteAsync,
  addTagAsync,
  removeTagAsync,
} from "../handlers/JournalEntriesHandlers";

describe("JournalEntriesHandlers", () => {
  let sandbox: sinon.SinonSandbox;

  function createMockRepositories() {
    const stub = () => sinon.stub();
    const entryTagsRepoInner: IEntryTagsRepository = {
      getTagsAsync: stub(),
      addTagAsync: stub(),
      updateTagAsync: stub(),
      deleteTagAsync: stub(),
      getLookupsAsync: stub(),
      addLookupAsync: stub(),
      deleteLookupAsync: stub(),
    };

    const entriesRepoInner: IEntriesRepository = {
      getEntriesAsync: stub(),
      getEntryAsync: stub(),
      addEntryAsync: stub(),
      updateEntryAsync: stub(),
      deleteEntryAsync: stub(),
      tags: entryTagsRepoInner,
    };

    const journalsRepo: IJournalRepository = {
      getAllAsync: stub(),
      getByIdAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
      entries: entriesRepoInner,
      tags: {
        getTagsAsync: stub(),
        addTagAsync: stub(),
        updateTagAsync: stub(),
        deleteTagAsync: stub(),
        getLookupsAsync: stub(),
        addLookupAsync: stub(),
        deleteLookupAsync: stub(),
      },
    } as IJournalRepository;

    const journalTagsRepo: IJournalTagsRepository = {
      getTagsAsync: stub(),
      addTagAsync: stub(),
      updateTagAsync: stub(),
      deleteTagAsync: stub(),
      getLookupsAsync: stub(),
      addLookupAsync: stub(),
      deleteLookupAsync: stub(),
    } as unknown as IJournalTagsRepository;

    return { journalsRepo, journalTagsRepo, entriesRepoInner, entryTagsRepoInner };
  }

  function stubRepositories(repos: ReturnType<typeof createMockRepositories>) {
    const stub = (repos: ReturnType<typeof createMockRepositories>) => {
      (repos.journalsRepo.getByIdAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.getAllAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.addAsync as sinon.SinonStub).resolves(2);
      (repos.journalsRepo.updateAsync as sinon.SinonStub).resolves();
      (repos.journalsRepo.deleteAsync as sinon.SinonStub).resolves();
      (repos.entriesRepoInner.getEntriesAsync as sinon.SinonStub).resolves([]);
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([]);
      (repos.entriesRepoInner.addEntryAsync as sinon.SinonStub).resolves(5);
      (repos.entriesRepoInner.updateEntryAsync as sinon.SinonStub).resolves();
      (repos.entriesRepoInner.deleteEntryAsync as sinon.SinonStub).resolves();
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.addTagAsync as sinon.SinonStub).resolves(11);
      (repos.entryTagsRepoInner.updateTagAsync as sinon.SinonStub).resolves();
      (repos.entryTagsRepoInner.deleteTagAsync as sinon.SinonStub).resolves();
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.addLookupAsync as sinon.SinonStub).resolves(100);
      (repos.entryTagsRepoInner.deleteLookupAsync as sinon.SinonStub).resolves();
    };

    stub(repos);
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const makeRes = () => {
    const res: Partial<Response> = {
      locals: { defaultProperties: {} },
    };
    return res as Response;
  };

  const sampleEntry: SDBJournalEntry = {
    id: 5,
    journalId: 2,
    title: "t",
    content: "c",
    createdAt: new Date().toISOString(),
    editedAt: new Date().toISOString(),
  } as SDBJournalEntry;

  const sampleTag: SDBJournalEntryTag = {
    id: 11,
    name: "tag",
    color: null,
  } as SDBJournalEntryTag;

  describe("getByJournalIdAsync", () => {
    it("should return 400 when journalId is not a number", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.journalsRepo.getByIdAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.tags.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.tags.getLookupsAsync as sinon.SinonStub).resolves([]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { journalId: "not-a-number" },
        query: {},
        originalUrl: "/api/journals/xyz/entries",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getByJournalIdAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, ["Valid Journal ID is required."]);
    });

    it("should return 404 when journal not found", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.journalsRepo.getByIdAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.tags.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.tags.getLookupsAsync as sinon.SinonStub).resolves([]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { journalId: "2" },
        query: {},
        originalUrl: "/api/journals/2/entries",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getByJournalIdAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 404);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [`Journal with ID 2 not found.`]);
    });

    it("should return 200 and entries when journal exists", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.journalsRepo.getByIdAsync as sinon.SinonStub).resolves([
        {
          id: 2,
          title: "j",
          description: null,
          archived: false,
          icon: null,
          color: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
          archivedAt: null,
        },
      ]);
      (repos.journalsRepo.tags.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.tags.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entriesRepoInner.getEntriesAsync as sinon.SinonStub).resolves([sampleEntry]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([
        { id: 100, journalEntryId: 5, tagId: 11 },
      ]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([sampleTag]);

      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { journalId: "2" },
        query: {},
        originalUrl: "/api/journals/2/entries",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getByJournalIdAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
      assert.exists(result.content);
      assert.isArray(result.content.data);
      assert.equal(result.content.data[0].entry.id, sampleEntry.id);
    });

    it("should return 503 when underlying DB throws", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.journalsRepo.getByIdAsync as sinon.SinonStub).rejects(new Error("boom"));
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { journalId: "2" },
        query: {},
        originalUrl: "/api/journals/2/entries",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getByJournalIdAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 503);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [`Failed to retrieve journal entries: boom`]);
    });

    it("should omit content when withContent=false", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.journalsRepo.getByIdAsync as sinon.SinonStub).resolves([
        {
          id: 2,
          title: "j",
          description: null,
          archived: false,
          icon: null,
          color: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
          archivedAt: null,
        },
      ]);
      (repos.journalsRepo.tags.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.tags.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entriesRepoInner.getEntriesAsync as sinon.SinonStub).resolves([
        { ...sampleEntry, content: undefined },
      ]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([
        { id: 100, journalEntryId: 5, tagId: 11 },
      ]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([sampleTag]);

      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { journalId: "2" },
        query: { withContent: false },
        originalUrl: "/api/journals/2/entries?withContent=false",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getByJournalIdAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
      assert.exists(result.content);
      assert.isArray(result.content.data);
      assert.isUndefined(result.content.data[0].entry.content);
    });
  });

  describe("getByEntryIdAsync", () => {
    it("should return 400 when entryId param invalid", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "bad" },
        query: {},
        originalUrl: "/api/journals/entries/bad",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getByEntryIdAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, ["Valid Journal Entry ID is required."]);
    });

    it("should return 404 when entry not found", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        query: {},
        originalUrl: "/api/journals/entries/5",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getByEntryIdAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 404);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [`Journal Entry with ID 5 not found.`]);
    });

    it("should return 200 and entry when found", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([sampleEntry]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([
        { id: 101, journalEntryId: 5, tagId: 11 },
      ]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([sampleTag]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        query: {},
        originalUrl: "/api/journals/entries/5",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getByEntryIdAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
      assert.exists(result.content);
      assert.isArray(result.content.data);
      assert.equal(result.content.data[0].entry.id, sampleEntry.id);
    });

    it("should return 200 and entry with undefined content when withContent=false", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const sampleNoContent = { ...sampleEntry } as SDBJournalEntry;
      (sampleNoContent as any).content = undefined;
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([sampleNoContent]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([
        { id: 101, journalEntryId: 5, tagId: 11 },
      ]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([sampleTag]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        query: { withContent: false },
        originalUrl: "/api/journals/entries/5?withContent=false",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getByEntryIdAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
      assert.exists(result.content);
      assert.isArray(result.content.data);
      assert.isUndefined(result.content.data[0].entry.content);
    });

    it("should return 503 when DB throws", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).rejects(new Error("boom"));
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        query: {},
        originalUrl: "/api/journals/entries/5",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getByEntryIdAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 503);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [`Failed to retrieve journal entries: boom`]);
    });
  });

  describe("addAsync", () => {
    it("should return 404 when journal does not exist", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.journalsRepo.getByIdAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.tags.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.tags.getLookupsAsync as sinon.SinonStub).resolves([]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { journalId: "2" },
        body: { content: "ok" },
        originalUrl: "/api/journals/2/entries",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await addAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 404);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [`Journal with ID 2 not found.`]);
    });

    it("should return 400 when journalId invalid", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.journalsRepo.getByIdAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.tags.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.tags.getLookupsAsync as sinon.SinonStub).resolves([]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { journalId: "x" },
        body: { content: "ok" },
        originalUrl: "/api/journals/x/entries",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await addAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [`Valid Journal ID is required.`]);
    });

    it("should return 400 when content missing", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.journalsRepo.getByIdAsync as sinon.SinonStub).resolves([
        {
          id: 2,
          title: "j",
          description: null,
          archived: false,
          icon: null,
          color: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
          archivedAt: null,
        },
      ]);
      (repos.journalsRepo.tags.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.tags.getLookupsAsync as sinon.SinonStub).resolves([]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { journalId: "2" },
        body: { content: "" },
        originalUrl: "/api/journals/2/entries",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await addAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, ["Journal Entry content is required."]);
    });

    it("should return 201 when created", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.journalsRepo.getByIdAsync as sinon.SinonStub).resolves([
        {
          id: 2,
          title: "j",
          description: null,
          archived: false,
          icon: null,
          color: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
          archivedAt: null,
        },
      ]);
      (repos.journalsRepo.tags.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.tags.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entriesRepoInner.addEntryAsync as sinon.SinonStub).resolves(7);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { journalId: "2" },
        body: { content: "ok", title: "hi" },
        originalUrl: "/api/journals/2/entries",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await addAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 201);
      assert.exists(result.content);
      assert.isObject(result.content!.data);
      assert.equal(result.content!.data.id, 7);
    });

    it("should return 503 when create throws", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.journalsRepo.getByIdAsync as sinon.SinonStub).resolves([
        {
          id: 2,
          title: "j",
          description: null,
          archived: false,
          icon: null,
          color: null,
          createdAt: new Date().toISOString(),
          editedAt: new Date().toISOString(),
          archivedAt: null,
        },
      ]);
      (repos.journalsRepo.tags.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.tags.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entriesRepoInner.addEntryAsync as sinon.SinonStub).rejects(new Error("boom"));
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { journalId: "2" },
        body: { content: "ok" },
        originalUrl: "/api/journals/2/entries",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await addAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 503);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.include(err.details[0], "Failed to create Journal Entry: boom");
    });
  });

  describe("updateAsync", () => {
    it("should return 400 when entryId invalid", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "x" },
        body: { content: "ok" },
        originalUrl: "/api/journals/entries/x",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await updateAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, ["Valid Journal Entry ID is required."]);
    });

    it("should return 400 when content is explicitly null", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        body: { content: null },
        originalUrl: "/api/journals/entries/5",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await updateAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, ["Journal Entry content cannot be null."]);
    });

    it("should return 404 when entry not found", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        body: { content: "ok" },
        originalUrl: "/api/journals/entries/5",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await updateAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 404);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [`Journal Entry with ID 5 not found.`]);
    });

    it("should return 200 when update succeeds", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const existing = { ...sampleEntry };
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([existing]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.entriesRepoInner.updateEntryAsync as sinon.SinonStub).resolves();
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        body: { content: "new content" },
        originalUrl: "/api/journals/entries/5",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await updateAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
    });

    it("should return 503 when update throws", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([sampleEntry]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.entriesRepoInner.updateEntryAsync as sinon.SinonStub).rejects(new Error("boom"));
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        body: { content: "new content" },
        originalUrl: "/api/journals/entries/5",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await updateAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 503);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [`Failed to update Journal Entry: boom`]);
    });
  });

  describe("deleteAsync", () => {
    it("should return 400 when entryId invalid", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "x" },
        originalUrl: "/api/journals/entries/x",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await deleteAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, ["Valid Journal Entry ID is required."]);
    });

    it("should return 404 when entry not found", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        originalUrl: "/api/journals/entries/5",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await deleteAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 404);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [`Journal Entry with ID 5 not found.`]);
    });

    it("should return 200 when delete succeeds", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([sampleEntry]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.entriesRepoInner.deleteEntryAsync as sinon.SinonStub).resolves();
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        originalUrl: "/api/journals/entries/5",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await deleteAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
    });

    it("should return 503 when delete throws", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([sampleEntry]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.entriesRepoInner.deleteEntryAsync as sinon.SinonStub).rejects(new Error("boom"));
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        originalUrl: "/api/journals/entries/5",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await deleteAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 503);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [`Failed to delete Journal Entry with ID 5: boom`]);
    });
  });

  describe("addTagAsync", () => {
    it("should return 400 when ids invalid", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "x" },
        body: { tagId: "y" },
        originalUrl: "/api/journals/entries/x/tags",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await addTagAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, [
        "Valid Journal Entry ID is required.",
        "Valid Tag ID is required.",
      ]);
    });

    it("should return 404 when entry not found", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        body: { tagId: 11 },
        originalUrl: "/api/journals/entries/5/tags",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await addTagAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 404);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [`Journal Entry with ID 5 not found.`]);
    });

    it("should return 200 when tag already exists on entry", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const entryWithTag = { ...sampleEntry, tags: [sampleTag] } as SDBJournalEntry & {
        tags: SDBJournalEntryTag[];
      };
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([entryWithTag]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([
        { id: 200, journalEntryId: 5, tagId: 11 },
      ]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([sampleTag]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        body: { tagId: 11 },
        originalUrl: "/api/journals/entries/5/tags",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await addTagAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
    });

    it("should return 404 when tag id does not exist", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const entryNoTags = { ...sampleEntry, tags: [] } as SDBJournalEntry & {
        tags: SDBJournalEntryTag[];
      };
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([entryNoTags]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.journalsRepo.tags.getTagsAsync as sinon.SinonStub).resolves([]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        body: { tagId: 11 },
        originalUrl: "/api/journals/entries/5/tags",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await addTagAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 404);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [`Journal Entry Tag with ID 11 not found.`]);
    });

    it("should return 200 when tag added successfully", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const entryNoTags = { ...sampleEntry, tags: [] } as SDBJournalEntry & {
        tags: SDBJournalEntryTag[];
      };
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([entryNoTags]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([
        { id: 11, name: "t", color: null },
      ]);
      (repos.entryTagsRepoInner.addLookupAsync as sinon.SinonStub).resolves(77);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        body: { tagId: 11 },
        originalUrl: "/api/journals/entries/5/tags",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await addTagAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
    });

    it("should return 503 when addTag throws", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const entryNoTags = { ...sampleEntry, tags: [] } as SDBJournalEntry & {
        tags: SDBJournalEntryTag[];
      };
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([entryNoTags]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([
        { id: 11, name: "t", color: null },
      ]);
      (repos.entryTagsRepoInner.addLookupAsync as sinon.SinonStub).rejects(new Error("boom"));
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5" },
        body: { tagId: 11 },
        originalUrl: "/api/journals/entries/5/tags",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await addTagAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 503);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [
        `Failed to add tag with ID 11 to Journal Entry with ID 5: boom`,
      ]);
    });
  });

  describe("removeTagAsync", () => {
    it("should return 400 when ids invalid", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "x", tagId: "y" },
        originalUrl: "/api/journals/entries/x/tags/y",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await removeTagAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, [
        "Valid Journal Entry ID is required.",
        "Valid Tag ID is required.",
      ]);
    });

    it("should return 404 when entry not found", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5", tagId: "11" },
        originalUrl: "/api/journals/entries/5/tags/11",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await removeTagAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 404);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [`Journal Entry with ID 5 not found.`]);
    });

    it("should return 404 when entry does not have tag", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const entryNoTags = { ...sampleEntry, tags: [] } as SDBJournalEntry & {
        tags: SDBJournalEntryTag[];
      };
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([entryNoTags]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([]);
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5", tagId: "11" },
        originalUrl: "/api/journals/entries/5/tags/11",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await removeTagAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 404);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [
        `Journal Entry with ID 5 does not have tag with ID 11 and cannot be removed.`,
      ]);
    });

    it("should return 200 when tag removed", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const entryWithTag = { ...sampleEntry, tags: [sampleTag] } as SDBJournalEntry & {
        tags: SDBJournalEntryTag[];
      };
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([entryWithTag]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([
        { id: 300, journalEntryId: 5, tagId: 11 },
      ]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([sampleTag]);
      (repos.entryTagsRepoInner.deleteLookupAsync as sinon.SinonStub).resolves();
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5", tagId: "11" },
        originalUrl: "/api/journals/entries/5/tags/11",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await removeTagAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
    });

    it("should return 503 when removeTag throws", async () => {
      const repos = createMockRepositories();
      stubRepositories(repos);
      const entryWithTag = { ...sampleEntry, tags: [sampleTag] } as SDBJournalEntry & {
        tags: SDBJournalEntryTag[];
      };
      (repos.entriesRepoInner.getEntryAsync as sinon.SinonStub).resolves([entryWithTag]);
      (repos.entryTagsRepoInner.getLookupsAsync as sinon.SinonStub).resolves([
        { id: 300, journalEntryId: 5, tagId: 11 },
      ]);
      (repos.entryTagsRepoInner.getTagsAsync as sinon.SinonStub).resolves([sampleTag]);
      (repos.entryTagsRepoInner.deleteLookupAsync as sinon.SinonStub).rejects(new Error("boom"));
      const journalService = new JournalService(repos.journalsRepo);

      const req = {
        params: { entryId: "5", tagId: "11" },
        originalUrl: "/api/journals/entries/5/tags/11",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await removeTagAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 503);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.includeMembers(err.details, [
        `Failed to remove tag with ID 11 from Journal Entry with ID 5: boom`,
      ]);
    });
  });
});
