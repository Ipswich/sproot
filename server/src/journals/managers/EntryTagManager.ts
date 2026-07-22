import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

export default class EntryTagManager {
  #sprootDB: ISprootDB;
  constructor(sprootDB: ISprootDB) {
    this.#sprootDB = sprootDB;
  }

  getTagsAsync(): Promise<SDBJournalEntryTag[]> {
    return this.#sprootDB.journals.getJournalEntryTagsAsync();
  }

  createTagAsync(name: string, color: string | null = null): Promise<number> {
    return this.#sprootDB.journals.addJournalEntryTagAsync(name, color);
  }

  updateTagAsync(tag: SDBJournalEntryTag): Promise<void> {
    return this.#sprootDB.journals.updateJournalEntryTagAsync(tag);
  }

  deleteTagAsync(id: number): Promise<void> {
    return this.#sprootDB.journals.deleteJournalEntryTagAsync(id);
  }
}
