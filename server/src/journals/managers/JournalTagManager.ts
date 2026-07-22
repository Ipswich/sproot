import { SDBJournalTag } from "@sproot/sproot-common/dist/database/SDBJournalTag";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

export default class JournalTagManager {
  #sprootDB: ISprootDB;
  constructor(sprootDB: ISprootDB) {
    this.#sprootDB = sprootDB;
  }

  getTagsAsync(): Promise<SDBJournalTag[]> {
    return this.#sprootDB.journals.getJournalTagsAsync();
  }

  createTagAsync(name: string, color: string | null = null): Promise<number> {
    return this.#sprootDB.journals.addJournalTagAsync(name, color);
  }

  updateTagAsync(tag: SDBJournalTag): Promise<void> {
    return this.#sprootDB.journals.updateJournalTagAsync(tag);
  }

  deleteTagAsync(tagId: number): Promise<void> {
    return this.#sprootDB.journals.deleteJournalTagAsync(tagId);
  }
}
