import { SDBJournalEntry } from "@sproot/common/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/common/database/SDBJournalEntryTag";
import { IEntriesRepository } from "@sproot/common/database/journals/entries/IEntriesRepository";
import { toDbDate } from "../../utils/dateUtils";

export default class EntryManager {
  #entriesRepository: IEntriesRepository;
  constructor(entriesRepository: IEntriesRepository) {
    this.#entriesRepository = entriesRepository;
  }

  async getAsync(
    journalId?: number,
    entryId?: number,
    withContent?: boolean,
  ): Promise<Array<{ entry: SDBJournalEntry; tags: SDBJournalEntryTag[] }>> {
    let entries: SDBJournalEntry[] = [];
    if (journalId != null) {
      entries = await this.#entriesRepository.getEntriesAsync(journalId, withContent ?? true);
    } else if (entryId != null) {
      entries = await this.#entriesRepository.getEntryAsync(entryId, withContent ?? true);
    } else {
      return [];
    }

    if (!entries.length) {
      return [];
    }

    const entryTagLookups = await this.#entriesRepository.tags.getLookupsAsync();
    const allEntryTags = await this.#entriesRepository.tags.getTagsAsync();

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
    return this.#entriesRepository.addEntryAsync(
      journalId,
      name ?? null,
      text,
      createdAt ? toDbDate(createdAt) : null,
    );
  }

  updateAsync(entry: SDBJournalEntry): Promise<void> {
    return this.#entriesRepository.updateEntryAsync(entry);
  }

  deleteAsync(entryId: number) {
    return this.#entriesRepository.deleteEntryAsync(entryId);
  }

  addTagAsync(entryId: number, tagId: number): Promise<number> {
    return this.#entriesRepository.tags.addLookupAsync(entryId, tagId);
  }

  removeTagAsync(entryId: number, tagId: number): Promise<void> {
    return this.#entriesRepository.tags.deleteLookupAsync(entryId, tagId);
  }
}
