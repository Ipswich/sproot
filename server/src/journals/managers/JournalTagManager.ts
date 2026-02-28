import { SDBJournalTag } from "@sproot/sproot-common/dist/database/SDBJournalTag";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

export default class JournalTagManager {
  #sprootDB: ISprootDB;
  constructor(sprootDB: ISprootDB) {
    this.#sprootDB = sprootDB;
  }

  getTags(): Promise<SDBJournalTag[]> {
    return this.#sprootDB.getJournalTagsAsync();
  }

  createTag(name: string, color: string | null = null): Promise<number> {
    return this.#sprootDB.addJournalTagAsync(name, color);
  }

  updateTag(tag: SDBJournalTag): Promise<void> {
    return this.#sprootDB.updateJournalTagAsync(tag);
  }

  deleteTag(tagId: number): Promise<void> {
    return this.#sprootDB.deleteJournalTagAsync(tagId);
  }
}
