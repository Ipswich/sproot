import { SDBJournalTag } from "@sproot/common/database/SDBJournalTag";
import { IJournalTagsRepository } from "../../database/repositories/journals/tags/IJournalTagsRepository";

export default class JournalTagManager {
  #journalsRepository: IJournalTagsRepository;
  constructor(journalsRepository: IJournalTagsRepository) {
    this.#journalsRepository = journalsRepository;
  }

  getTagsAsync(): Promise<SDBJournalTag[]> {
    return this.#journalsRepository.getTagsAsync();
  }

  createTagAsync(name: string, color: string | null = null): Promise<number> {
    return this.#journalsRepository.addTagAsync(name, color);
  }

  updateTagAsync(tag: SDBJournalTag): Promise<void> {
    return this.#journalsRepository.updateTagAsync(tag);
  }

  deleteTagAsync(tagId: number): Promise<void> {
    return this.#journalsRepository.deleteTagAsync(tagId);
  }
}
