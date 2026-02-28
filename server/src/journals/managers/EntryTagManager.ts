import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

export default class EntryTagManager {
  #sprootDB: ISprootDB;
  constructor(sprootDB: ISprootDB) {
    this.#sprootDB = sprootDB;
  }

  getTags(): Promise<SDBJournalEntryTag[]> {
    return this.#sprootDB.getJournalEntryTagsAsync();
  }

  createTag(name: string, color: string | null = null): Promise<number> {
    return this.#sprootDB.addJournalEntryTagAsync(name, color);
  }

  updateTag(tag: SDBJournalEntryTag): Promise<void> {
    return this.#sprootDB.updateJournalEntryTagAsync(tag);
  }

  deleteTag(id: number): Promise<void> {
    return this.#sprootDB.deleteJournalEntryTagAsync(id);
  }
}
