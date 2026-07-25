import { SDBJournalEntry } from "@sproot/common/dist/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/common/dist/database/SDBJournalEntryTag";
import { IJournalsRepository } from "@sproot/common/dist/database/ISprootDB";
import { toDbDate } from "../../utils/dateUtils";

export default class EntryManager {
  #journalsRepository: IJournalsRepository;
  constructor(journalsRepository: IJournalsRepository) {
    this.#journalsRepository = journalsRepository;
  }

  async getAsync(
    journalId?: number,
    entryId?: number,
    withContent?: boolean,
  ): Promise<Array<{ entry: SDBJournalEntry; tags: SDBJournalEntryTag[] }>> {
    let entries: SDBJournalEntry[] = [];
    if (journalId != null) {
      entries = await this.#journalsRepository.getJournalEntriesAsync(
        journalId,
        withContent ?? true,
      );
    } else if (entryId != null) {
      entries = await this.#journalsRepository.getJournalEntryAsync(entryId, withContent ?? true);
    } else {
      return [];
    }

    if (!entries.length) {
      return [];
    }

    const entryTagLookups = await this.#journalsRepository.getJournalEntryTagLookupsAsync();
    const allEntryTags = await this.#journalsRepository.getJournalEntryTagsAsync();

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
    return this.#journalsRepository.addJournalEntryAsync(
      journalId,
      name ?? null,
      text,
      createdAt ? toDbDate(createdAt) : null,
    );
  }

  updateAsync(entry: SDBJournalEntry): Promise<void> {
    return this.#journalsRepository.updateJournalEntryAsync(entry);
  }

  deleteAsync(entryId: number) {
    return this.#journalsRepository.deleteJournalEntryAsync(entryId);
  }

  addTagAsync(entryId: number, tagId: number): Promise<number> {
    return this.#journalsRepository.addJournalEntryTagLookupAsync(entryId, tagId);
  }

  removeTagAsync(entryId: number, tagId: number): Promise<void> {
    return this.#journalsRepository.deleteJournalEntryTagLookupAsync(entryId, tagId);
  }
}
