import { SDBJournal } from "@sproot/sproot-common/dist/database/SDBJournal";
import { SDBJournalTag } from "@sproot/sproot-common/dist/database/SDBJournalTag";
import { SDBJournalTagLookup } from "@sproot/sproot-common/dist/database/SDBJournalTagLookup";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { toDbDate } from "../../utils/dateUtils";

export default class JournalManager {
  #sprootDB: ISprootDB;
  constructor(sprootDB: ISprootDB) {
    this.#sprootDB = sprootDB;
  }

  async createJournalAsync(
    name: string,
    description: string | null = null,
    icon: string | null = null,
    color: string | null = null,
    startDate: Date | null = null,
  ): Promise<number> {
    return this.#sprootDB.addJournalAsync(name, description, icon, color, toDbDate(startDate));
  }

  async updateJournalAsync(journal: SDBJournal): Promise<void> {
    return this.#sprootDB.updateJournalAsync(journal);
  }

  async deleteJournalAsync(id: number): Promise<void> {
    return this.#sprootDB.deleteJournalAsync(id);
  }

  async createJournalTagAsync(name: string, color: string | null = null): Promise<number> {
    return this.#sprootDB.addJournalTagAsync(name, color);
  }

  async addTagAsync(journalId: number, tagId: number): Promise<number> {
    return this.#sprootDB.addJournalTagLookupAsync(journalId, tagId);
  }

  async removeTagAsync(journalId: number, tagId: number): Promise<void> {
    return this.#sprootDB.deleteJournalTagLookupAsync(journalId, tagId);
  }

  async getJournalsAsync(
    journalId?: number,
  ): Promise<Array<{ journal: SDBJournal; tags: SDBJournalTag[] }>> {
    let journals: SDBJournal[] = [];
    if (journalId != null) {
      journals = await this.#sprootDB.getJournalAsync(journalId);
    } else {
      journals = await this.#sprootDB.getJournalsAsync();
    }
    if (!journals || journals.length === 0) return [];

    const [allTags, tagLookups] = await Promise.all([
      this.#sprootDB.getJournalTagsAsync(),
      this.#sprootDB.getJournalTagLookupsAsync(),
    ]);

    const tagById = new Map<number, SDBJournalTag>(
      (allTags as SDBJournalTag[]).map((t) => [t.id, t]),
    );
    const lookupsByJournalId = new Map<number, SDBJournalTagLookup[]>();
    for (const l of tagLookups as SDBJournalTagLookup[]) {
      const arr = lookupsByJournalId.get(l.journalId) ?? [];
      arr.push(l);
      lookupsByJournalId.set(l.journalId, arr);
    }

    const results: Array<{ journal: SDBJournal; tags: SDBJournalTag[] }> = [];
    for (const j of journals as SDBJournal[]) {
      const tags: SDBJournalTag[] = (lookupsByJournalId.get(j.id) ?? [])
        .map((l) => tagById.get(l.tagId))
        .filter(Boolean) as SDBJournalTag[];

      results.push({ journal: j, tags });
    }

    return results;
  }
}
