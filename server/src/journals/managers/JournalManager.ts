import { SDBJournal } from "@sproot/common/database/SDBJournal";
import { SDBJournalTag } from "@sproot/common/database/SDBJournalTag";
import { SDBJournalTagLookup } from "@sproot/common/database/SDBJournalTagLookup";
import { IJournalsRepository } from "@sproot/common/database/journals/IJournalsRepository";
import { toDbDate } from "../../utils/dateUtils";

export default class JournalManager {
  #journalsRepository: IJournalsRepository;
  constructor(journalsRepository: IJournalsRepository) {
    this.#journalsRepository = journalsRepository;
  }

  async createJournalAsync(
    name: string,
    description: string | null = null,
    icon: string | null = null,
    color: string | null = null,
    startDate: Date | null = null,
  ): Promise<number> {
    return this.#journalsRepository.addAsync(name, description, icon, color, toDbDate(startDate));
  }

  async updateJournalAsync(journal: SDBJournal): Promise<void> {
    return this.#journalsRepository.updateAsync(journal);
  }

  async deleteJournalAsync(id: number): Promise<void> {
    return this.#journalsRepository.deleteAsync(id);
  }

  async createJournalTagAsync(name: string, color: string | null = null): Promise<number> {
    return this.#journalsRepository.addJournalTagAsync(name, color);
  }

  async addTagAsync(journalId: number, tagId: number): Promise<number> {
    return this.#journalsRepository.addJournalTagLookupAsync(journalId, tagId);
  }

  async removeTagAsync(journalId: number, tagId: number): Promise<void> {
    return this.#journalsRepository.deleteJournalTagLookupAsync(journalId, tagId);
  }

  async getJournalsAsync(
    journalId?: number,
  ): Promise<Array<{ journal: SDBJournal; tags: SDBJournalTag[] }>> {
    let journals: SDBJournal[] = [];
    if (journalId != null) {
      journals = await this.#journalsRepository.getByIdAsync(journalId);
    } else {
      journals = await this.#journalsRepository.getAllAsync();
    }
    if (!journals || journals.length === 0) return [];

    const [allTags, tagLookups] = await Promise.all([
      this.#journalsRepository.getJournalTagsAsync(),
      this.#journalsRepository.getJournalTagLookupsAsync(),
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
