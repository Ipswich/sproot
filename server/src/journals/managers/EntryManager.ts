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

    if (!entries.length) {
      return [];
    }

    const entryTagLookups = await this.#sprootDB.getJournalEntryTagLookupsAsync();
    const allEntryTags = await this.#sprootDB.getJournalEntryTagsAsync();

    const tagById = new Map<number, SDBJournalEntryTag>(
      (allEntryTags as SDBJournalEntryTag[]).map((t) => [t.id, t]),
    );
    const lookupsByEntryId = new Map<number, { journalEntryId: number; tagId: number }[]>();
    for (const l of entryTagLookups as { journalEntryId: number; tagId: number }[]) {
      const arr = lookupsByEntryId.get(l.journalEntryId) ?? [];
      arr.push(l);
      lookupsByEntryId.set(l.journalEntryId, arr);
    }

    const results: Array<{ entry: SDBJournalEntry; tags: SDBJournalEntryTag[] }> = [];
    for (const e of entries) {
      const tags: SDBJournalEntryTag[] = (lookupsByEntryId.get(e.id) ?? [])
        .map((l) => tagById.get(l.tagId))
        .filter(Boolean) as SDBJournalEntryTag[];

      results.push({ entry: e, tags });
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
