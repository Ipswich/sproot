import { SDBJournal } from "@sproot/common/database/SDBJournal";
import { SDBJournalTag } from "@sproot/common/database/SDBJournalTag";
import { IJournalRepository } from "@sproot/common/database/journals/IJournalRepository";
import { toDbDate } from "../../utils/dateUtils";

export default class JournalManager {
  #journalsRepository: IJournalRepository;
  constructor(journalsRepository: IJournalRepository) {
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

  async addTagAsync(journalId: number, tagId: number): Promise<number> {
    return this.#journalsRepository.tags.addLookupAsync(journalId, tagId);
  }

  async removeTagAsync(journalId: number, tagId: number): Promise<void> {
    return this.#journalsRepository.tags.deleteLookupAsync(journalId, tagId);
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

    if (!journals.length) {
      return [];
    }

    const [allJournalTags, journalTagLookups] = await Promise.all([
      this.#journalsRepository.tags.getTagsAsync(),
      this.#journalsRepository.tags.getLookupsAsync(),
    ]);

    const tagById = new Map<number, SDBJournalTag>(
      (allJournalTags as SDBJournalTag[]).map((t) => [t.id, t]),
    );
    const lookupsByJournalId = new Map<number, { journalId: number; tagId: number }[]>();
    for (const l of journalTagLookups as { journalId: number; tagId: number }[]) {
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
