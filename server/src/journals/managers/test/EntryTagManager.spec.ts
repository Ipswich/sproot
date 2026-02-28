import { assert } from "chai";
import sinon from "sinon";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";
import EntryTagManager from "../EntryTagManager";

describe("EntryTagManager.ts tests", () => {
  let sprootDB: Partial<ISprootDB>;
  let mgr: EntryTagManager;

  beforeEach(() => {
    sprootDB = {
      getJournalEntryTagsAsync: sinon.stub(),
      addJournalEntryTagAsync: sinon.stub(),
      updateJournalEntryTagAsync: sinon.stub(),
      deleteJournalEntryTagAsync: sinon.stub(),
    };

    mgr = new EntryTagManager(sprootDB as ISprootDB);
  });

  afterEach(() => sinon.restore());

  it("getTags delegates to DB and returns tags", async () => {
    const dbTags: SDBJournalEntryTag[] = [{ id: 1, name: "t", color: null } as SDBJournalEntryTag];
    (sprootDB.getJournalEntryTagsAsync as sinon.SinonStub).resolves(dbTags);

    const res = await mgr.getTags();
    assert.strictEqual(res, dbTags);
  });

  it("createTag calls DB and returns id", async () => {
    (sprootDB.addJournalEntryTagAsync as sinon.SinonStub).resolves(11);
    const id = await mgr.createTag("n", null);
    assert.strictEqual(id, 11);
    sinon.assert.calledWith(sprootDB.addJournalEntryTagAsync as sinon.SinonStub, "n", null);
  });

  it("updateTag and deleteTag call DB", async () => {
    const tag: SDBJournalEntryTag = { id: 2, name: "y", color: "#fff" } as SDBJournalEntryTag;
    (sprootDB.updateJournalEntryTagAsync as sinon.SinonStub).resolves();
    (sprootDB.deleteJournalEntryTagAsync as sinon.SinonStub).resolves();

    await mgr.updateTag(tag);
    sinon.assert.calledWith(sprootDB.updateJournalEntryTagAsync as sinon.SinonStub, tag);

    await mgr.deleteTag(4);
    sinon.assert.calledWith(sprootDB.deleteJournalEntryTagAsync as sinon.SinonStub, 4);
  });
});
