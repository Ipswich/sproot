import { assert } from "chai";
import sinon from "sinon";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBJournalEntry } from "@sproot/sproot-common/dist/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";
import { SDBJournalEntryTagLookup } from "@sproot/sproot-common/dist/database/SDBJournalEntryTagLookup";
import EntryManager from "../EntryManager";

describe("EntryManager.ts tests", () => {
  let sprootDB: Partial<ISprootDB>;
  let entryManager: EntryManager;

  beforeEach(() => {
    sprootDB = {
      getJournalEntryAsync: sinon.stub(),
      getJournalEntriesAsync: sinon.stub(),
      getJournalEntryTagLookupsAsync: sinon.stub(),
      getJournalEntryTagsAsync: sinon.stub(),
      getJournalEntryDeviceDataAsync: sinon.stub(),
    };

    entryManager = new EntryManager(sprootDB as ISprootDB);
  });

  afterEach(() => sinon.restore());

  describe("getEntriesAsync", () => {
    it("should map tags onto all entries", async () => {
      const entries: SDBJournalEntry[] = [
        {
          id: 1,
          journalId: 10,
          name: null,
          text: "entry",
          createDate: "2020-01-01",
          editedDate: null,
        },
        {
          id: 2,
          journalId: 10,
          name: null,
          text: "entry2",
          createDate: "2020-01-01",
          editedDate: null,
        },
      ];
      const lookups: SDBJournalEntryTagLookup[] = [
        { id: 1, journalEntryId: 1, tagId: 5 },
        { id: 2, journalEntryId: 2, tagId: 5 },
        { id: 3, journalEntryId: 2, tagId: 6 },
      ];
      const tags: SDBJournalEntryTag[] = [
        { id: 5, name: "tag", color: null },
        { id: 6, name: "tag2", color: "#fff" },
      ];

      (sprootDB.getJournalEntriesAsync as sinon.SinonStub).resolves(entries);
      (sprootDB.getJournalEntryTagLookupsAsync as sinon.SinonStub).resolves(lookups);
      (sprootDB.getJournalEntryTagsAsync as sinon.SinonStub).resolves(tags);

      const res = await entryManager.getEntriesAsync(10);
      assert.strictEqual(res.length, 2);
      const entryResult1 = res[0];
      assert.isDefined(entryResult1);
      assert.strictEqual(entryResult1!.id, 1);
      assert.strictEqual(entryResult1!.text, "entry");
      const entryTags1 = entryResult1!.tags;
      assert.isDefined(entryTags1);
      assert.strictEqual(entryTags1.length, 1);
      assert.strictEqual(entryTags1[0]!.id, 5);
      assert.strictEqual(entryTags1[0]!.name, "tag");
      assert.strictEqual(entryTags1[0]!.color, null);

      const entryResult2 = res[1];
      assert.isDefined(entryResult2);
      assert.strictEqual(entryResult2!.id, 2);
      assert.strictEqual(entryResult2!.text, "entry2");
      const entryTags2 = entryResult2!.tags;
      assert.isDefined(entryTags2);
      assert.strictEqual(entryTags2.length, 2);
      assert.strictEqual(entryTags2[0]!.id, 5);
      assert.strictEqual(entryTags2[0]!.name, "tag");
      assert.strictEqual(entryTags2[1]!.id, 6);
      assert.strictEqual(entryTags2[1]!.name, "tag2");
      assert.strictEqual(entryTags2[1]!.color, "#fff");
    });

    it("should map tags for single entry", async () => {
      const entries: SDBJournalEntry[] = [
        {
          id: 1,
          journalId: 10,
          name: null,
          text: "entry",
          createDate: "2020-01-01",
          editedDate: null,
        },
      ];
      const lookups: SDBJournalEntryTagLookup[] = [{ id: 1, journalEntryId: 1, tagId: 5 }];
      const tags: SDBJournalEntryTag[] = [{ id: 5, name: "tag", color: null }];

      (sprootDB.getJournalEntryAsync as sinon.SinonStub).resolves(entries);
      (sprootDB.getJournalEntryTagLookupsAsync as sinon.SinonStub).resolves(lookups);
      (sprootDB.getJournalEntryTagsAsync as sinon.SinonStub).resolves(tags);

      const res = await entryManager.getEntriesAsync(10, 1);
      assert.strictEqual(res.length, 1);
      const entryResult = res[0];
      assert.isDefined(entryResult);
      assert.strictEqual(entryResult!.id, 1);
      assert.strictEqual(entryResult!.text, "entry");
      const entryTags = entryResult!.tags;
      assert.isDefined(entryTags);
      assert.strictEqual(entryTags.length, 1);
      assert.strictEqual(entryTags[0]!.id, 5);
      assert.strictEqual(entryTags[0]!.name, "tag");
    });

    it("should return empty array if no entries found", async () => {
      (sprootDB.getJournalEntriesAsync as sinon.SinonStub).resolves([]);
      const res = await entryManager.getEntriesAsync(10);
      assert.isArray(res);
      assert.strictEqual(res.length, 0);
    });

    it("should return empty array if no entry found for id", async () => {
      (sprootDB.getJournalEntryAsync as sinon.SinonStub).resolves([]);
      const res = await entryManager.getEntriesAsync(10, 999);
      assert.isArray(res);
      assert.strictEqual(res.length, 0);
    });
  });
});
