import { SDBJournalTag } from "@sproot/common/database/SDBJournalTag";
import { IJournalsRepository } from "@sproot/common/database/journals/IJournalsRepository";

export default class JournalTagManager {
  #journalsRepository: IJournalsRepository;
  constructor(journalsRepository: IJournalsRepository) {
    this.#journalsRepository = journalsRepository;
  }

  getTagsAsync(): Promise<SDBJournalTag[]> {
    return this.#journalsRepository.getJournalTagsAsync();
  }

  createTagAsync(name: string, color: string | null = null): Promise<number> {
    return this.#journalsRepository.addJournalTagAsync(name, color);
  }

  updateTagAsync(tag: SDBJournalTag): Promise<void> {
    return this.#journalsRepository.updateJournalTagAsync(tag);
  }

  deleteTagAsync(tagId: number): Promise<void> {
    return this.#journalsRepository.deleteJournalTagAsync(tagId);
  }
}
