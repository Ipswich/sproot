import { SDBJournalEntry } from "@sproot/sproot-common/dist/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { toDbDate } from "../../utils/dateUtils";

export default class EntryManager {
  #sprootDB: ISprootDB;
  constructor(sprootDB: ISprootDB) {
    this.#sprootDB = sprootDB;
  }

  async getAsync(
    journalId?: number,
    entryId?: number,
    withContent?: boolean,
  ): Promise<Array<{ entry: SDBJournalEntry; tags: SDBJournalEntryTag[] }>> {
    let entries: SDBJournalEntry[] = [];
    if (journalId != null) {
      entries = await this.#sprootDB.getJournalEntriesAsync(journalId, withContent ?? true);
    } else if (entryId != null) {
      entries = await this.#sprootDB.getJournalEntryAsync(entryId, withContent ?? true);
    } else {
      return [];
    }

    const entryTagLookups = await this.#sprootDB.getJournalEntryTagLookupsAsync();
    const allEntryTags = await this.#sprootDB.getJournalEntryTagsAsync();

    const results: Array<{ entry: SDBJournalEntry; tags: SDBJournalEntryTag[] }> = [];
    for (const e of entries) {
      const entryTags = entryTagLookups
        .filter((l) => l.journalEntryId === e.id)
        .map((l) => allEntryTags.find((t) => t.id === l.tagId))
        .filter(Boolean) as SDBJournalEntryTag[];

      results.push({
        entry: e,
        tags: entryTags,
      });
    }

    return results;
  }

  createAsync(
    journalId: number,
    text: string,
    name?: string | null,
    createdAt?: Date | null,
  ): Promise<number> {
    return this.#sprootDB.addJournalEntryAsync(
      journalId,
      name ?? null,
      text,
      createdAt ? toDbDate(createdAt) : null,
    );
  }

  updateAsync(entry: SDBJournalEntry): Promise<void> {
    return this.#sprootDB.updateJournalEntryAsync(entry);
  }

  deleteAsync(entryId: number) {
    return this.#sprootDB.deleteJournalEntryAsync(entryId);
  }

  addTagAsync(entryId: number, tagId: number): Promise<number> {
    return this.#sprootDB.addJournalEntryTagLookupAsync(entryId, tagId);
  }

  removeTagAsync(entryId: number, tagId: number): Promise<void> {
    return this.#sprootDB.deleteJournalEntryTagLookupAsync(entryId, tagId);
  }
}
