import { assert } from "chai";
import sinon from "sinon";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBJournalTag } from "@sproot/sproot-common/dist/database/SDBJournalTag";
import JournalTagManager from "../JournalTagManager";

describe("JournalTagManager.ts tests", () => {
  let sprootDB: Partial<ISprootDB>;
  let mgr: JournalTagManager;

  beforeEach(() => {
    sprootDB = {
      getJournalTagsAsync: sinon.stub(),
      addJournalTagAsync: sinon.stub(),
      updateJournalTagAsync: sinon.stub(),
      deleteJournalTagAsync: sinon.stub(),
    };

    mgr = new JournalTagManager(sprootDB as ISprootDB);
  });

  afterEach(() => sinon.restore());

  it("getTags delegates to DB and returns tags", async () => {
    const dbTags: SDBJournalTag[] = [{ id: 1, name: "tag", color: "#fff" } as SDBJournalTag];
    (sprootDB.getJournalTagsAsync as sinon.SinonStub).resolves(dbTags);

    const res = await mgr.getTags();
    assert.strictEqual(res, dbTags);
  });

  it("createTag calls DB and returns id", async () => {
    (sprootDB.addJournalTagAsync as sinon.SinonStub).resolves(5);
    const id = await mgr.createTag("new", "#000");
    assert.strictEqual(id, 5);
    sinon.assert.calledWith(sprootDB.addJournalTagAsync as sinon.SinonStub, "new", "#000");
  });

  it("updateTag calls DB with SDBJournalTag", async () => {
    const tag: SDBJournalTag = { id: 2, name: "t2", color: null } as SDBJournalTag;
    (sprootDB.updateJournalTagAsync as sinon.SinonStub).resolves();

    await mgr.updateTag(tag);
    sinon.assert.calledWith(sprootDB.updateJournalTagAsync as sinon.SinonStub, tag);
  });

  it("deleteTag calls DB with id", async () => {
    (sprootDB.deleteJournalTagAsync as sinon.SinonStub).resolves();

    await mgr.deleteTag(3);
    sinon.assert.calledWith(sprootDB.deleteJournalTagAsync as sinon.SinonStub, 3);
  });
});
