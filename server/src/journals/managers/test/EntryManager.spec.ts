import { assert } from "chai";
import sinon from "sinon";
import { IEntriesRepository } from "../../../database/repositories/journals/entries/IEntriesRepository";
import EntryManager from "../EntryManager";

describe("EntryManager.ts tests", () => {
  let entriesRepo: IEntriesRepository;
  let entryManager: EntryManager;

  beforeEach(function () {
    entriesRepo = {
      getEntriesAsync: sinon.stub(),
      getEntryAsync: sinon.stub(),
      addEntryAsync: sinon.stub(),
      updateEntryAsync: sinon.stub(),
      deleteEntryAsync: sinon.stub(),
      tags: {
        getTagsAsync: sinon.stub(),
        addTagAsync: sinon.stub(),
        updateTagAsync: sinon.stub(),
        deleteTagAsync: sinon.stub(),
        getLookupsAsync: sinon.stub(),
        addLookupAsync: sinon.stub(),
        deleteLookupAsync: sinon.stub(),
      },
    } as unknown as IEntriesRepository;

    entryManager = new EntryManager(entriesRepo);
  });

  afterEach(function () {
    sinon.restore();
  });

  describe("getAsync", () => {
    it("should map tags for all entries", async () => {
      const entries = [
        { id: 1, journalId: 1, content: "E1" },
        { id: 2, journalId: 1, content: "E2" },
      ];
      const tags = [
        { id: 10, name: "T1", color: null },
        { id: 11, name: "T2", color: "#fff" },
      ];
      const lookups = [
        { journalEntryId: 1, tagId: 10 },
        { journalEntryId: 2, tagId: 11 },
      ];

      (entriesRepo.getEntriesAsync as sinon.SinonStub).resolves(entries);
      (entriesRepo.tags.getTagsAsync as sinon.SinonStub).resolves(tags);
      (entriesRepo.tags.getLookupsAsync as sinon.SinonStub).resolves(lookups);

      const res = await entryManager.getAsync(1);
      assert.strictEqual(res.length, 2);
      const entryResult1 = res[0];
      assert.isDefined(entryResult1);
      assert.strictEqual(entryResult1!.entry.id, 1);
      assert.strictEqual(entryResult1!.entry.content, "E1");

      const entryTags1 = entryResult1!.tags;
      assert.isDefined(entryTags1);
      assert.strictEqual(entryTags1.length, 1);
      assert.strictEqual(entryTags1[0]!.id, 10);
      assert.strictEqual(entryTags1[0]!.name, "T1");

      const entryResult2 = res[1];
      assert.isDefined(entryResult2);

      const entryTags2 = entryResult2!.tags;
      assert.isDefined(entryTags2);
      assert.strictEqual(entryTags2.length, 1);
      assert.strictEqual(entryTags2[0]!.id, 11);
      assert.strictEqual(entryTags2[0]!.name, "T2");
    });

    it("should map tags for single entry", async () => {
      const entries = [{ id: 1, journalId: 1, content: "E1" }];
      const tags = [{ id: 10, name: "T1" }];
      const lookups = [{ journalEntryId: 1, tagId: 10 }];

      (entriesRepo.getEntryAsync as sinon.SinonStub).resolves(entries);
      (entriesRepo.tags.getTagsAsync as sinon.SinonStub).resolves(tags);
      (entriesRepo.tags.getLookupsAsync as sinon.SinonStub).resolves(lookups);

      const res = await entryManager.getAsync(undefined, 1);
      assert.strictEqual(res.length, 1);
      const entryResult = res[0];
      assert.isDefined(entryResult);

      const entryTags = entryResult!.tags;
      assert.isDefined(entryTags);
      assert.strictEqual(entryTags.length, 1);
      assert.strictEqual(entryTags[0]!.id, 10);
      assert.strictEqual(entryTags[0]!.name, "T1");
    });

    it("should return empty array if no entries found", async () => {
      (entriesRepo.getEntriesAsync as sinon.SinonStub).resolves([]);
      const res = await entryManager.getAsync(1);
      assert.isArray(res);
      assert.strictEqual(res.length, 0);
    });

    it("should return empty array if no entry found for id", async () => {
      (entriesRepo.getEntryAsync as sinon.SinonStub).resolves([]);
      const res = await entryManager.getAsync(undefined, 999);
      assert.isArray(res);
      assert.strictEqual(res.length, 0);
    });
  });
});
