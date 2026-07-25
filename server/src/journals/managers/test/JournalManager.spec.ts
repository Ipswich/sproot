import { assert } from "chai";
import sinon from "sinon";
import { IJournalsRepository } from "@sproot/common/dist/database/ISprootDB";
import JournalManager from "../JournalManager";

describe("JournalManager.ts tests", () => {
  let journalsRepo: IJournalsRepository;
  let journalManager: JournalManager;

  beforeEach(function () {
    journalsRepo = {
      getAllAsync: sinon.stub(),
      getByIdAsync: sinon.stub(),
      getJournalTagsAsync: sinon.stub(),
      getJournalTagLookupsAsync: sinon.stub(),
    } as unknown as IJournalsRepository;

    journalManager = new JournalManager(journalsRepo);
  });

  afterEach(function () {
    sinon.restore();
  });
  describe("getAllAsync", () => {
    it("should map tags for all journals", async () => {
      const journals = [
        { id: 1, title: "J1" },
        { id: 2, title: "J2" },
      ];
      const tags = [
        { id: 10, name: "T1", color: null },
        { id: 11, name: "T2", color: "#fff" },
        { id: 12, name: "T3", color: null },
      ];
      const lookups = [
        { journalId: 1, tagId: 10 },
        { journalId: 2, tagId: 11 },
        { journalId: 2, tagId: 12 },
      ];

      (journalsRepo.getAllAsync as sinon.SinonStub).resolves(journals);
      (journalsRepo.getJournalTagsAsync as sinon.SinonStub).resolves(tags);
      (journalsRepo.getJournalTagLookupsAsync as sinon.SinonStub).resolves(lookups);

      const res = await journalManager.getJournalsAsync();
      assert.strictEqual(res.length, 2);
      const journalResult1 = res[0];
      assert.isDefined(journalResult1);
      assert.strictEqual(journalResult1!.journal.id, 1);
      assert.strictEqual(journalResult1!.journal.title, "J1");

      const journalTags1 = journalResult1!.tags;
      assert.isDefined(journalTags1);
      assert.strictEqual(journalTags1.length, 1);
      assert.strictEqual(journalTags1[0]!.id, 10);
      assert.strictEqual(journalTags1[0]!.name, "T1");
      assert.strictEqual(journalTags1[0]!.color, null);

      const journalResult2 = res[1];
      assert.isDefined(journalResult2);

      const journalTags2 = journalResult2!.tags;
      assert.isDefined(journalTags2);
      assert.strictEqual(journalTags2.length, 2);
      assert.strictEqual(journalTags2[0]!.id, 11);
      assert.strictEqual(journalTags2[0]!.name, "T2");
      assert.strictEqual(journalTags2[0]!.color, "#fff");
      assert.strictEqual(journalTags2[1]!.id, 12);
      assert.strictEqual(journalTags2[1]!.name, "T3");
      assert.strictEqual(journalTags2[1]!.color, null);
    });

    it("should map tags for single journal", async () => {
      const journals = [{ id: 1, title: "J1" }];
      const tags = [{ id: 10, name: "T1" }];
      const lookups = [{ journalId: 1, tagId: 10 }];

      (journalsRepo.getByIdAsync as sinon.SinonStub).resolves(journals);
      (journalsRepo.getJournalTagsAsync as sinon.SinonStub).resolves(tags);
      (journalsRepo.getJournalTagLookupsAsync as sinon.SinonStub).resolves(lookups);

      const res = await journalManager.getJournalsAsync(1);
      assert.strictEqual(res.length, 1);
      const journalResult = res[0];
      assert.isDefined(journalResult);

      const journalTags = journalResult!.tags;
      assert.isDefined(journalTags);
      assert.strictEqual(journalTags.length, 1);
      assert.strictEqual(journalTags[0]!.id, 10);
      assert.strictEqual(journalTags[0]!.name, "T1");
    });

    it("should return empty array if no journals found", async () => {
      (journalsRepo.getAllAsync as sinon.SinonStub).resolves([]);
      const res = await journalManager.getJournalsAsync();
      assert.isArray(res);
      assert.strictEqual(res.length, 0);
    });

    it("should return empty array if no journal found for id", async () => {
      (journalsRepo.getByIdAsync as sinon.SinonStub).resolves([]);
      const res = await journalManager.getJournalsAsync(999);
      assert.isArray(res);
      assert.strictEqual(res.length, 0);
    });
  });
});
