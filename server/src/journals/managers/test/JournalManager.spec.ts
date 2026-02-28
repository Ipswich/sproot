import { assert } from "chai";
import sinon from "sinon";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBJournal } from "@sproot/sproot-common/dist/database/SDBJournal";
import { SDBJournalTag } from "@sproot/sproot-common/dist/database/SDBJournalTag";
import { SDBJournalTagLookup } from "@sproot/sproot-common/dist/database/SDBJournalTagLookup";
import JournalManager from "../JournalManager";

describe("JournalManager.ts tests", () => {
  let sprootDB: Partial<ISprootDB>;
  let manager: JournalManager;

  beforeEach(() => {
    sprootDB = {
      addJournalAsync: sinon.stub(),
      updateJournalAsync: sinon.stub(),
      deleteJournalAsync: sinon.stub(),
      addJournalTagAsync: sinon.stub(),
      addJournalTagLookupAsync: sinon.stub(),
      getJournalsAsync: sinon.stub(),
      getJournalAsync: sinon.stub(),
      getJournalTagsAsync: sinon.stub(),
      getJournalTagLookupsAsync: sinon.stub(),
    };

    manager = new JournalManager(sprootDB as ISprootDB);
  });

  afterEach(() => sinon.restore());

  it("createJournal calls DB and returns id", async () => {
    (sprootDB.addJournalAsync as sinon.SinonStub).resolves(42);

    const id = await manager.createJournal("name", "desc", "icon", "color", "start");

    assert.strictEqual(id, 42);
    sinon.assert.calledWith(
      sprootDB.addJournalAsync as sinon.SinonStub,
      "name",
      "desc",
      "icon",
      "color",
      "start",
    );
  });

  it("updateJournal calls DB", async () => {
    const journal = { id: 1, name: "x" } as SDBJournal;
    (sprootDB.updateJournalAsync as sinon.SinonStub).resolves();

    await manager.updateJournal(journal);

    sinon.assert.calledWith(sprootDB.updateJournalAsync as sinon.SinonStub, journal);
  });

  it("deleteJournal calls DB", async () => {
    (sprootDB.deleteJournalAsync as sinon.SinonStub).resolves();

    await manager.deleteJournal(5);

    sinon.assert.calledWith(sprootDB.deleteJournalAsync as sinon.SinonStub, 5);
  });

  it("createJournalTag calls DB and returns id", async () => {
    (sprootDB.addJournalTagAsync as sinon.SinonStub).resolves(7);

    const id = await manager.createJournalTag("t", "#fff");

    assert.strictEqual(id, 7);
    sinon.assert.calledWith(sprootDB.addJournalTagAsync as sinon.SinonStub, "t", "#fff");
  });

  it("addTagToJournal calls DB and returns id", async () => {
    (sprootDB.addJournalTagLookupAsync as sinon.SinonStub).resolves(9);

    const id = await manager.addTagToJournal(2, 3);

    assert.strictEqual(id, 9);
    sinon.assert.calledWith(sprootDB.addJournalTagLookupAsync as sinon.SinonStub, 2, 3);
  });

  it("getJournals maps tags for list and single id", async () => {
    const journals = [{ id: 1, name: "J1" }];
    const dbTags = [{ id: 10, name: "T1" }];
    const lookups = [{ journalId: 1, tagId: 10 }];

    (sprootDB.getJournalsAsync as sinon.SinonStub).resolves(journals as SDBJournal[]);
    (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves(dbTags as SDBJournalTag[]);
    (sprootDB.getJournalTagLookupsAsync as sinon.SinonStub).resolves(
      lookups as SDBJournalTagLookup[],
    );

    const res = await manager.getJournals();
    assert.strictEqual(res.length, 1);
    const first = res[0];
    assert.isDefined(first);
    const entryTags = first!.tags as SDBJournalTag[];
    assert.isDefined(entryTags);
    assert.strictEqual(entryTags.length, 1);
    assert.strictEqual(entryTags[0]!.id, 10);

    (sprootDB.getJournalAsync as sinon.SinonStub).resolves(journals as SDBJournal[]);
    const res2 = await manager.getJournals(1);
    assert.strictEqual(res2.length, 1);
    const first2 = res2[0];
    assert.isDefined(first2);
    assert.isDefined(first2!.journal);
    assert.strictEqual((first2!.journal as SDBJournal).id, 1);
  });
});
