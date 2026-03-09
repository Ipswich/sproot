import { SDBJournal } from "@sproot/sproot-common/dist/database/SDBJournal";
import { SDBJournalTag } from "@sproot/sproot-common/dist/database/SDBJournalTag";
import { SDBJournalTagLookup } from "@sproot/sproot-common/dist/database/SDBJournalTagLookup";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

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
    return this.#sprootDB.addJournalAsync(
      name,
      description,
      icon,
      color,
      startDate?.toISOString().slice(0, 19).replace("T", " ") ??
        new Date().toISOString().slice(0, 19).replace("T", " "),
    );
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

  async addTagToJournalAsync(journalId: number, tagId: number): Promise<number> {
    return this.#sprootDB.addJournalTagLookupAsync(journalId, tagId);
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

    const results: Array<{ journal: SDBJournal; tags: SDBJournalTag[] }> = [];
    for (const j of journals as SDBJournal[]) {
      const tags: SDBJournalTag[] = (tagLookups as SDBJournalTagLookup[])
        .filter((l) => l.journalId === j.id)
        .map((l) => (allTags as SDBJournalTag[]).find((t) => t.id === l.tagId))
        .filter(Boolean) as SDBJournalTag[];

      results.push({ journal: j, tags });
    }

    return results;
  }
}
