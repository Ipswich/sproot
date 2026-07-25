import { SDBJournalEntryTag } from "@sproot/common/dist/database/SDBJournalEntryTag";
import { IJournalsRepository } from "@sproot/common/dist/database/ISprootDB";

export default class EntryTagManager {
  #journalsRepository: IJournalsRepository;
  constructor(journalsRepository: IJournalsRepository) {
    this.#journalsRepository = journalsRepository;
  }

  getTagsAsync(): Promise<SDBJournalEntryTag[]> {
    return this.#journalsRepository.getJournalEntryTagsAsync();
  }

  createTagAsync(name: string, color: string | null = null): Promise<number> {
    return this.#journalsRepository.addJournalEntryTagAsync(name, color);
  }

  updateTagAsync(tag: SDBJournalEntryTag): Promise<void> {
    return this.#journalsRepository.updateJournalEntryTagAsync(tag);
  }

  deleteTagAsync(id: number): Promise<void> {
    return this.#journalsRepository.deleteJournalEntryTagAsync(id);
  }
}
