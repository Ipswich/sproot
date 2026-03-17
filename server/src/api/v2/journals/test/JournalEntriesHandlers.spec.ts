import { assert } from "chai";
import sinon from "sinon";
import { Request, Response } from "express";
import { SuccessResponse, ErrorResponse } from "@sproot/sproot-common/dist/api/v2/Responses";
import { MockSprootDB, ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBJournalEntry } from "@sproot/sproot-common/dist/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalAsync.resolves([]);
      sprootDB.getJournalTagsAsync.resolves([]);
      sprootDB.getJournalTagLookupsAsync.resolves([]);
      const journalService = new JournalService(sprootDB as ISprootDB);

      const req = {
        params: { journalId: "not-a-number" },
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalAsync.resolves([]);
      sprootDB.getJournalTagsAsync.resolves([]);
      sprootDB.getJournalTagLookupsAsync.resolves([]);
      const journalService = new JournalService(sprootDB as ISprootDB);

      const req = {
        params: { journalId: "2" },
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalAsync.resolves([
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
      sprootDB.getJournalTagsAsync.resolves([]);
      sprootDB.getJournalTagLookupsAsync.resolves([]);
      sprootDB.getJournalEntriesAsync.resolves([sampleEntry]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([{ id: 100, journalEntryId: 5, tagId: 11 }]);
      sprootDB.getJournalEntryTagsAsync.resolves([sampleTag]);

      const journalService = new JournalService(sprootDB as ISprootDB);

      const req = {
        params: { journalId: "2" },
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalAsync.rejects(new Error("boom"));
      const journalService = new JournalService(sprootDB as ISprootDB);

      const req = {
        params: { journalId: "2" },
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
  });

  describe("getByEntryIdAsync", () => {
    it("should return 400 when entryId param invalid", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const journalService = new JournalService(sprootDB as ISprootDB);

      const req = {
        params: { entryId: "bad" },
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryAsync.resolves([]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([]);
      sprootDB.getJournalEntryTagsAsync.resolves([]);
      const journalService = new JournalService(sprootDB as ISprootDB);

      const req = {
        params: { entryId: "5" },
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryAsync.resolves([sampleEntry]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([{ id: 101, journalEntryId: 5, tagId: 11 }]);
      sprootDB.getJournalEntryTagsAsync.resolves([sampleTag]);
      const journalService = new JournalService(sprootDB as ISprootDB);

      const req = {
        params: { entryId: "5" },
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

    it("should return 503 when DB throws", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryAsync.rejects(new Error("boom"));
      const journalService = new JournalService(sprootDB as ISprootDB);

      const req = {
        params: { entryId: "5" },
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalAsync.resolves([]);
      sprootDB.getJournalTagsAsync.resolves([]);
      sprootDB.getJournalTagLookupsAsync.resolves([]);
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalAsync.resolves([]);
      sprootDB.getJournalTagsAsync.resolves([]);
      sprootDB.getJournalTagLookupsAsync.resolves([]);
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalAsync.resolves([
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
      sprootDB.getJournalTagsAsync.resolves([]);
      sprootDB.getJournalTagLookupsAsync.resolves([]);
      sprootDB.getJournalTagsAsync.resolves([]);
      sprootDB.getJournalTagLookupsAsync.resolves([]);
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalAsync.resolves([
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
      sprootDB.getJournalTagsAsync.resolves([]);
      sprootDB.getJournalTagLookupsAsync.resolves([]);
      sprootDB.addJournalEntryAsync.resolves(7);
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalAsync.resolves([
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
      sprootDB.getJournalTagsAsync.resolves([]);
      sprootDB.getJournalTagLookupsAsync.resolves([]);
      sprootDB.addJournalEntryAsync.rejects(new Error("boom"));
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      assert.include(err.details[0], "Failed to create Journal: boom");
    });
  });

  describe("updateAsync", () => {
    it("should return 400 when entryId invalid", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const journalService = new JournalService(sprootDB as ISprootDB);

      const req = {
        params: { entryId: "x" },
        body: { text: "ok" },
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

    it("should return 400 when text is explicitly null", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const journalService = new JournalService(sprootDB as ISprootDB);

      const req = {
        params: { entryId: "5" },
        body: { text: null },
        originalUrl: "/api/journals/entries/5",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await updateAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, ["Journal Entry text cannot be null."]);
    });

    it("should return 404 when entry not found", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryAsync.resolves([]);
      const journalService = new JournalService(sprootDB as ISprootDB);

      const req = {
        params: { entryId: "5" },
        body: { text: "ok" },
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const existing = { ...sampleEntry };
      sprootDB.getJournalEntryAsync.resolves([existing]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([]);
      sprootDB.getJournalEntryTagsAsync.resolves([]);
      sprootDB.updateJournalEntryAsync.resolves();
      const journalService = new JournalService(sprootDB as ISprootDB);

      const req = {
        params: { entryId: "5" },
        body: { text: "new text" },
        originalUrl: "/api/journals/entries/5",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await updateAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
    });

    it("should return 503 when update throws", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryAsync.resolves([sampleEntry]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([]);
      sprootDB.getJournalEntryTagsAsync.resolves([]);
      sprootDB.updateJournalEntryAsync.rejects(new Error("boom"));
      const journalService = new JournalService(sprootDB as ISprootDB);

      const req = {
        params: { entryId: "5" },
        body: { text: "new text" },
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryAsync.resolves([]);
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryAsync.resolves([sampleEntry]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([]);
      sprootDB.getJournalEntryTagsAsync.resolves([]);
      sprootDB.deleteJournalEntryAsync.resolves();
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryAsync.resolves([sampleEntry]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([]);
      sprootDB.getJournalEntryTagsAsync.resolves([]);
      sprootDB.deleteJournalEntryAsync.rejects(new Error("boom"));
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryAsync.resolves([]);
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const entryWithTag = { ...sampleEntry, tags: [sampleTag] } as SDBJournalEntry & {
        tags: SDBJournalEntryTag[];
      };
      sprootDB.getJournalEntryAsync.resolves([entryWithTag]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([{ id: 200, journalEntryId: 5, tagId: 11 }]);
      sprootDB.getJournalEntryTagsAsync.resolves([sampleTag]);
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const entryNoTags = { ...sampleEntry, tags: [] } as SDBJournalEntry & {
        tags: SDBJournalEntryTag[];
      };
      sprootDB.getJournalEntryAsync.resolves([entryNoTags]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([]);
      sprootDB.getJournalEntryTagsAsync.resolves([]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([]);
      sprootDB.getJournalEntryTagsAsync.resolves([]);
      sprootDB.getJournalTagsAsync.resolves([]);
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      assert.includeMembers(err.details, [`Journal Tag with ID 11 not found.`]);
    });

    it("should return 200 when tag added successfully", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const entryNoTags = { ...sampleEntry, tags: [] } as SDBJournalEntry & {
        tags: SDBJournalEntryTag[];
      };
      sprootDB.getJournalEntryAsync.resolves([entryNoTags]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([]);
      sprootDB.getJournalEntryTagsAsync.resolves([]);
      sprootDB.getJournalTagsAsync.resolves([{ id: 11, name: "t", color: null }]);
      sprootDB.addJournalEntryTagLookupAsync.resolves(77);
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const entryNoTags = { ...sampleEntry, tags: [] } as SDBJournalEntry & {
        tags: SDBJournalEntryTag[];
      };
      sprootDB.getJournalEntryAsync.resolves([entryNoTags]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([]);
      sprootDB.getJournalEntryTagsAsync.resolves([]);
      sprootDB.getJournalTagsAsync.resolves([{ id: 11, name: "t", color: null }]);
      sprootDB.addJournalEntryTagLookupAsync.rejects(new Error("boom"));
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getJournalEntryAsync.resolves([]);
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const entryNoTags = { ...sampleEntry, tags: [] } as SDBJournalEntry & {
        tags: SDBJournalEntryTag[];
      };
      sprootDB.getJournalEntryAsync.resolves([entryNoTags]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([]);
      sprootDB.getJournalEntryTagsAsync.resolves([]);
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const entryWithTag = { ...sampleEntry, tags: [sampleTag] } as SDBJournalEntry & {
        tags: SDBJournalEntryTag[];
      };
      sprootDB.getJournalEntryAsync.resolves([entryWithTag]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([{ id: 300, journalEntryId: 5, tagId: 11 }]);
      sprootDB.getJournalEntryTagsAsync.resolves([sampleTag]);
      sprootDB.deleteJournalEntryTagLookupAsync.resolves();
      const journalService = new JournalService(sprootDB as ISprootDB);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const entryWithTag = { ...sampleEntry, tags: [sampleTag] } as SDBJournalEntry & {
        tags: SDBJournalEntryTag[];
      };
      sprootDB.getJournalEntryAsync.resolves([entryWithTag]);
      sprootDB.getJournalEntryTagLookupsAsync.resolves([{ id: 300, journalEntryId: 5, tagId: 11 }]);
      sprootDB.getJournalEntryTagsAsync.resolves([sampleTag]);
      sprootDB.deleteJournalEntryTagLookupAsync.rejects(new Error("boom"));
      const journalService = new JournalService(sprootDB as ISprootDB);

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
